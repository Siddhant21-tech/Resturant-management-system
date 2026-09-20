import { Router } from 'express';
import { prisma } from '../db';
import { emitToBranch, emitToStation, emitToTable } from '../socket';

export const orderRouter = Router();

// 3-Minute Rule Helper:
// Checks whether an order item can be modified or cancelled
export const canModifyItem = (item: {
  status: string;
  acceptedAt: Date | null;
  createdAt: Date;
}): { allowed: boolean; reason?: string; secondsRemaining?: number } => {
  const LOCKED_STATUSES = ['READY', 'SERVED', 'CANCELLED'];
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

  return { allowed: true };
};

// Create a new Order Round in an active session
// source can be 'WAITER', 'CUSTOMER_QR', or 'POS'
orderRouter.post('/orders', async (req, res) => {
  try {
    const { sessionId, source = 'WAITER', notes, items } = req.body;

    if (!sessionId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Session ID and items list are required' });
    }

    const session = await prisma.diningSession.findUnique({
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
    const menuItemIds = items.map((i: any) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
      include: { station: true },
    });

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Construct order items with station routing
    const orderItemsData = items.map((i: any) => {
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

    const newRound = await prisma.orderRound.create({
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
    emitToBranch(session.branchId, 'order:created', {
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
        emitToStation(item.stationId, 'station:new_item', {
          tableNumber: session.table.number,
          sessionCode: session.sessionCode,
          roundNumber: newRound.roundNumber,
          item,
        });
      }
    }

    // 3. Notify table room (customer QR view)
    emitToTable(session.tableId, 'order:submitted', { round: newRound });

    res.status(201).json(newRound);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all orders for kitchen display (filterable by stationId and status)
orderRouter.get('/orders/kitchen', async (req, res) => {
  try {
    const { branchId, stationId, activeOnly = 'true' } = req.query;

    const whereClause: any = {};
    if (branchId) {
      whereClause.round = { session: { branchId: String(branchId) } };
    }
    if (stationId && stationId !== 'all') {
      whereClause.stationId = String(stationId);
    }
    if (activeOnly === 'true') {
      whereClause.status = { in: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY'] };
    }

    const items = await prisma.orderItem.findMany({
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
      modificationWindow: canModifyItem(item),
    }));

    res.json(decoratedItems);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Modify an order item - ENFORCES 3-MINUTE RULE
orderRouter.put('/orders/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity, notes } = req.body;

    const item = await prisma.orderItem.findUnique({
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
    const check = canModifyItem(item);
    if (!check.allowed) {
      return res.status(403).json({
        error: 'Order locked from modification',
        reason: check.reason,
      });
    }

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        quantity: quantity !== undefined ? quantity : item.quantity,
        notes: notes !== undefined ? notes : item.notes,
      },
      include: { menuItem: true, station: true },
    });

    // Broadcast change
    emitToBranch(item.round.session.branchId, 'item:modified', {
      itemId,
      updated,
      tableNumber: item.round.session.table.number,
    });

    res.json({
      message: 'Item modified successfully',
      item: updated,
      secondsRemaining: check.secondsRemaining,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel an order item - ENFORCES 3-MINUTE RULE
orderRouter.delete('/orders/items/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { reason = 'Cancelled by waiter' } = req.body;

    const item = await prisma.orderItem.findUnique({
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
    const check = canModifyItem(item);
    if (!check.allowed) {
      return res.status(403).json({
        error: 'Cannot cancel item',
        reason: check.reason,
      });
    }

    const updated = await prisma.orderItem.update({
      where: { id: itemId },
      data: {
        status: 'CANCELLED',
        notes: item.notes ? `${item.notes} | CANCELLED: ${reason}` : `CANCELLED: ${reason}`,
      },
      include: { menuItem: true, station: true },
    });

    emitToBranch(item.round.session.branchId, 'item:cancelled', {
      itemId,
      tableNumber: item.round.session.table.number,
      reason,
    });

    res.json({ message: 'Item cancelled successfully', item: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update Kitchen Item Status (ACCEPTED -> PREPARING -> READY -> SERVED)
orderRouter.patch('/orders/items/:itemId/status', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status } = req.body; // 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED'

    const validStatuses = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}` });
    }

    const currentItem = await prisma.orderItem.findUnique({
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

    const updateData: any = { status };

    // When accepted, set acceptedAt to mark beginning of 3-minute modification countdown
    if (status === 'ACCEPTED' && !currentItem.acceptedAt) {
      updateData.acceptedAt = new Date();
    }
    if (status === 'READY') {
      updateData.preparedAt = new Date();
    }

    const updatedItem = await prisma.orderItem.update({
      where: { id: itemId },
      data: updateData,
      include: { menuItem: true, station: true },
    });

    const branchId = currentItem.round.session.branchId;
    const tableNumber = currentItem.round.session.table.number;

    // Real-time broadcast to Waiter Tablet and Cashier
    emitToBranch(branchId, 'item:status_changed', {
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
      emitToBranch(branchId, 'waiter:item_ready', {
        tableNumber,
        itemName: currentItem.menuItem.name,
        quantity: currentItem.quantity,
      });
    }

    res.json(updatedItem);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
