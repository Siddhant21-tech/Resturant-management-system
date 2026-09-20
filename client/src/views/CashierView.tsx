import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Receipt,
  QrCode,
  DollarSign,
  AlertCircle,
  FileText,
  Printer,
  History,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Table, Bill, DiningSession } from '../types';
import { fetchTables, fetchBillForSession, adjustBill, payBill } from '../services/api';
import { playNotificationSound } from '../services/socket';

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
  const [loading, setLoading] = useState(false);

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

      // Default select Table 15 or table with BILL_REQUESTED if present
      const billReq = tableList.find((t: Table) => t.status === 'BILL_REQUESTED');
      const occupied = tableList.find((t: Table) => t.currentSessionId);
      const target = billReq || occupied;

      if (target && target.currentSessionId && (!selectedSessionId || selectedSessionId === target.currentSessionId)) {
        setSelectedSessionId(target.currentSessionId);
      }
    } catch (err) {
      console.error('Error loading cashier tables:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [branchId, onRefreshTrigger]);

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
        discountAmount: Number(discountAmount),
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
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Active Table Sessions
            </h2>
            <span className="text-xs text-slate-500">
              {tables.filter((t) => t.currentSessionId).length} Active
            </span>
          </div>

          <div className="space-y-2">
            {tables
              .filter((t) => t.currentSessionId)
              .map((table) => {
                const isSelected = selectedSessionId === table.currentSessionId;
                const isBillReq = table.status === 'BILL_REQUESTED';

                return (
                  <button
                    key={table.id}
                    onClick={() => setSelectedSessionId(table.currentSessionId!)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-orange-500 bg-slate-900 ring-2 ring-orange-500/20'
                        : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-white">{table.number}</span>
                        {isBillReq && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                            BILL REQUESTED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        {table.activeSession?.sessionCode} • {table.zone}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-300">
                        {table.activeSession?.orders?.length || 0} Rounds
                      </span>
                    </div>
                  </button>
                );
              })}

            {tables.filter((t) => t.currentSessionId).length === 0 && (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
                No active dining sessions.
              </div>
            )}
          </div>
        </div>

        {/* Right 8 cols: Detailed Bill View, Versioning, and Actions */}
        <div className="lg:col-span-8 space-y-4">
          {bill && session ? (
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-6">
              {/* Top Meta Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white">{session.table?.number}</h2>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-orange-400 font-bold">
                      Session #{session.sessionCode}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                      Invoice #{bill.invoiceNumber}
                    </span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                      Version {bill.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Waiter: {session.waiter?.name || 'Rahul'} • Opened:{' '}
                    {new Date(session.startedAt).toLocaleTimeString()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                      bill.status === 'PAID'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                    }`}
                  >
                    {bill.status === 'PAID' ? '✓ PAID & CLOSED' : 'PAYMENT PENDING'}
                  </span>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Bill Line Items (Aggregated across rounds)
                </h3>

                <div className="bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80">
                  <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/50">
                    <span className="col-span-6">Item</span>
                    <span className="col-span-2 text-center">Qty</span>
                    <span className="col-span-2 text-right">Price</span>
                    <span className="col-span-2 text-right">Amount</span>
                  </div>

                  {bill.items?.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 px-4 py-3 text-xs text-slate-200 items-center"
                    >
                      <span className="col-span-6 font-semibold text-white">{item.name}</span>
                      <span className="col-span-2 text-center font-mono">{item.quantity}</span>
                      <span className="col-span-2 text-right font-mono text-slate-400">
                        ₹{item.unitPrice}
                      </span>
                      <span className="col-span-2 text-right font-mono font-bold text-white">
                        ₹{item.totalPrice}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Breakdown & Audit History */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Audit & Adjustments History */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <span>Bill Revision & Audit Trail</span>
                  </h3>

                  <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3 space-y-2 max-h-40 overflow-y-auto">
                    {billData.history.length === 1 && (
                      <div className="text-[11px] text-slate-500 italic">
                        Initial Version 1 generated from order items. No modifications yet.
                      </div>
                    )}

                    {billData.history.map((hist) => (
                      <div
                        key={hist.id}
                        className="text-xs p-2 rounded-lg bg-slate-900/80 border border-slate-800/60 space-y-1 font-mono"
                      >
                        <div className="flex items-center justify-between text-slate-400 text-[11px]">
                          <span className="font-bold text-purple-400">Version {hist.version}</span>
                          <span>{new Date(hist.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <div className="text-slate-300">Total: ₹{hist.finalAmount}</div>
                        {hist.adjustments?.map((adj) => (
                          <div
                            key={adj.id}
                            className="text-[11px] text-amber-400/90 pt-1 border-t border-slate-800/50"
                          >
                            Reason: “{adj.reason}” by {adj.userId} ({adj.oldValue} → {adj.newValue})
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtotal, Tax, Final Amount Box */}
                <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono">₹{bill.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST (5.0%)</span>
                    <span className="font-mono">₹{bill.taxAmount.toFixed(2)}</span>
                  </div>
                  {bill.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Discount Applied</span>
                      <span className="font-mono">-₹{bill.discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-800 flex justify-between text-base font-black text-white">
                    <span>Grand Total</span>
                    <span className="font-mono text-orange-400">₹{bill.finalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: [Edit Bill] [Print] [Payment] */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-800">
                {bill.status !== 'PAID' && (
                  <button
                    onClick={() => setShowAdjustModal(true)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
                  >
                    Edit Bill / Discount
                  </button>
                )}

                <button
                  onClick={() => setShowPrintModal(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Print Tax Invoice
                </button>

                {bill.status !== 'PAID' && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-white font-extrabold text-xs shadow-lg shadow-orange-500/20 flex items-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" />
                    Process Payment (₹{bill.finalAmount})
                  </button>
                )}
              </div>
            </div>
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

      {/* Bill Modification Modal (Enforces Audit Record + Reason) */}
      {showAdjustModal && bill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase font-bold">
                Cashier Authorized Modification
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                Adjust Bill (Will increment to Version {bill.version + 1})
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
                >
                  <option value="DISCOUNT">Manager Discount</option>
                  <option value="CUSTOMER_CORRECTION">Item Quantity Correction</option>
                  <option value="COURTESY">Special Courtesy Waiver</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  Discount Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max={bill.subtotal}
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1">
                  Mandatory Audit Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Customer correction / Manager approved 10% coupon..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none placeholder-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAdjustment}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20"
              >
                Save Version {bill.version + 1}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Settlement Modal (CASH, UPI, CARD) */}
      {showPaymentModal && bill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Settle Bill Payment</h3>
                <p className="text-xs text-slate-400 font-mono">Invoice #{bill.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Amount Due</span>
                <div className="font-mono text-lg font-black text-orange-400">
                  ₹{bill.finalAmount.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {(['UPI', 'CARD', 'CASH'] as const).map((method) => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 rounded-lg text-xs font-extrabold transition-all ${
                    paymentMethod === method
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            {/* UPI Dynamic QR View */}
            {paymentMethod === 'UPI' && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-3">
                <div className="w-36 h-36 bg-white p-2 mx-auto rounded-xl shadow-lg flex items-center justify-center">
                  {/* Generated QR visual */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=velvetbistro@icici%26am=${bill.finalAmount}%26cu=INR`}
                    alt="UPI Payment QR"
                    className="w-full h-full"
                  />
                </div>
                <div className="text-xs text-slate-400">
                  Scan with GPay, PhonePe, or Paytm <br />
                  <span className="font-mono text-slate-300">velvetbistro@icici</span>
                </div>
              </div>
            )}

            {/* Cash Tendered Input */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-2 text-xs">
                <label className="text-slate-400 font-semibold block">Cash Tendered (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 1200"
                  value={cashTendered || ''}
                  onChange={(e) => setCashTendered(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none text-base"
                />
                {cashTendered >= bill.finalAmount && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex justify-between font-mono font-bold">
                    <span>Change Due to Customer:</span>
                    <span>₹{(cashTendered - bill.finalAmount).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Card Machine Authorization */}
            {paymentMethod === 'CARD' && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
                <CreditCard className="w-8 h-8 text-blue-400 mx-auto" />
                <p className="text-xs text-slate-300 font-semibold">
                  Tap or Insert Card on POS Terminal
                </p>
                <p className="text-[11px] text-slate-500">Supports Visa, Mastercard, RuPay & Amex</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSettlePayment}
                disabled={paymentProcessing}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Payment & Liberate Table</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Thermal Tax Invoice Modal */}
      {showPrintModal && bill && session && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white text-slate-950 rounded-2xl p-6 max-w-sm w-full font-mono text-xs space-y-4 shadow-2xl">
            {/* Header */}
            <div className="text-center border-b pb-3 border-dashed border-slate-400 space-y-1">
              <h2 className="text-base font-black uppercase tracking-wider">The Velvet Bistro</h2>
              <p className="text-[10px] text-slate-600">Downtown Flagship • GSTIN: 07AAAAA0000A1Z5</p>
              <p className="text-[10px] text-slate-600">42 Promenade Avenue, Connaught Place</p>
              <div className="pt-2 text-[11px] font-bold">TAX INVOICE #{bill.invoiceNumber}</div>
            </div>

            {/* Meta */}
            <div className="flex justify-between text-[11px] border-b pb-2 border-dashed border-slate-400">
              <div>
                <div>{session.table?.number}</div>
                <div>Session: {session.sessionCode}</div>
              </div>
              <div className="text-right">
                <div>{new Date().toLocaleDateString()}</div>
                <div>{new Date().toLocaleTimeString()}</div>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-1 py-1 border-b border-dashed border-slate-400">
              {bill.items?.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>₹{item.totalPrice}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{bill.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (5.0%):</span>
                <span>₹{bill.taxAmount.toFixed(2)}</span>
              </div>
              {bill.discountAmount > 0 && (
                <div className="flex justify-between font-bold">
                  <span>Discount:</span>
                  <span>-₹{bill.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-800">
                <span>TOTAL:</span>
                <span>₹{bill.finalAmount.toFixed(2)}</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-slate-500 pt-3 border-t border-dashed border-slate-400">
              Thank you for dining with us! <br />
              Please visit again.
            </div>

            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <button
                onClick={() => setShowPrintModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 font-bold hover:bg-slate-300"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-black"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
