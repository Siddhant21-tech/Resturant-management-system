"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.restaurantRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
exports.restaurantRouter = (0, express_1.Router)();
// Get all restaurants (multi-tenancy)
exports.restaurantRouter.get('/restaurants', async (req, res) => {
    try {
        const restaurants = await db_1.prisma.restaurant.findMany({
            include: {
                branches: {
                    include: {
                        kitchenStations: true,
                    },
                },
            },
        });
        res.json(restaurants);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get branches for a restaurant
exports.restaurantRouter.get('/restaurants/:restaurantId/branches', async (req, res) => {
    try {
        const branches = await db_1.prisma.branch.findMany({
            where: { restaurantId: req.params.restaurantId },
            include: {
                kitchenStations: true,
                tables: true,
            },
        });
        res.json(branches);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get all tables for a branch (with live session status)
exports.restaurantRouter.get('/branches/:branchId/tables', async (req, res) => {
    try {
        const tables = await db_1.prisma.table.findMany({
            where: { branchId: req.params.branchId },
            orderBy: { number: 'asc' },
        });
        // Fetch active session info for occupied tables
        const populatedTables = await Promise.all(tables.map(async (table) => {
            let activeSession = null;
            if (table.currentSessionId) {
                activeSession = await db_1.prisma.diningSession.findUnique({
                    where: { id: table.currentSessionId },
                    include: {
                        waiter: true,
                        orders: {
                            include: {
                                items: {
                                    include: { menuItem: true, station: true },
                                },
                            },
                        },
                    },
                });
            }
            return {
                ...table,
                activeSession,
            };
        }));
        res.json(populatedTables);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get kitchen stations for a branch
exports.restaurantRouter.get('/branches/:branchId/stations', async (req, res) => {
    try {
        const stations = await db_1.prisma.kitchenStation.findMany({
            where: { branchId: req.params.branchId },
            orderBy: { sortOrder: 'asc' },
        });
        res.json(stations);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Get staff users for a restaurant/branch
exports.restaurantRouter.get('/branches/:branchId/users', async (req, res) => {
    try {
        const users = await db_1.prisma.user.findMany({
            where: { branchId: req.params.branchId },
        });
        res.json(users);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
