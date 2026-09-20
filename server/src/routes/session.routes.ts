import { Router } from 'express';
import { prisma } from '../db';
import { emitToBranch, emitToTable } from '../socket';

export const sessionRouter = Router();

// Create / Open a dining session for a table
sessionRouter.post('/sessions', async (req, res) => {
  try {
    const { branchId, tableId, waiterId, guestCount } = req.body;

    // Check if table is already in an active session
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) {
      return res.status(404).json({ error: 'Table not found' });
    }

    if (table.status !== 'AVAILABLE' && table.currentSessionId) {
      // Return the current active session
      const existing = await prisma.diningSession.findUnique({
        where: { id: table.currentSessionId },
        include: {
          table: true,
          waiter: true,
          orders: {
            include: {
              items: {
                include: { menuItem: true, station: true },
              },
            },
          },
          bills: true,
        },
      });
      return res.json(existing);
    }

    // Generate random 5-digit session code e.g. S-10045
    const randomCode = `S-${Math.floor(10000 + Math.random() * 90000)}`;

    const session = await prisma.diningSession.create({
      data: {
        branchId,
        tableId,
        waiterId,
        sessionCode: randomCode,
        guestCount: guestCount || 2,
        status: 'ACTIVE',
      },
      include: {
        table: true,
        waiter: true,
        orders: true,
      },
    });

    // Update table status
    await prisma.table.update({
      where: { id: tableId },
      data: {
        status: 'OCCUPIED',
        currentSessionId: session.id,
      },
    });

    emitToBranch(branchId, 'table:updated', {
      tableId,
      status: 'OCCUPIED',
      session,
    });

    res.status(201).json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get session details with all order rounds and items
sessionRouter.get('/sessions/:id', async (req, res) => {
  try {
    const session = await prisma.diningSession.findUnique({
      where: { id: req.params.id },
      include: {
        table: true,
        waiter: true,
        orders: {
          orderBy: { roundNumber: 'asc' },
          include: {
            items: {
              include: {
                menuItem: true,
                station: true,
              },
            },
          },
        },
        bills: {
          include: {
            items: true,
            adjustments: true,
            payments: true,
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Request bill for session (triggered by waiter or customer QR)
sessionRouter.post('/sessions/:id/request-bill', async (req, res) => {
  try {
    const session = await prisma.diningSession.findUnique({
      where: { id: req.params.id },
      include: { table: true, orders: { include: { items: { include: { menuItem: true } } } } },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await prisma.diningSession.update({
      where: { id: session.id },
      data: { status: 'BILL_REQUESTED' },
    });

    await prisma.table.update({
      where: { id: session.tableId },
      data: { status: 'BILL_REQUESTED' },
    });

    // Notify Cashier & Floor
    emitToBranch(session.branchId, 'bill:requested', {
      sessionId: session.id,
      tableId: session.tableId,
      tableNumber: session.table.number,
      sessionCode: session.sessionCode,
    });

    emitToTable(session.tableId, 'table:status_changed', { status: 'BILL_REQUESTED' });

    res.json({ message: 'Bill requested successfully', sessionCode: session.sessionCode });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
