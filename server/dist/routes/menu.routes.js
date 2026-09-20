"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.menuRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
exports.menuRouter = (0, express_1.Router)();
// Get full menu for a branch (grouped by category)
exports.menuRouter.get('/branches/:branchId/menu', async (req, res) => {
    try {
        const categories = await db_1.prisma.menuCategory.findMany({
            where: { branchId: req.params.branchId },
            orderBy: { sortOrder: 'asc' },
            include: {
                items: {
                    include: {
                        station: true,
                    },
                },
            },
        });
        res.json(categories);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Update item availability
exports.menuRouter.patch('/menu/items/:id/availability', async (req, res) => {
    try {
        const { isAvailable } = req.body;
        const item = await db_1.prisma.menuItem.update({
            where: { id: req.params.id },
            data: { isAvailable },
        });
        res.json(item);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.menuRouter.patch('/menu/items/:id', async (req, res) => {
    try {
        const { name, price, isAvailable } = req.body;
        const data = {};
        if (name !== undefined)
            data.name = String(name).trim();
        if (price !== undefined)
            data.price = Number(price);
        if (isAvailable !== undefined)
            data.isAvailable = Boolean(isAvailable);
        const item = await db_1.prisma.menuItem.update({ where: { id: req.params.id }, data });
        res.json(item);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
