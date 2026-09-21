import React from 'react';
import { Table } from '../../types';

interface CashierSessionListProps {
  tables: Table[];
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
}

export const CashierSessionList: React.FC<CashierSessionListProps> = ({
  tables,
  selectedSessionId,
  onSelectSession,
}) => {
  const activeTables = tables.filter((t) => t.currentSessionId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Active Table Sessions
        </h2>
        <span className="text-xs text-slate-500">{activeTables.length} Active</span>
      </div>

      <div className="space-y-2">
        {activeTables.map((table) => {
          const isSelected = selectedSessionId === table.currentSessionId;
          const isBillReq = table.status === 'BILL_REQUESTED';

          return (
            <button
              key={table.id}
              onClick={() => onSelectSession(table.currentSessionId!)}
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

        {activeTables.length === 0 && (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
            No active dining sessions.
          </div>
        )}
      </div>
    </div>
  );
};
