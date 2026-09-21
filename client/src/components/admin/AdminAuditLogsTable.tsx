import React from 'react';
import { Clock } from 'lucide-react';
import { AuditLog } from '../../types';

interface AdminAuditLogsTableProps {
  auditLogs: AuditLog[];
}

export const AdminAuditLogsTable: React.FC<AdminAuditLogsTableProps> = ({ auditLogs }) => {
  return (
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
                      Reason: “{details.reason}”{' '}
                      {details.oldAmount ? `(₹${details.oldAmount} → ₹${details.newAmount})` : ''}
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
  );
};
