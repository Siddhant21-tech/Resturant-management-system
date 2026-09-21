import React, { useEffect, useMemo, useState } from 'react';
import { CreditCard, Edit3, History, Printer, Receipt, Save, X } from 'lucide-react';
import { adjustBill, fetchBillForSession, fetchTables, payBill } from '../services/api';
import { getSocket } from '../services/socket';
import { CashierThermalReceiptModal } from '../components/cashier/CashierThermalReceiptModal';

interface ManagerBillOperationsProps {
  branchId: string;
  onRefreshTrigger?: () => void;
}

type PaymentMethod = 'CASH' | 'UPI' | 'CARD';

export const ManagerBillOperations: React.FC<ManagerBillOperationsProps> = ({
  branchId,
  onRefreshTrigger,
}) => {
  const [entries, setEntries] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxRate, setTaxRate] = useState(5);
  const [reason, setReason] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [showEdit, setShowEdit] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadBills = async () => {
    try {
      const tables = await fetchTables(branchId);
      const bills = await Promise.all(
        tables
          .filter((table: any) => table.currentSessionId)
          .map((table: any) => fetchBillForSession(table.currentSessionId))
      );
      const activeBills = bills.filter((entry: any) => entry?.latestBill);
      setEntries(activeBills);
      setSelected((current: any) => {
        if (current) {
          return (
            activeBills.find((entry) => entry.session?.id === current.session?.id) ||
            activeBills.find((entry) => entry.latestBill.id === current.latestBill.id) ||
            activeBills[0] ||
            null
          );
        }
        return activeBills[0] || null;
      });
    } catch (err) {
      console.error('Error loading manager bills:', err);
    }
  };

  useEffect(() => {
    loadBills();
    const socket = getSocket();
    const handleUpdate = () => {
      loadBills();
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
  }, [branchId, onRefreshTrigger]);

  const openSelected = (entry: any) => {
    setSelected(entry);
    setItems(entry.latestBill.items.map((item: any) => ({ ...item })));
  };

  const startEdit = () => {
    if (!selected) return;
    setItems(selected.latestBill.items.map((item: any) => ({ ...item })));
    const prevSub = Number(selected.latestBill.subtotal || 0);
    const prevDisc = Number(selected.latestBill.discountAmount || 0);
    setDiscountPercent(
      prevSub > 0 && prevDisc > 0
        ? Math.round((prevDisc / prevSub) * 100)
        : 0
    );
    setTaxRate(
      selected.latestBill.subtotal
        ? Number(((selected.latestBill.taxAmount / selected.latestBill.subtotal) * 100).toFixed(2))
        : 5
    );
    setReason('');
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!selected || !reason.trim()) return;
    setSaving(true);
    try {
      const updatedBill = await adjustBill(selected.latestBill.id, {
        type: 'MANAGER_BILL_EDIT',
        reason: reason.trim(),
        discountPercent: Number(discountPercent || 0),
        discountAmount: editDiscountAmount,
        taxRate: Number(taxRate || 0),
        modifiedItems: items.filter((item) => item.quantity > 0),
        userId: 'Manager',
      });
      setShowEdit(false);
      setSelected((curr: any) =>
        curr
          ? {
              ...curr,
              latestBill: updatedBill,
            }
          : null
      );
      await loadBills();
    } catch (error: any) {
      alert(error.message || 'Unable to save bill');
    } finally {
      setSaving(false);
    }
  };

  const settlePayment = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await payBill(selected.latestBill.id, {
        method: paymentMethod,
        receivedByUserId: 'Manager',
      });
      setShowPayment(false);
      await loadBills();
    } catch (error: any) {
      alert(error.message || 'Unable to record payment');
    } finally {
      setSaving(false);
    }
  };

  const bill = selected?.latestBill;
  const currentItems = showEdit ? items : bill?.items || [];
  const currentSubtotal = useMemo(
    () =>
      currentItems.reduce(
        (sum: number, item: any) => sum + Number(item.unitPrice) * Number(item.quantity),
        0
      ),
    [currentItems]
  );

  const editSubtotal = useMemo(
    () =>
      items
        .filter((item) => item.quantity > 0)
        .reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0),
    [items]
  );
  const editDiscountAmount = useMemo(
    () => Math.round((editSubtotal * (Number(discountPercent || 0) / 100)) * 100) / 100,
    [editSubtotal, discountPercent]
  );
  const editTaxAmount = useMemo(
    () => Math.round((editSubtotal * (Number(taxRate || 0) / 100)) * 100) / 100,
    [editSubtotal, taxRate]
  );
  const editTotal = useMemo(
    () => Math.max(0, Math.round((editSubtotal + editTaxAmount - editDiscountAmount) * 100) / 100),
    [editSubtotal, editTaxAmount, editDiscountAmount]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
          Manager workspace
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-white">
          <Receipt className="h-6 w-6 text-cyan-400" />
          Bill Operations
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Review active table sessions, edit bills, print tax invoices, and record payments.
        </p>
      </div>

      {/* Main Grid: Active Table Sessions & Bill Details */}
      <div className="grid min-h-[560px] grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left Column: Active Table Sessions */}
        <aside className="lg:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Table Sessions
            </h2>
            <span className="text-xs text-slate-500">{entries.length} Active</span>
          </div>

          <div className="space-y-2">
            {entries.map((entry) => {
              const active = selected?.session?.id === entry.session?.id;
              return (
                <button
                  key={entry.latestBill.id}
                  type="button"
                  onClick={() => openSelected(entry)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    active
                      ? 'border-orange-500 bg-slate-900 ring-2 ring-orange-500/20'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-white">
                      {entry.session.table?.number || 'Table'}
                    </span>
                    <span className="font-mono text-xs font-bold text-orange-400">
                      ₹{Number(entry.latestBill.finalAmount).toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{entry.session.sessionCode}</span>
                    <span>{entry.session.table?.zone || 'Dining'}</span>
                  </div>
                  {entry.session.status === 'BILL_REQUESTED' && (
                    <span className="mt-2 inline-block rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      BILL REQUESTED
                    </span>
                  )}
                </button>
              );
            })}

            {!entries.length && (
              <div className="rounded-xl border border-dashed border-slate-800 py-14 text-center text-xs text-slate-500">
                No active dining sessions.
              </div>
            )}
          </div>
        </aside>

        {/* Right Column: Selected Bill Review */}
        <section className="lg:col-span-8">
          {bill && selected ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl md:p-6">
              {/* Meta header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-black text-white">{selected.session.table?.number}</h2>
                    <span className="rounded bg-slate-800 px-2 py-1 font-mono text-[10px] font-bold text-orange-400">
                      Session #{selected.session.sessionCode}
                    </span>
                    <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-1 font-mono text-[10px] font-bold text-blue-400">
                      Invoice #{bill.invoiceNumber}
                    </span>
                    <span className="rounded border border-purple-500/20 bg-purple-500/10 px-2 py-1 font-mono text-[10px] font-bold text-purple-400">
                      Version {bill.version}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Waiter: {selected.session.waiter?.name || 'Staff'} • Opened:{' '}
                    {new Date(selected.session.startedAt).toLocaleTimeString()}
                  </p>
                </div>
                <span
                  className={`rounded-xl border px-3 py-1 text-xs font-bold ${
                    bill.status === 'PAID'
                      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                      : 'border-amber-500/20 bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {bill.status === 'PAID' ? '✓ PAID & CLOSED' : 'PAYMENT PENDING'}
                </span>
              </div>

              {/* Line Items */}
              <div className="mt-5">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Bill Line Items (Aggregated Across Rounds)
                </h3>
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950/60">
                  <div className="grid grid-cols-12 bg-slate-900/80 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <span className="col-span-6">Item</span>
                    <span className="col-span-2 text-center">Qty</span>
                    <span className="col-span-2 text-right">Price</span>
                    <span className="col-span-2 text-right">Amount</span>
                  </div>
                  {bill.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 border-t border-slate-800/80 px-4 py-3 text-xs text-slate-200"
                    >
                      <span className="col-span-6 font-semibold text-white">{item.name}</span>
                      <span className="col-span-2 text-center font-mono">{item.quantity}</span>
                      <span className="col-span-2 text-right font-mono text-slate-400">
                        ₹{Number(item.unitPrice).toFixed(2)}
                      </span>
                      <span className="col-span-2 text-right font-mono font-bold text-white">
                        ₹{Number(item.totalPrice).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revision History & Financial Totals */}
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                    <History className="h-3.5 w-3.5" />
                    Bill Revision & Audit Trail
                  </h3>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-[11px] text-slate-500">
                    {bill.version === 1
                      ? 'Initial Version 1 generated from order items. No modifications yet.'
                      : `Version ${bill.version} is the latest manager revision.`}
                    <div className="mt-2 rounded-lg bg-slate-900 p-2 font-mono">
                      <span className="font-bold text-purple-400">Version {bill.version}</span>
                      <span className="float-right">Total: ₹{Number(bill.finalAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono">₹{Number(bill.subtotal).toFixed(2)}</span>
                  </div>
                  {Number(bill.discountAmount) > 0 && (
                    <div className="mt-2 flex justify-between font-bold text-emerald-400">
                      <span>
                        Discount {bill.subtotal > 0 ? `(${Math.round((bill.discountAmount / bill.subtotal) * 100)}%)` : ''}
                      </span>
                      <span className="font-mono">-₹{Number(bill.discountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="mt-2 flex justify-between text-slate-400">
                    <span>GST</span>
                    <span className="font-mono">₹{Number(bill.taxAmount).toFixed(2)}</span>
                  </div>
                  <div className="mt-3 flex justify-between border-t border-slate-800 pt-3 text-base font-black text-white">
                    <span>Grand Total</span>
                    <span className="font-mono text-orange-400">
                      ₹{Number(bill.finalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={startEdit}
                  disabled={bill.status === 'PAID'}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-40 transition-colors"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Bill / Discount
                </button>
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print Tax Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setShowPayment(true)}
                  disabled={bill.status === 'PAID'}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2 text-xs font-extrabold text-white shadow-lg shadow-orange-500/20 disabled:opacity-40 hover:brightness-110 transition-all"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  Process Payment (₹{Number(bill.finalAmount).toFixed(2)})
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 py-20 text-center text-sm text-slate-500">
              Select an active table to review its bill.
            </div>
          )}
        </section>
      </div>

      {/* Edit Bill Modal */}
      {showEdit && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  Manager bill edit
                </p>
                <h2 className="text-lg font-black text-white">Invoice #{bill.invoiceNumber}</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-white">
                    {item.name}
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={item.quantity === 0 ? '' : item.quantity}
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => {
                      const val = event.target.value;
                      const q = val === '' ? 0 : Math.max(0, Math.floor(Number(val)));
                      setItems((current) =>
                        current.map((line, lineIndex) =>
                          lineIndex === index ? { ...line, quantity: q } : line
                        )
                      );
                    }}
                    className="h-9 w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 text-center text-sm font-mono text-white focus:outline-none focus:border-cyan-400"
                  />
                  <span className="w-24 text-right font-mono text-sm text-slate-300">
                    ₹{(Number(item.unitPrice) * Number(item.quantity)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-300">
                GST rate (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="5"
                  value={taxRate === 0 ? '' : taxRate}
                  onFocus={(event) => event.target.select()}
                  onChange={(event) => {
                    const val = event.target.value;
                    setTaxRate(val === '' ? 0 : Number(val));
                  }}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </label>
              <label className="text-xs font-bold text-slate-300">
                Discount (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="0"
                  value={discountPercent === 0 ? '' : discountPercent}
                  onFocus={(event) => event.target.select()}
                  onChange={(event) => {
                    const val = event.target.value;
                    setDiscountPercent(val === '' ? 0 : Math.min(100, Math.max(0, Number(val))));
                  }}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </label>
            </div>

            {/* Live Calculation Preview while editing */}
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/90 p-4 text-xs space-y-1.5">
              <div className="flex justify-between text-slate-400">
                <span>Items Subtotal</span>
                <span className="font-mono">₹{editSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>GST ({taxRate}%)</span>
                <span className="font-mono">+₹{editTaxAmount.toFixed(2)}</span>
              </div>
              {Number(discountPercent) > 0 && (
                <div className="flex justify-between font-bold text-emerald-400">
                  <span>Discount Applied ({discountPercent}%)</span>
                  <span className="font-mono">-₹{editDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-black text-white">
                <span>Updated Grand Total</span>
                <span className="font-mono text-orange-400">₹{editTotal.toFixed(2)}</span>
              </div>
            </div>

            <label className="mt-3 block text-xs font-bold text-slate-300">
              Audit reason <span className="text-red-400">*</span>
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Approved 10% coupon / guest count update"
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white focus:outline-none focus:border-cyan-400"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="rounded-lg px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!reason.trim() || saving}
                onClick={saveEdit}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 disabled:opacity-40 hover:bg-emerald-300 transition-colors"
              >
                <Save className="h-4 w-4" />
                Save new version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Settlement Modal */}
      {showPayment && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Settle Bill Payment</h2>
                <p className="font-mono text-xs text-slate-400">Invoice #{bill.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400">Amount Due</span>
                <p className="font-mono text-lg font-black text-orange-400">
                  ₹{Number(bill.finalAmount).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
              {(['UPI', 'CARD', 'CASH'] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`rounded-lg py-2 text-xs font-extrabold transition-all ${
                    paymentMethod === method ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>

            {paymentMethod === 'UPI' && (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 text-center text-xs text-slate-400">
                Scan payment QR for ₹{Number(bill.finalAmount).toFixed(2)}
                <br />
                <span className="font-mono text-slate-300">velvetbistro@icici</span>
              </div>
            )}

            {paymentMethod === 'CASH' && (
              <div className="mt-4">
                <label className="text-xs text-slate-400 block mb-1">Cash tendered (₹)</label>
                <input
                  type="number"
                  className="h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white focus:outline-none focus:border-orange-500"
                  placeholder="e.g. 1200"
                />
              </div>
            )}

            {paymentMethod === 'CARD' && (
              <div className="mt-4 rounded-xl bg-slate-950 p-5 text-center text-xs text-slate-400">
                Tap or insert card on POS terminal.
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowPayment(false)}
                className="rounded-lg px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={settlePayment}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 disabled:opacity-40 hover:bg-emerald-300 transition-colors"
              >
                <CreditCard className="h-4 w-4" />
                Confirm Payment & Liberate Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Modal */}
      {showReceiptModal && selected && (
        <CashierThermalReceiptModal
          isOpen={showReceiptModal}
          bill={selected.latestBill}
          session={selected.session}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
};
