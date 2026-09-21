import React from 'react';
import { TrendingUp, FileCheck2, Users, Store } from 'lucide-react';
import { Restaurant } from '../../types';

interface AdminStatsGridProps {
  analytics: {
    totalSessions: number;
    completedSessions: number;
    totalRevenue: number;
    billsPaidCount: number;
    recentPayments: any[];
  } | null;
  selectedRestaurant: Restaurant | null;
  branchId: string;
}

export const AdminStatsGrid: React.FC<AdminStatsGridProps> = ({
  analytics,
  selectedRestaurant,
  branchId,
}) => {
  const currentBranch = selectedRestaurant?.branches.find((branch) => branch.id === branchId);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Revenue */}
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

      {/* Invoices Paid */}
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

      {/* Dining Sessions */}
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

      {/* Current Branch */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span>Current Branch</span>
          <Store className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="truncate text-xl font-black text-white">
          {selectedRestaurant?.name || 'Restaurant'}
        </div>
        <div className="text-[11px] text-slate-400">
          {currentBranch?.name || 'Active branch'}
        </div>
      </div>
    </div>
  );
};
