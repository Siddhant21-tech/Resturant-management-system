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
} from 'lucide-react';
import { Restaurant, Branch, AuditLog } from '../types';
import { fetchAuditLogs, fetchAnalytics } from '../services/api';

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

  const loadData = async () => {
    try {
      setLoading(true);
      const [logs, stats] = await Promise.all([
        fetchAuditLogs(branchId),
        fetchAnalytics(branchId),
      ]);
      setAuditLogs(logs);
      setAnalytics(stats);
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
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-medium">
                Multi-Tenant Governance
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Platform multi-tenancy overview, role-based access matrix, and permanent audit log history.
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
            <span>Multi-Tenant Tenants</span>
            <Store className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {restaurants.length} Restaurants
          </div>
          <div className="text-[11px] text-slate-400">
            {restaurants.flatMap((r) => r.branches || []).length} Active Branches
          </div>
        </div>
      </div>

      {/* Role-Based Permissions (RBAC) Matrix Table (From Prompt Section 8) */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              Role-Based Access Matrix (Configurable RBAC)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Governs permissions across Waiters, Kitchen, Cashiers, and Admins.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">System Action</th>
                <th className="py-2.5 px-3 text-center">Waiter</th>
                <th className="py-2.5 px-3 text-center">Kitchen</th>
                <th className="py-2.5 px-3 text-center">Cashier</th>
                <th className="py-2.5 px-3 text-center">Restaurant Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              <tr>
                <td className="py-2 px-3 text-white font-semibold">Create Order / Round</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">✓</td>
                <td className="py-2 px-3 text-center text-slate-600">-</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">✓</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">✓</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-white font-semibold">Modify Recent Order (&lt; 3m)</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">✓</td>
                <td className="py-2 px-3 text-center text-slate-600">-</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">✓</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">✓</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-white font-semibold">Accept / Cook Order Item</td>
                <td className="py-2 px-3 text-center text-slate-600">-</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">✓</td>
                <td className="py-2 px-3 text-center text-slate-600">-</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">✓</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-white font-semibold">Adjust Bill / Discount</td>
                <td className="py-2 px-3 text-center text-slate-600">-</td>
                <td className="py-2 px-3 text-center text-slate-600">-</td>
                <td className="py-2 px-3 text-center text-amber-400 font-bold">✓ (Audit Logged)</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">✓</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-white font-semibold">Record Payment & Settle</td>
                <td className="py-2 px-3 text-center text-slate-600">-</td>
                <td className="py-2 px-3 text-center text-slate-600">-</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">✓</td>
                <td className="py-2 px-3 text-center text-emerald-400 font-bold">✓</td>
              </tr>
            </tbody>
          </table>
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
