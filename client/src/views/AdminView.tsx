import React, { useState, useEffect } from 'react';
import { Receipt, Edit3, Printer, X } from 'lucide-react';
import { Restaurant, AuditLog } from '../types';
import {
  adjustBill,
  fetchAuditLogs,
  fetchAnalytics,
  fetchTables,
  fetchBillForSession,
} from '../services/api';
import { printThermalReceipt } from '../services/thermalPrinter';
import { getSocket } from '../services/socket';
import { CashierThermalReceiptModal } from '../components/cashier/CashierThermalReceiptModal';
import { ManagerBillOperations } from './ManagerBillOperations';
import { ManagerMenuView } from './ManagerMenuView';
import { AdminStatsGrid } from '../components/admin/AdminStatsGrid';
import { AdminAuditLogsTable } from '../components/admin/AdminAuditLogsTable';

interface AdminViewProps {
  branchId: string;
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  onRefreshTrigger?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  branchId,
  selectedRestaurant,
  onRefreshTrigger,
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [analytics, setAnalytics] = useState<{
    totalSessions: number;
    completedSessions: number;
    totalRevenue: number;
    billsPaidCount: number;
    recentPayments: any[];
  } | null>(null);
  const [, setLoading] = useState(true);
  const [billDetails, setBillDetails] = useState<any[]>([]);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [receiptEntry, setReceiptEntry] = useState<any | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editDiscountPercent, setEditDiscountPercent] = useState(0);
  const [editTaxRate, setEditTaxRate] = useState(5);
  const [editReason, setEditReason] = useState('');
  const [isSavingBill, setIsSavingBill] = useState(false);
  const [activePage, setActivePage] = useState<'reports' | 'bills' | 'menu'>('reports');

  const loadData = async () => {
    try {
      setLoading(true);
      const [logs, stats, tables] = await Promise.all([
        fetchAuditLogs(branchId),
        fetchAnalytics(branchId),
        fetchTables(branchId),
      ]);
      setAuditLogs(logs);
      setAnalytics(stats);
      const activeBills = await Promise.all(
        tables
          .filter((table: any) => table.currentSessionId)
          .map((table: any) => fetchBillForSession(table.currentSessionId))
      );
      setBillDetails(activeBills.filter((bill) => bill?.latestBill));
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const socket = getSocket();
    const handleUpdate = () => {
      loadData();
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

  const openBillEditor = (entry: any) => {
    setSelectedBill(entry);
    setEditItems(entry.latestBill.items.map((item: any) => ({ ...item })));
    const prevSub = Number(entry.latestBill.subtotal || 0);
    const prevDisc = Number(entry.latestBill.discountAmount || 0);
    setEditDiscountPercent(prevSub > 0 && prevDisc > 0 ? Math.round((prevDisc / prevSub) * 100) : 0);
    setEditTaxRate(
      entry.latestBill.taxAmount && entry.latestBill.subtotal
        ? Number(((entry.latestBill.taxAmount / entry.latestBill.subtotal) * 100).toFixed(2))
        : 5
    );
    setEditReason('');
  };

  const saveBillEdits = async () => {
    if (!selectedBill || !editReason.trim()) return;
    try {
      setIsSavingBill(true);
      const prevSub = selectedBill.latestBill.subtotal || 0;
      const calcDiscountAmount = Math.round((prevSub * (Number(editDiscountPercent || 0) / 100)) * 100) / 100;
      await adjustBill(selectedBill.latestBill.id, {
        type: 'MANAGER_BILL_EDIT',
        reason: editReason.trim(),
        discountPercent: Number(editDiscountPercent || 0),
        discountAmount: calcDiscountAmount,
        taxRate: editTaxRate,
        modifiedItems: editItems.filter((item) => item.quantity > 0),
        userId: 'Manager',
      });
      setSelectedBill(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Unable to update bill');
    } finally {
      setIsSavingBill(false);
    }
  };

  const managerNavigation = (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-2">
      {[
        ['reports', 'Sales Reports'],
        ['bills', 'Bill Operations'],
        ['menu', 'Menu Management'],
      ].map(([id, label]) => (
        <button
          key={id}
          type="button"
          onClick={() => setActivePage(id as 'reports' | 'bills' | 'menu')}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
            activePage === id
              ? 'bg-cyan-400 text-slate-950'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  if (activePage === 'bills') {
    return (
      <>
        <div className="mx-auto max-w-7xl px-4 pt-4 md:px-6">{managerNavigation}</div>
        <ManagerBillOperations branchId={branchId} onRefreshTrigger={onRefreshTrigger} />
      </>
    );
  }

  if (activePage === 'menu') {
    return (
      <>
        <div className="mx-auto max-w-7xl px-4 pt-4 md:px-6">{managerNavigation}</div>
        <ManagerMenuView branchId={branchId} />
      </>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>📊 Sales Reports</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-medium">
                Branch Operations
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Revenue, bill activity, staff operations, and permanent audit history for this branch.
          </p>
        </div>
      </div>

      {managerNavigation}

      {/* Analytics KPI Stat Cards */}
      <AdminStatsGrid
        analytics={analytics}
        selectedRestaurant={selectedRestaurant}
        branchId={branchId}
      />

      {/* Bill Activity & Branch Focus Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Bill Details (Hidden) */}
        <div className="hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                <Receipt className="h-4 w-4 text-cyan-400" />
                Bill details
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Live itemized bills for active sessions and requested tables.
              </p>
            </div>
            <span className="text-xs text-slate-500">{billDetails.length} active</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {billDetails.length ? (
              billDetails.map((entry: any) => (
                <div
                  key={entry.latestBill.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <p className="font-bold text-white">{entry.session.table?.number || 'Table'}</p>
                      <p className="text-[10px] text-slate-500">
                        Invoice #{entry.latestBill.invoiceNumber}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-emerald-400">
                      ₹{Number(entry.latestBill.finalAmount).toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {entry.latestBill.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex justify-between gap-3 text-xs text-slate-300"
                      >
                        <span>
                          {item.quantity} × {item.name}
                        </span>
                        <span className="font-mono">₹{Number(item.totalPrice).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex justify-between text-[10px] text-slate-500">
                    <span>
                      Subtotal ₹{Number(entry.latestBill.subtotal).toFixed(2)}
                      {Number(entry.latestBill.discountAmount) > 0 && ` • Disc -₹${Number(entry.latestBill.discountAmount).toFixed(2)}`}
                      {` • GST ₹${Number(entry.latestBill.taxAmount).toFixed(2)}`}
                    </span>
                    <span>{entry.latestBill.status}</span>
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-slate-800 pt-3">
                    <button
                      type="button"
                      onClick={() => openBillEditor(entry)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-slate-700"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit bill
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptEntry(entry)}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/30 px-3 py-2 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/10"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="col-span-full py-8 text-center text-xs text-slate-500">
                No active bill details available.
              </p>
            )}
          </div>
        </div>

        {/* Bill Activity */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white">
                <Receipt className="h-4 w-4 text-cyan-400" />
                Bill activity
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Recent payments recorded for this branch.
              </p>
            </div>
            <span className="text-xs text-slate-500">
              {analytics?.recentPayments?.length || 0} records
            </span>
          </div>
          <div className="space-y-2">
            {analytics?.recentPayments?.length ? (
              analytics.recentPayments.map((payment: any) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs"
                >
                  <div>
                    <p className="font-bold text-white">
                      {payment.bill?.session?.table?.number || 'Table'}
                    </p>
                    <p className="text-slate-500">
                      {payment.method} • {new Date(payment.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">
                    ₹{Number(payment.amount).toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-8 text-center text-xs text-slate-500">
                No bill payments recorded yet.
              </p>
            )}
          </div>
        </div>

        {/* Branch Focus */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Branch focus</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Use this console for today&apos;s revenue, billing activity, and audit checks. Staff workspaces stay separated by role.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-slate-950/70 p-3">
              <span className="text-slate-500">Open sessions</span>
              <strong className="mt-1 block text-lg text-white">
                {(analytics?.totalSessions || 0) - (analytics?.completedSessions || 0)}
              </strong>
            </div>
            <div className="rounded-xl bg-slate-950/70 p-3">
              <span className="text-slate-500">Audit events</span>
              <strong className="mt-1 block text-lg text-white">{auditLogs.length}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Live Immutable Audit Trail */}
      <AdminAuditLogsTable auditLogs={auditLogs} />

      {/* Modal for editing bills */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                  Manager bill operations
                </p>
                <h2 className="mt-1 text-lg font-black text-white">
                  {selectedBill.session.table?.number} • Invoice #{selectedBill.latestBill.invoiceNumber}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBill(null)}
                className="text-slate-400 hover:text-white"
                aria-label="Close bill operations"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {editItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-white">{item.name}</p>
                    <p className="text-[11px] text-slate-500">₹{Number(item.unitPrice).toFixed(2)} each</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={item.quantity === 0 ? '' : item.quantity}
                    onFocus={(event) => event.target.select()}
                    onChange={(event) =>
                      setEditItems((items) =>
                        items.map((current, itemIndex) =>
                          itemIndex === index
                            ? { ...current, quantity: event.target.value === '' ? 0 : Number(event.target.value) }
                            : current
                        )
                      )
                    }
                    className="h-9 w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 text-center text-sm text-white focus:outline-none focus:border-cyan-400 font-mono"
                    aria-label={`Quantity for ${item.name}`}
                  />
                  <span className="w-20 text-right font-mono text-sm text-slate-300">
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
                  value={editTaxRate === 0 ? '' : editTaxRate}
                  onFocus={(event) => event.target.select()}
                  onChange={(event) => setEditTaxRate(event.target.value === '' ? 0 : Number(event.target.value))}
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
                  value={editDiscountPercent === 0 ? '' : editDiscountPercent}
                  onFocus={(event) => event.target.select()}
                  onChange={(event) => setEditDiscountPercent(event.target.value === '' ? 0 : Math.min(100, Math.max(0, Number(event.target.value))))}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </label>
            </div>

            {/* Live calculation preview */}
            {(() => {
              const previewSubtotal = editItems
                .filter((item) => item.quantity > 0)
                .reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0);
              const previewTax = Number(((previewSubtotal * editTaxRate) / 100).toFixed(2));
              const previewDiscount = Math.round((previewSubtotal * (Number(editDiscountPercent || 0) / 100)) * 100) / 100;
              const previewTotal = Math.max(0, previewSubtotal + previewTax - previewDiscount);
              return (
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/90 p-3 text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Items Subtotal</span>
                    <span className="font-mono">₹{previewSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST ({editTaxRate}%)</span>
                    <span className="font-mono">+₹{previewTax.toFixed(2)}</span>
                  </div>
                  {previewDiscount > 0 && (
                    <div className="flex justify-between font-bold text-emerald-400">
                      <span>Discount Applied ({editDiscountPercent}%)</span>
                      <span className="font-mono">-₹{previewDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-black text-white">
                    <span>Updated Grand Total</span>
                    <span className="font-mono text-cyan-300">₹{previewTotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            <label className="mt-3 block text-xs font-bold text-slate-300">
              Reason required for audit
              <input
                value={editReason}
                onChange={(event) => setEditReason(event.target.value)}
                placeholder="e.g. Corrected guest quantity"
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={printThermalReceipt}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 px-4 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-500/10 transition-colors"
              >
                <Printer className="h-4 w-4" />
                Print bill
              </button>
              <button
                type="button"
                disabled={isSavingBill || !editReason.trim()}
                onClick={saveBillEdits}
                className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-emerald-300 transition-colors"
              >
                {isSavingBill ? 'Saving...' : 'Save new bill version'}
              </button>
            </div>

            <div className="thermal-receipt absolute left-[-9999px] top-0 w-[80mm] bg-white p-5 font-mono text-xs text-slate-950">
              <div className="receipt-logo mx-auto">
                <svg viewBox="0 0 64 64" aria-hidden="true">
                  <path d="M11 25h42v6H11zM17 31h30l-3 20H20zM24 13h16v12H24zM20 9h24v5H20z" fill="currentColor" />
                  <path d="M28 17h8v8h-8z" fill="white" />
                </svg>
              </div>
              <h2 className="text-center text-base font-black uppercase">The Velvet Bistro</h2>
              <p className="mt-1 text-center text-[10px]">
                {selectedBill.session.table?.number} • Invoice #{selectedBill.latestBill.invoiceNumber}
              </p>
              <p className="border-b border-dashed border-slate-400 pb-2 text-center text-[10px]">
                {new Date().toLocaleString()}
              </p>
              <div className="space-y-1 py-2">
                {editItems
                  .filter((item) => item.quantity > 0)
                  .map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>₹{(Number(item.unitPrice) * Number(item.quantity)).toFixed(2)}</span>
                    </div>
                  ))}
              </div>
              {(() => {
                const previewSubtotal = editItems
                  .filter((item) => item.quantity > 0)
                  .reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0);
                const previewTax = Number(((previewSubtotal * editTaxRate) / 100).toFixed(2));
                const previewDiscount = Math.round((previewSubtotal * (Number(editDiscountPercent || 0) / 100)) * 100) / 100;
                const previewTotal = Math.max(0, previewSubtotal + previewTax - previewDiscount);
                return (
                  <div className="space-y-1 border-t border-dashed border-slate-400 pt-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>₹{previewSubtotal.toFixed(2)}</span>
                    </div>
                    {previewDiscount > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>Discount ({editDiscountPercent}%)</span>
                        <span>-₹{previewDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>GST ({editTaxRate}%)</span>
                      <span>₹{previewTax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-800 pt-2 font-black">
                      <span>TOTAL</span>
                      <span>₹{previewTotal.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })()}
              <p className="mt-4 border-t border-dashed border-slate-400 pt-3 text-center text-[10px]">
                Thank you for dining with us.
              </p>
            </div>
          </div>
        </div>
      )}
      {receiptEntry && (
        <CashierThermalReceiptModal
          isOpen={Boolean(receiptEntry)}
          bill={receiptEntry.latestBill}
          session={receiptEntry.session}
          onClose={() => setReceiptEntry(null)}
        />
      )}
    </div>
  );
};
