"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canModifyItem = exports.orderRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
const socket_1 = require("../socket");
exports.orderRouter = (0, express_1.Router)();
// 3-Minute Rule Helper:
// Checks whether an order item can be modified or cancelled
const canModifyItem = (item) => {
    const LOCKED_STATUSES = ['PREPARING', 'READY', 'SERVED', 'CANCELLED'];
    if (LOCKED_STATUSES.includes(item.status)) {
        return {
            allowed: false,
            reason: `Order item is already '${item.status}' and can no longer be modified.`,
        };
    }
    // If item hasn't been accepted yet (still PENDING or SUBMITTED), waiter can modify freely
    if (!item.acceptedAt) {
        return { allowed: true, secondsRemaining: 180 };
    }
    const now = new Date().getTime();
    const acceptedTime = new Date(item.acceptedAt).getTime();
    const elapsedSeconds = Math.floor((now - acceptedTime) / 1000);
    const THREE_MINUTES = 3 * 60; // 180 seconds
    if (elapsedSeconds >= THREE_MINUTES) {
        return {
            allowed: false,
            reason: `Modification locked: It has been accepted by the kitchen for ${elapsedSeconds} seconds (> 3 minutes).`,
            secondsRemaining: 0,
        };
    }
    return {
        allowed: true,
        secondsRemaining: THREE_MINUTES - elapsedSeconds,
    };
};
exports.canModifyItem = canModifyItem;
// Create a new Order Round in an active session
// source can be 'WAITER', 'CUSTOMER_QR', or 'POS'
exports.orderRouter.post('/orders', async (req, res) => {
    try {
        const { sessionId, source = 'WAITER', notes, items } = req.body;
        if (!sessionId || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Session ID and items list are required' });
        }
        const session = await db_1.prisma.diningSession.findUnique({
            where: { id: sessionId },
            include: {
                table: true,
                orders: true,
                branch: true,
            },
        });
        if (!session) {
            return res.status(404).json({ error: 'Active dining session not found' });
        }
        const nextRoundNumber = session.orders.length + 1;
        // Retrieve menuItem details for prices and stations
        const menuItemIds = items.map((i) => i.menuItemId);
        const menuItems = await db_1.prisma.menuItem.findMany({
            where: { id: { in: menuItemIds } },
            include: { station: true },
        });
        const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));
        // Construct order items with station routing
        const orderItemsData = items.map((i) => {
            const menu = menuItemMap.get(i.menuItemId);
            if (!menu) {
                throw new Error(`Menu item not found: ${i.menuItemId}`);
            }
            return {
                menuItemId: menu.id,
                stationId: menu.stationId,
                quantity: i.quantity || 1,
                unitPrice: menu.price,
                notes: i.notes || null,
                status: 'PENDING',
            };
        });
        const newRound = await db_1.prisma.orderRound.create({
            data: {
                sessionId,
                roundNumber: nextRoundNumber,
                source,
                status: 'SUBMITTED',
                notes,
                items: {
                    create: orderItemsData,
                },
            },
            include: {
                items: {
                    include: {
                        menuItem: true,
                        station: true,
                    },
                },
            },
        });
        // Real-time notification:
        // 1. Notify the entire branch (waiters, cashier)
        (0, socket_1.emitToBranch)(session.branchId, 'order:created', {
            branchId: session.branchId,
            tableId: session.tableId,
            tableNumber: session.table.number,
            sessionId: session.id,
            sessionCode: session.sessionCode,
            round: newRound,
        });
        // 2. Notify specific kitchen stations for routed items
        for (const item of newRound.items) {
            if (item.stationId) {
                (0, socket_1.emitToStation)(item.stationId, 'station:new_item', {
                    tableNumber: session.table.number,
                    sessionCode: session.sessionCode,
                    roundNumber: newRound.roundNumber,
                    item,
                });
            }
        }
        // 3. Notify table room (customer QR view)
        (0, socket_1.emitToTable)(session.tableId, 'order:submitted', { round: newRound });
        res.status(201).json(newRound);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get all orders for kitchen display (filterable by stationId and status)
exports.orderRouter.get('/orders/kitchen', async (req, res) => {
    try {
        const { branchId, stationId, activeOnly = 'true' } = req.query;
        const whereClause = {};
        if (branchId) {
            whereClause.round = { session: { branchId: String(branchId) } };
        }
        if (stationId && stationId !== 'all') {
            whereClause.stationId = String(stationId);
        }
        if (activeOnly === 'true') {
            whereClause.status = { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'] };
        }
        const items = await db_1.prisma.orderItem.findMany({
            where: whereClause,
            include: {
                menuItem: true,
                station: true,
                round: {
                    include: {
                        session: {
                            include: { table: true, waiter: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        // Decorate each item with remaining modification window info
        const decoratedItems = items.map((item) => ({
            ...item,
            modificationWindow: (0, exports.canModifyItem)(item),
        }));
        res.json(decoratedItems);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Modify an order item - ENFORCES 3-MINUTE RULE
exports.orderRouter.put('/orders/items/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { quantity, notes } = req.body;
        const item = await db_1.prisma.orderItem.findUnique({
            where: { id: itemId },
            include: {
                round: {
                    include: { session: { include: { table: true } } },
                },
            },
        });
        if (!item) {
            return res.status(404).json({ error: 'Order item not found' });
        }
        // Enforce 3-minute modification rule
        const check = (0, exports.canModifyItem)(item);
        if (!check.allowed) {
            return res.status(403).json({
                error: 'Order locked from modification',
                reason: check.reason,
            });
        }
        const updated = await db_1.prisma.orderItem.update({
            where: { id: itemId },
            data: {
                quantity: quantity !== undefined ? quantity : item.quantity,
                notes: notes !== undefined ? notes : item.notes,
            },
            include: { menuItem: true, station: true },
        });
        // Broadcast change
        (0, socket_1.emitToBranch)(item.round.session.branchId, 'item:modified', {
            itemId,
            updated,
            tableNumber: item.round.session.table.number,
        });
        res.json({
            message: 'Item modified successfully',
            item: updated,
            secondsRemaining: check.secondsRemaining,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Cancel an order item - ENFORCES 3-MINUTE RULE
exports.orderRouter.delete('/orders/items/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { reason = 'Cancelled by waiter' } = req.body;
        const item = await db_1.prisma.orderItem.findUnique({
            where: { id: itemId },
            include: {
                round: {
                    include: { session: { include: { table: true } } },
                },
            },
        });
        if (!item) {
            return res.status(404).json({ error: 'Order item not found' });
        }
        // Enforce 3-minute modification rule
        const check = (0, exports.canModifyItem)(item);
        if (!check.allowed) {
            return res.status(403).json({
                error: 'Cannot cancel item',
                reason: check.reason,
            });
        }
        const updated = await db_1.prisma.orderItem.update({
            where: { id: itemId },
            data: {
                status: 'CANCELLED',
                notes: item.notes ? `${item.notes} | CANCELLED: ${reason}` : `CANCELLED: ${reason}`,
            },
            include: { menuItem: true, station: true },
        });
        (0, socket_1.emitToBranch)(item.round.session.branchId, 'item:cancelled', {
            itemId,
            tableNumber: item.round.session.table.number,
            reason,
        });
        res.json({ message: 'Item cancelled successfully', item: updated });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update Kitchen Item Status (ACCEPTED -> PREPARING -> READY -> SERVED)
exports.orderRouter.patch('/orders/items/:itemId/status', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { status } = req.body; // 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED'
        const validStatuses = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status: ${status}` });
        }
        const currentItem = await db_1.prisma.orderItem.findUnique({
            where: { id: itemId },
            include: {
                round: {
                    include: { session: { include: { table: true } } },
                },
                menuItem: true,
                station: true,
            },
        });
        if (!currentItem) {
            return res.status(404).json({ error: 'Item not found' });
        }
        const updateData = { status };
        // When accepted, set acceptedAt to mark beginning of 3-minute modification countdown
        if (status === 'ACCEPTED' && !currentItem.acceptedAt) {
            updateData.acceptedAt = new Date();
        }
        if (status === 'READY') {
            updateData.preparedAt = new Date();
        }
        const updatedItem = await db_1.prisma.orderItem.update({
            where: { id: itemId },
            data: updateData,
            include: { menuItem: true, station: true },
        });
        const branchId = currentItem.round.session.branchId;
        const tableNumber = currentItem.round.session.table.number;
        // Real-time broadcast to Waiter Tablet and Cashier
        (0, socket_1.emitToBranch)(branchId, 'item:status_changed', {
            itemId: updatedItem.id,
            roundId: currentItem.roundId,
            status: updatedItem.status,
            itemName: currentItem.menuItem.name,
            tableNumber,
            acceptedAt: updatedItem.acceptedAt,
            preparedAt: updatedItem.preparedAt,
        });
        // If READY, alert waiter tablet specifically
        if (status === 'READY') {
            (0, socket_1.emitToBranch)(branchId, 'waiter:item_ready', {
                tableNumber,
                itemName: currentItem.menuItem.name,
                quantity: currentItem.quantity,
            });
        }
        res.json(updatedItem);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
