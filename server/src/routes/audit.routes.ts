import { Router } from 'express';
import { prisma } from '../db';

export const auditRouter = Router();

// Get recent audit logs for a restaurant / branch
auditRouter.get('/audit-logs', async (req, res) => {
  try {
    const { branchId, limit = '50' } = req.query;

    const whereClause: any = {};
    if (branchId) {
      whereClause.branchId = String(branchId);
    }

    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: parseInt(String(limit), 10),
    });

    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Analytics overview
auditRouter.get('/analytics/overview', async (req, res) => {
  try {
    const { branchId } = req.query;
    const branchFilter = branchId ? { branchId: String(branchId) } : {};

    const [totalSessions, completedSessions, paidBills, recentPayments] = await Promise.all([
      prisma.diningSession.count({ where: branchFilter }),
      prisma.diningSession.count({ where: { ...branchFilter, status: 'COMPLETED' } }),
      prisma.bill.findMany({
        where: {
          status: 'PAID',
          session: branchFilter,
        },
        include: { payments: true },
      }),
      prisma.payment.findMany({
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
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
