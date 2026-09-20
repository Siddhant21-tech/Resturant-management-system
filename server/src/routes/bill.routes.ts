import { Router } from 'express';
import { prisma } from '../db';
import { emitToBranch, emitToTable } from '../socket';

export const billRouter = Router();

// Get or calculate live bill for an active session
billRouter.get('/bills/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await prisma.diningSession.findUnique({
      where: { id: sessionId },
      include: {
        table: true,
        waiter: true,
        branch: { include: { restaurant: true } },
        orders: {
          include: {
            items: {
              where: { status: { not: 'CANCELLED' } },
              include: { menuItem: true },
            },
          },
        },
        bills: {
          orderBy: { version: 'desc' },
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

    // Recalculate every non-cancelled round so later orders are included automatically.
    let subtotal = 0;
    const billItemsByMenuItem = new Map<string, any>();

    for (const round of session.orders) {
      for (const item of round.items) {
        const itemTotal = item.quantity * item.unitPrice;
        subtotal += itemTotal;
        const existing = billItemsByMenuItem.get(item.menuItemId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.totalPrice += itemTotal;
        } else {
          billItemsByMenuItem.set(item.menuItemId, {
            menuItemId: item.menuItemId,
            name: item.menuItem.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: itemTotal,
          });
        }
      }
    }

    const billItems = Array.from(billItemsByMenuItem.values());

    const taxRate = session.branch.restaurant.taxRate || 5.0; // 5% default
    const taxAmount = Math.round((subtotal * (taxRate / 100)) * 100) / 100;
    const discountAmount = 0;
    const finalAmount = Math.round((subtotal + taxAmount - discountAmount) * 100) / 100;

    const latestBill = session.bills[0];
    if (latestBill) {
      if (latestBill.status === 'PAID') {
        return res.json({ session, latestBill, history: session.bills });
      }

      const matchesLatest =
        latestBill.subtotal === subtotal &&
        latestBill.taxAmount === taxAmount &&
        latestBill.finalAmount === finalAmount &&
        latestBill.items.length === billItems.length &&
        billItems.every((item) => {
          const existing = latestBill.items.find((line) => line.menuItemId === item.menuItemId);
          return existing && existing.quantity === item.quantity && existing.totalPrice === item.totalPrice;
        });

      if (matchesLatest) {
        return res.json({ session, latestBill, history: session.bills });
      }

      const refreshedBill = await prisma.bill.create({
        data: {
          sessionId: session.id,
          version: latestBill.version + 1,
          invoiceNumber: latestBill.invoiceNumber,
          subtotal,
          taxAmount,
          discountAmount,
          finalAmount,
          status: 'UNPAID',
          items: { create: billItems },
        },
        include: { items: true, adjustments: true, payments: true },
      });

      return res.json({
        session,
        latestBill: refreshedBill,
        history: [refreshedBill, ...session.bills],
      });
    }

    // Generate random Invoice code
    const invoiceNumber = `INV-${Math.floor(100000 + Math.random() * 900000)}`;

    // Create Draft Bill Version 1
    const draftBill = await prisma.bill.create({
      data: {
        sessionId: session.id,
        version: 1,
        invoiceNumber,
        subtotal,
        taxAmount,
        discountAmount,
        finalAmount,
        status: 'UNPAID',
        items: {
          create: billItems,
        },
      },
      include: {
        items: true,
        adjustments: true,
        payments: true,
      },
    });

    res.json({ session, latestBill: draftBill, history: [draftBill] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Modify or adjust a bill (e.g. Cashier Rahul gives discount or corrects item count)
// Creates a new immutable Bill version and logs an audit record
billRouter.post('/bills/:billId/adjust', async (req, res) => {
  try {
    const { billId } = req.params;
    const { type, reason, discountAmount = 0, taxRate, modifiedItems, userId = 'Cashier Staff' } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'A mandatory reason is required for bill adjustments.' });
    }

    const currentBill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        items: true,
        session: {
          include: {
            table: true,
            branch: { include: { restaurant: true } },
          },
        },
      },
    });

    if (!currentBill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (currentBill.status === 'PAID') {
      return res.status(400).json({ error: 'Cannot modify a finalized/paid bill.' });
    }

    const nextVersion = currentBill.version + 1;
    let newSubtotal = currentBill.subtotal;
    let newItems = currentBill.items.map((i) => ({
      menuItemId: i.menuItemId,
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
    }));

    // If items were modified
    if (modifiedItems && Array.isArray(modifiedItems)) {
      newSubtotal = 0;
      newItems = modifiedItems.map((m: any) => {
        const itemTotal = m.quantity * m.unitPrice;
        newSubtotal += itemTotal;
        return {
          menuItemId: m.menuItemId,
          name: m.name,
          quantity: m.quantity,
          unitPrice: m.unitPrice,
          totalPrice: itemTotal,
        };
      });
    }

    const newTaxRate = taxRate === undefined
      ? currentBill.session.branch.restaurant.taxRate || 5.0
      : Math.max(0, Number(taxRate));
    const newTax = Math.round((newSubtotal * (newTaxRate / 100)) * 100) / 100;
    const newDiscount = Number(discountAmount);
    const newFinal = Math.max(0, Math.round((newSubtotal + newTax - newDiscount) * 100) / 100);

    // Create New Bill Version (Immutable History)
    const newBill = await prisma.bill.create({
      data: {
        sessionId: currentBill.sessionId,
        version: nextVersion,
        invoiceNumber: currentBill.invoiceNumber,
        subtotal: newSubtotal,
        taxAmount: newTax,
        discountAmount: newDiscount,
        finalAmount: newFinal,
        status: 'UNPAID',
        items: {
          create: newItems,
        },
        adjustments: {
          create: {
            type: type || 'DISCOUNT',
            userId,
            reason,
            oldValue: `₹${currentBill.finalAmount} (v${currentBill.version})`,
            newValue: `₹${newFinal} (v${nextVersion}, GST ${newTaxRate}%)`,
          },
        },
      },
      include: {
        items: true,
        adjustments: true,
        payments: true,
      },
    });

    // Also write into Restaurant Audit Log
    await prisma.auditLog.create({
      data: {
        restaurantId: currentBill.session.branch.restaurantId,
        branchId: currentBill.session.branchId,
        userId: userId,
        action: `BILL_ADJUSTED_V${nextVersion}`,
        detailsJson: JSON.stringify({
          invoiceNumber: currentBill.invoiceNumber,
          oldAmount: currentBill.finalAmount,
          newAmount: newFinal,
          reason,
          type,
        }),
      },
    });

    emitToBranch(currentBill.session.branchId, 'bill:updated', {
      tableNumber: currentBill.session.table.number,
      bill: newBill,
    });

    res.status(201).json(newBill);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Settle / Pay Bill (Cash, UPI, Card)
// Marks Bill as PAID, Closes Dining Session, Resets Table to AVAILABLE
billRouter.post('/bills/:billId/pay', async (req, res) => {
  try {
    const { billId } = req.params;
    const { method = 'UPI', referenceNumber = '', receivedByUserId = 'Cashier' } = req.body;

    const bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        session: {
          include: { table: true, branch: { include: { restaurant: true } } },
        },
      },
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (bill.status === 'PAID') {
      return res.status(400).json({ error: 'Bill is already paid' });
    }

    // 1. Create Payment Record
    const payment = await prisma.payment.create({
      data: {
        billId: bill.id,
        amount: bill.finalAmount,
        method,
        referenceNumber: referenceNumber || `${method.toUpperCase()}-${Date.now().toString().slice(-6)}`,
        receivedByUserId,
        status: 'SUCCESS',
      },
    });

    // 2. Mark Bill as PAID
    const updatedBill = await prisma.bill.update({
      where: { id: bill.id },
      data: { status: 'PAID' },
      include: { items: true, payments: true, adjustments: true },
    });

    // 3. Mark Dining Session as COMPLETED
    await prisma.diningSession.update({
      where: { id: bill.sessionId },
      data: {
        status: 'COMPLETED',
        closedAt: new Date(),
      },
    });

    // 4. Liberate Table back to AVAILABLE
    await prisma.table.update({
      where: { id: bill.session.tableId },
      data: {
        status: 'AVAILABLE',
        currentSessionId: null,
      },
    });

    // 5. Create Audit Record
    await prisma.auditLog.create({
      data: {
        restaurantId: bill.session.branch.restaurantId,
        branchId: bill.session.branchId,
        userId: receivedByUserId,
        action: 'PAYMENT_RECEIVED',
        detailsJson: JSON.stringify({
          invoiceNumber: bill.invoiceNumber,
          amount: bill.finalAmount,
          method,
          table: bill.session.table.number,
        }),
      },
    });

    // 6. Broadcast Real-Time Events across Floor, Cashier, and Table
    const branchId = bill.session.branchId;
    const tableId = bill.session.tableId;

    emitToBranch(branchId, 'payment:completed', {
      tableId,
      tableNumber: bill.session.table.number,
      invoiceNumber: bill.invoiceNumber,
      amount: bill.finalAmount,
      method,
      bill: updatedBill,
    });

    emitToBranch(branchId, 'table:updated', {
      tableId,
      status: 'AVAILABLE',
    });

    emitToTable(tableId, 'payment:success', {
      invoiceNumber: bill.invoiceNumber,
      amount: bill.finalAmount,
    });

    res.json({
      message: 'Payment recorded successfully. Table is now available.',
      bill: updatedBill,
      payment,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
