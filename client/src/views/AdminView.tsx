import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  BarChart3,
  TrendingUp,
  FileCheck2,
  Users,
  Store,
  Layers,
  Clock,
  ShieldCheck,
  ChevronDown,
  Receipt,
  Edit3,
  Printer,
  X,
} from 'lucide-react';
import { Restaurant, Branch, AuditLog } from '../types';
import { adjustBill, fetchAuditLogs, fetchAnalytics, fetchTables, fetchBillForSession } from '../services/api';
import { printThermalReceipt } from '../services/thermalPrinter';
import { ManagerBillOperations } from './ManagerBillOperations';
import { ManagerMenuView } from './ManagerMenuView';

interface AdminViewProps {
  branchId: string;
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  onRefreshTrigger?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  branchId,
  restaurants,
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
  const [loading, setLoading] = useState(true);
  const [billDetails, setBillDetails] = useState<any[]>([]);
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editDiscount, setEditDiscount] = useState(0);
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
  }, [branchId, onRefreshTrigger]);

  const openBillEditor = (entry: any) => {
    setSelectedBill(entry);
    setEditItems(entry.latestBill.items.map((item: any) => ({ ...item })));
    setEditDiscount(Number(entry.latestBill.discountAmount || 0));
    setEditTaxRate(entry.latestBill.taxAmount && entry.latestBill.subtotal
      ? Number(((entry.latestBill.taxAmount / entry.latestBill.subtotal) * 100).toFixed(2))
      : 5);
    setEditReason('');
  };

  const saveBillEdits = async () => {
    if (!selectedBill || !editReason.trim()) return;
    try {
      setIsSavingBill(true);
      await adjustBill(selectedBill.latestBill.id, {
        type: 'MANAGER_BILL_EDIT',
        reason: editReason.trim(),
        discountAmount: editDiscount,
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
        <button key={id} type="button" onClick={() => setActivePage(id as 'reports' | 'bills' | 'menu')} className={`rounded-xl px-4 py-2 text-xs font-bold transition ${activePage === id ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
          {label}
        </button>
      ))}
    </div>
  );

  if (activePage === 'bills') {
    return <><div className="mx-auto max-w-7xl px-4 pt-4 md:px-6">{managerNavigation}</div><ManagerBillOperations branchId={branchId} onRefreshTrigger={onRefreshTrigger} /></>;
  }

  if (activePage === 'menu') {
    return <><div className="mx-auto max-w-7xl px-4 pt-4 md:px-6">{managerNavigation}</div><ManagerMenuView branchId={branchId} /></>;
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Total Revenue (Paid)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ₹{analytics?.totalRevenue?.toFixed(2) || '0.00'}
          </div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
            <span>GST & Service Included</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Invoices Paid</span>
            <FileCheck2 className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {analytics?.billsPaidCount || 0}
          </div>
          <div className="text-[11px] text-slate-400">Permanent Invoice Records</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Dining Sessions</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {analytics?.totalSessions || 0}
          </div>
          <div className="text-[11px] text-slate-400">
            {analytics?.completedSessions || 0} Closed / Completed
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Current Branch</span>
            <Store className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="truncate text-xl font-black text-white">{selectedRestaurant?.name || 'Restaurant'}</div>
          <div className="text-[11px] text-slate-400">{selectedRestaurant?.branches.find((branch) => branch.id === branchId)?.name || 'Active branch'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white"><Receipt className="h-4 w-4 text-cyan-400" />Bill details</h2>
              <p className="mt-1 text-xs text-slate-400">Live itemized bills for active sessions and requested tables.</p>
            </div>
            <span className="text-xs text-slate-500">{billDetails.length} active</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {billDetails.length ? billDetails.map((entry: any) => (
              <div key={entry.latestBill.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div><p className="font-bold text-white">{entry.session.table?.number || 'Table'}</p><p className="text-[10px] text-slate-500">Invoice #{entry.latestBill.invoiceNumber}</p></div>
                  <span className="font-mono font-bold text-emerald-400">₹{Number(entry.latestBill.finalAmount).toFixed(2)}</span>
                </div>
                <div className="mt-2 space-y-1">
                  {entry.latestBill.items.map((item: any) => <div key={item.id} className="flex justify-between gap-3 text-xs text-slate-300"><span>{item.quantity} × {item.name}</span><span className="font-mono">₹{Number(item.totalPrice).toFixed(2)}</span></div>)}
                </div>
                <div className="mt-3 flex justify-between text-[10px] text-slate-500"><span>Subtotal ₹{Number(entry.latestBill.subtotal).toFixed(2)} • GST ₹{Number(entry.latestBill.taxAmount).toFixed(2)}</span><span>{entry.latestBill.status}</span></div>
                <div className="mt-3 flex gap-2 border-t border-slate-800 pt-3">
                  <button type="button" onClick={() => openBillEditor(entry)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-slate-700"><Edit3 className="h-3.5 w-3.5" />Edit bill</button>
                  <button type="button" onClick={() => openBillEditor(entry)} className="flex items-center justify-center gap-1.5 rounded-lg border border-cyan-500/30 px-3 py-2 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/10"><Printer className="h-3.5 w-3.5" />Print</button>
                </div>
              </div>
            )) : <p className="col-span-full py-8 text-center text-xs text-slate-500">No active bill details available.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white"><Receipt className="h-4 w-4 text-cyan-400" />Bill activity</h2>
              <p className="mt-1 text-xs text-slate-400">Recent payments recorded for this branch.</p>
            </div>
            <span className="text-xs text-slate-500">{analytics?.recentPayments?.length || 0} records</span>
          </div>
          <div className="space-y-2">
            {analytics?.recentPayments?.length ? analytics.recentPayments.map((payment: any) => (
              <div key={payment.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs">
                <div><p className="font-bold text-white">{payment.bill?.session?.table?.number || 'Table'}</p><p className="text-slate-500">{payment.method} • {new Date(payment.createdAt).toLocaleTimeString()}</p></div>
                <span className="font-mono font-bold text-emerald-400">₹{Number(payment.amount).toFixed(2)}</span>
              </div>
            )) : <p className="py-8 text-center text-xs text-slate-500">No bill payments recorded yet.</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white">Branch focus</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">Use this console for today&apos;s revenue, billing activity, and audit checks. Staff workspaces stay separated by role.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-slate-950/70 p-3"><span className="text-slate-500">Open sessions</span><strong className="mt-1 block text-lg text-white">{(analytics?.totalSessions || 0) - (analytics?.completedSessions || 0)}</strong></div>
            <div className="rounded-xl bg-slate-950/70 p-3"><span className="text-slate-500">Audit events</span><strong className="mt-1 block text-lg text-white">{auditLogs.length}</strong></div>
          </div>
        </div>
      </div>

      {/* Audit Log Stream (Prompt Section 10: Permanent Audit Records) */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Live Immutable Audit Trail
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracks all cashier adjustments, discounts, and payment events for accounting integrity.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">{auditLogs.length} Events</span>
        </div>

        <div className="divide-y divide-slate-800/80 max-h-72 overflow-y-auto pr-1">
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No audit records generated yet. Modify a bill or settle a payment to view live records.
            </div>
          ) : (
            auditLogs.map((log) => {
              let details: any = {};
              try {
                details = JSON.parse(log.detailsJson);
              } catch (e) {}

              return (
                <div
                  key={log.id}
                  className="py-2.5 flex items-center justify-between text-xs gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {log.action}
                      </span>
                      <span className="text-slate-300 font-semibold">User: {log.userId}</span>
                    </div>
                    {details.reason && (
                      <p className="text-[11px] text-amber-300 italic">
                        Reason: “{details.reason}” ({details.oldAmount ? `₹${details.oldAmount} → ₹${details.newAmount}` : ''})
                      </p>
                    )}
                  </div>

                  <div className="text-right text-[11px] text-slate-400 font-mono">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {selectedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Manager bill operations</p><h2 className="mt-1 text-lg font-black text-white">{selectedBill.session.table?.number} • Invoice #{selectedBill.latestBill.invoiceNumber}</h2></div>
              <button type="button" onClick={() => setSelectedBill(null)} className="text-slate-400 hover:text-white" aria-label="Close bill operations"><X className="h-5 w-5" /></button>
            </div>

            <div className="mt-4 space-y-2">
              {editItems.map((item, index) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{item.name}</p><p className="text-[11px] text-slate-500">₹{Number(item.unitPrice).toFixed(2)} each</p></div>
                  <input type="number" min="0" value={item.quantity} onChange={(event) => setEditItems((items) => items.map((current, itemIndex) => itemIndex === index ? { ...current, quantity: Number(event.target.value) } : current))} className="h-9 w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 text-center text-sm text-white" aria-label={`Quantity for ${item.name}`} />
                  <span className="w-20 text-right font-mono text-sm text-slate-300">₹{(Number(item.unitPrice) * Number(item.quantity)).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-300">GST rate (%)<input type="number" min="0" max="100" step="0.1" value={editTaxRate} onChange={(event) => setEditTaxRate(Number(event.target.value))} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white" /></label>
              <label className="text-xs font-bold text-slate-300">Discount (₹)<input type="number" min="0" step="0.01" value={editDiscount} onChange={(event) => setEditDiscount(Number(event.target.value))} className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white" /></label>
            </div>
            <label className="mt-3 block text-xs font-bold text-slate-300">Reason required for audit<input value={editReason} onChange={(event) => setEditReason(event.target.value)} placeholder="e.g. Corrected guest quantity" className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white placeholder:text-slate-600" /></label>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-4">
              <button type="button" onClick={printThermalReceipt} className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 px-4 py-2 text-xs font-bold text-cyan-300"><Printer className="h-4 w-4" />Print bill</button>
              <button type="button" disabled={isSavingBill || !editReason.trim()} onClick={saveBillEdits} className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">{isSavingBill ? 'Saving...' : 'Save new bill version'}</button>
            </div>

            <div className="thermal-receipt absolute left-[-9999px] top-0 w-[80mm] bg-white p-5 font-mono text-xs text-slate-950">
              <div className="receipt-logo mx-auto"><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M11 25h42v6H11zM17 31h30l-3 20H20zM24 13h16v12H24zM20 9h24v5H20z" fill="currentColor" /><path d="M28 17h8v8h-8z" fill="white" /></svg></div>
              <h2 className="text-center text-base font-black uppercase">The Velvet Bistro</h2>
              <p className="mt-1 text-center text-[10px]">{selectedBill.session.table?.number} • Invoice #{selectedBill.latestBill.invoiceNumber}</p>
              <p className="border-b border-dashed border-slate-400 pb-2 text-center text-[10px]">{new Date().toLocaleString()}</p>
              <div className="space-y-1 py-2">
                {editItems.filter((item) => item.quantity > 0).map((item) => <div key={item.id} className="flex justify-between"><span>{item.quantity}x {item.name}</span><span>₹{(Number(item.unitPrice) * Number(item.quantity)).toFixed(2)}</span></div>)}
              </div>
              <div className="space-y-1 border-t border-dashed border-slate-400 pt-2"><div className="flex justify-between"><span>Subtotal</span><span>₹{editItems.reduce((sum, item) => sum + Number(item.unitPrice) * Number(item.quantity), 0).toFixed(2)}</span></div><div className="flex justify-between"><span>GST ({editTaxRate}%)</span><span>calculated</span></div><div className="flex justify-between border-t border-slate-800 pt-2 font-black"><span>TOTAL</span><span>See updated bill</span></div></div>
              <p className="mt-4 border-t border-dashed border-slate-400 pt-3 text-center text-[10px]">Thank you for dining with us.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
