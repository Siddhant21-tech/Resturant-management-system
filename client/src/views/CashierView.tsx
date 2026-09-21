import React, { useState, useEffect } from 'react';
import { ShieldCheck, Receipt } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Table, Bill, DiningSession } from '../types';
import { fetchTables, fetchBillForSession, adjustBill, payBill } from '../services/api';
import { playNotificationSound, getSocket } from '../services/socket';

import { CashierSessionList } from '../components/cashier/CashierSessionList';
import { CashierBillDetails } from '../components/cashier/CashierBillDetails';
import { CashierAdjustModal } from '../components/cashier/CashierAdjustModal';
import { CashierPaymentModal } from '../components/cashier/CashierPaymentModal';
import { CashierThermalReceiptModal } from '../components/cashier/CashierThermalReceiptModal';

interface CashierViewProps {
  branchId: string;
  onRefreshTrigger?: () => void;
}

export const CashierView: React.FC<CashierViewProps> = ({ branchId, onRefreshTrigger }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [billData, setBillData] = useState<{
    session: DiningSession;
    latestBill: Bill;
    history: Bill[];
  } | null>(null);
  const [, setLoading] = useState(false);

  // Bill Modification Dialog
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustReason, setAdjustReason] = useState('');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [adjustType, setAdjustType] = useState('DISCOUNT');

  // Payment Settlement Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('UPI');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Print Receipt View Modal
  const [showPrintModal, setShowPrintModal] = useState(false);

  const loadData = async () => {
    try {
      const tableList = await fetchTables(branchId);
      setTables(tableList);

      // Default select Table with BILL_REQUESTED or active session
      const billReq = tableList.find((t: Table) => t.status === 'BILL_REQUESTED');
      const occupied = tableList.find((t: Table) => t.currentSessionId);
      const target = billReq || occupied;

      if (
        target &&
        target.currentSessionId &&
        (!selectedSessionId || selectedSessionId === target.currentSessionId)
      ) {
        setSelectedSessionId(target.currentSessionId);
      }
    } catch (err) {
      console.error('Error loading cashier tables:', err);
    }
  };

  useEffect(() => {
    loadData();
    const socket = getSocket();
    const handleUpdate = () => {
      loadData();
      if (selectedSessionId) {
        fetchBillForSession(selectedSessionId).then((data) => setBillData(data)).catch(() => {});
      }
    };
    socket.on('payment:completed', handleUpdate);
    socket.on('bill:updated', handleUpdate);
    socket.on('order:created', handleUpdate);
    socket.on('session:updated', handleUpdate);
    return () => {
      socket.off('payment:completed', handleUpdate);
      socket.off('bill:updated', handleUpdate);
      socket.off('order:created', handleUpdate);
      socket.off('session:updated', handleUpdate);
    };
  }, [branchId, onRefreshTrigger, selectedSessionId]);

  useEffect(() => {
    if (!selectedSessionId) {
      setBillData(null);
      return;
    }
    const fetchBill = async () => {
      try {
        setLoading(true);
        const data = await fetchBillForSession(selectedSessionId);
        setBillData(data);
      } catch (err) {
        console.error('Error fetching bill:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBill();
  }, [selectedSessionId, onRefreshTrigger]);

  // Handle Bill Adjustment / Modification
  const handleSaveAdjustment = async () => {
    if (!billData || !adjustReason) {
      alert('A mandatory reason is required for bill adjustments.');
      return;
    }

    try {
      await adjustBill(billData.latestBill.id, {
        type: adjustType,
        reason: adjustReason,
        discountPercent: Number(discountAmount),
        discountAmount: Math.round((billData.latestBill.subtotal * (Number(discountAmount) / 100)) * 100) / 100,
        userId: 'Cashier Priya',
      });

      setShowAdjustModal(false);
      setAdjustReason('');
      setDiscountAmount(0);

      // Refresh bill data
      const updated = await fetchBillForSession(billData.session.id);
      setBillData(updated);
      alert('New Bill Version created with audit trail entry.');
    } catch (err: any) {
      alert(err.message || 'Failed to adjust bill');
    }
  };

  // Settle Payment
  const handleSettlePayment = async () => {
    if (!billData) return;
    try {
      setPaymentProcessing(true);
      await payBill(billData.latestBill.id, {
        method: paymentMethod,
        receivedByUserId: 'Cashier Priya',
      });

      playNotificationSound('payment_success');
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setShowPaymentModal(false);
      await loadData();
      // Reload current bill to reflect PAID status
      const updated = await fetchBillForSession(billData.session.id);
      setBillData(updated);
    } catch (err: any) {
      alert(err.message || 'Payment processing failed');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const bill = billData?.latestBill;
  const session = billData?.session;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Cashier Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>💳 Cashier POS & Invoice Terminal</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-medium">
                Versioned Auditing
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Permanent invoice records, bill adjustment versioning (v1 → v2), and multi-payment settlement.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Operator: Priya Verma (Cashier)</span>
        </div>
      </div>

      {/* Grid: Active Tables Queue & Bill Review */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 cols: Bill Requests Queue */}
        <div className="lg:col-span-4 space-y-4">
          <CashierSessionList
            tables={tables}
            selectedSessionId={selectedSessionId}
            onSelectSession={setSelectedSessionId}
          />
        </div>

        {/* Right 8 cols: Detailed Bill View, Versioning, and Actions */}
        <div className="lg:col-span-8 space-y-4">
          {bill && session ? (
            <CashierBillDetails
              bill={bill}
              session={session}
              history={billData.history}
              onOpenAdjustModal={() => setShowAdjustModal(true)}
              onOpenPrintModal={() => setShowPrintModal(true)}
              onOpenPaymentModal={() => setShowPaymentModal(true)}
            />
          ) : (
            <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800">
              <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">Select an Active Table</h3>
              <p className="text-xs text-slate-400 mt-1">
                Choose a dining session on the left to review bill items, apply authorized adjustments, and settle payments.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bill Modification Modal */}
      {bill && (
        <CashierAdjustModal
          isOpen={showAdjustModal}
          bill={bill}
          adjustType={adjustType}
          onAdjustTypeChange={setAdjustType}
          discountAmount={discountAmount}
          onDiscountAmountChange={setDiscountAmount}
          adjustReason={adjustReason}
          onAdjustReasonChange={setAdjustReason}
          onClose={() => setShowAdjustModal(false)}
          onSave={handleSaveAdjustment}
        />
      )}

      {/* Payment Settlement Modal */}
      {bill && (
        <CashierPaymentModal
          isOpen={showPaymentModal}
          bill={bill}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          cashTendered={cashTendered}
          onCashTenderedChange={setCashTendered}
          paymentProcessing={paymentProcessing}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={handleSettlePayment}
        />
      )}

      {/* Printable Thermal Tax Invoice Modal */}
      {bill && session && (
        <CashierThermalReceiptModal
          isOpen={showPrintModal}
          bill={bill}
          session={session}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
};
