import React from 'react';
import { Users } from 'lucide-react';
import { Table } from '../../types';

interface WaiterTableGridProps {
  tables: Table[];
  selectedTable: Table | null;
  onSelectTable: (table: Table) => void;
}

export const WaiterTableGrid: React.FC<WaiterTableGridProps> = ({
  tables,
  selectedTable,
  onSelectTable,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Floor Tables
        </h2>
        <span className="text-xs text-slate-500">{tables.length} Total Tables</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {tables.map((table) => {
          const isSelected = selectedTable?.id === table.id;
          const isOccupied = table.status === 'OCCUPIED';
          const isBillReq = table.status === 'BILL_REQUESTED';

          return (
            <button
              key={table.id}
              onClick={() => onSelectTable(table)}
              className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'border-orange-500 bg-slate-900 ring-2 ring-orange-500/20'
                  : 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-extrabold text-base text-white">{table.number}</span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isBillReq
                      ? 'bg-amber-400 animate-ping'
                      : isOccupied
                      ? 'bg-blue-500'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-500" />
                  {table.capacity} Seats
                </span>
                <span className="text-[11px] font-medium text-slate-400">{table.zone}</span>
              </div>

              {/* Active Session Info if occupied */}
              {table.activeSession && (
                <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between font-mono">
                  <span className="text-orange-400 font-semibold">
                    {table.activeSession.sessionCode}
                  </span>
                  <span>{table.activeSession.orders?.length || 0} Rounds</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
