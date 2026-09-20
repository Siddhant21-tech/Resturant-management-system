"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRouter = void 0;
const express_1 = require("express");
const db_1 = require("../db");
exports.auditRouter = (0, express_1.Router)();
// Get recent audit logs for a restaurant / branch
exports.auditRouter.get('/audit-logs', async (req, res) => {
    try {
        const { branchId, limit = '50' } = req.query;
        const whereClause = {};
        if (branchId) {
            whereClause.branchId = String(branchId);
        }
        const logs = await db_1.prisma.auditLog.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
            take: parseInt(String(limit), 10),
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Analytics overview
exports.auditRouter.get('/analytics/overview', async (req, res) => {
    try {
        const { branchId } = req.query;
        const branchFilter = branchId ? { branchId: String(branchId) } : {};
        const [totalSessions, completedSessions, paidBills, recentPayments] = await Promise.all([
            db_1.prisma.diningSession.count({ where: branchFilter }),
            db_1.prisma.diningSession.count({ where: { ...branchFilter, status: 'COMPLETED' } }),
            db_1.prisma.bill.findMany({
                where: {
                    status: 'PAID',
                    session: branchFilter,
                },
                include: { payments: true },
            }),
            db_1.prisma.payment.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: { bill: { include: { session: { include: { table: true } } } } },
            }),
        ]);
        const totalRevenue = paidBills.reduce((acc, b) => acc + b.finalAmount, 0);
        res.json({
            totalSessions,
            completedSessions,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            billsPaidCount: paidBills.length,
            recentPayments,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
