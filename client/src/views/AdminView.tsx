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
} from 'lucide-react';
import { Restaurant, Branch, AuditLog } from '../types';
import { fetchAuditLogs, fetchAnalytics, fetchTables, fetchBillForSession } from '../services/api';

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

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>⚙️ Admin, RBAC & Audit Console</span>
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
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 lg:col-span-2">
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
    </div>
  );
};
