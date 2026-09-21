import React from 'react';
import { KitchenStation, OrderItem } from '../../types';

interface KitchenStationFilterProps {
  stations: KitchenStation[];
  selectedStationId: string;
  onSelectStation: (stationId: string) => void;
  totalOrdersCount: number;
  tickets: OrderItem[];
}

export const KitchenStationFilter: React.FC<KitchenStationFilterProps> = ({
  stations,
  selectedStationId,
  onSelectStation,
  totalOrdersCount,
  tickets,
}) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-400">Station View:</span>
      <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
        <button
          onClick={() => onSelectStation('all')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            selectedStationId === 'all'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          All ({totalOrdersCount})
        </button>
        {stations.map((s) => {
          const count = tickets.filter((t) => t.stationId === s.id).length;
          return (
            <button
              key={s.id}
              onClick={() => onSelectStation(s.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                selectedStationId === s.id
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: s.colorCode }}
              />
              <span>{s.name}</span>
              <span className="text-[10px] text-slate-500">({count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
