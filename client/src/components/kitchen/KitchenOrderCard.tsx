import React from 'react';
import { Clock, CheckCircle2, Flame, Sparkles } from 'lucide-react';
import { OrderItem } from '../../types';

export interface KitchenGroupedOrder {
  id: string;
  tableNum: string;
  sessionCode: string;
  roundNum: number;
  source: string;
  createdAt: string;
  items: OrderItem[];
}

interface KitchenOrderCardProps {
  order: KitchenGroupedOrder;
  elapsedText: string;
  onTransition: (items: OrderItem[], nextStatus: string) => void;
}

export const KitchenOrderCard: React.FC<KitchenOrderCardProps> = ({
  order,
  elapsedText,
  onTransition,
}) => {
  const isPending = order.items.some((item) => item.status === 'PENDING');
  const isAccepted = !isPending && order.items.some((item) => item.status === 'ACCEPTED');
  const isPreparing =
    !isPending && !isAccepted && order.items.some((item) => item.status === 'PREPARING');
  const isReady =
    !isPending && !isAccepted && !isPreparing && order.items.every((item) => item.status === 'READY');
  const status = isPending ? 'PENDING' : isAccepted ? 'ACCEPTED' : isPreparing ? 'PREPARING' : 'READY';

  const cardBorderClass = isPending
    ? 'bg-red-950/20 border-red-500/40 ring-1 ring-red-500/30 animate-pulse'
    : isAccepted
    ? 'bg-amber-950/20 border-amber-500/30'
    : isPreparing
    ? 'bg-blue-950/20 border-blue-500/30'
    : 'bg-emerald-950/20 border-emerald-500/30';

  const badgeClass = isPending
    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
    : isAccepted
    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
    : isPreparing
    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';

  return (
    <div className={`rounded-2xl border p-4 transition-all ${cardBorderClass}`}>
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="font-black text-lg text-white">{order.tableNum}</span>
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
              {order.sessionCode}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{elapsedText}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 py-1.5">
          <span>
            Order #{order.roundNum} • Via {order.source}
          </span>
          {order.items[0]?.station && (
            <span
              className="px-2 py-0.5 rounded font-semibold text-[10px]"
              style={{
                backgroundColor: `${order.items[0].station.colorCode}20`,
                color: order.items[0].station.colorCode,
              }}
            >
              {order.items[0].station.name}
            </span>
          )}
        </div>

        {/* Item content */}
        <div className="py-3">
          <div className="flex items-start justify-between gap-2">
            <span className="font-extrabold text-sm text-white">
              {order.items.length} item{order.items.length === 1 ? '' : 's'} in this order
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeClass}`}>
              {status}
            </span>
          </div>

          <div className="mt-2 space-y-1 rounded-lg border border-slate-800 bg-slate-900 p-2">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-100">
                  {item.quantity} × {item.menuItem?.name}
                </span>
                {item.notes && (
                  <span className="truncate text-[10px] italic text-amber-300">
                    {item.notes}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Status Cycle Action Buttons */}
      <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
        {isPending && (
          <button
            onClick={() => onTransition(order.items, 'ACCEPTED')}
            className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Accept Order</span>
          </button>
        )}

        {isAccepted && (
          <button
            onClick={() => onTransition(order.items, 'PREPARING')}
            className="flex-1 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
          >
            <Flame className="w-4 h-4" />
            <span>Start Cooking (Locks Mod)</span>
          </button>
        )}

        {isPreparing && (
          <button
            onClick={() => onTransition(order.items, 'READY')}
            className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Mark Ready to Serve</span>
          </button>
        )}

        {isReady && (
          <button
            onClick={() => onTransition(order.items, 'SERVED')}
            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Delivered / Served</span>
          </button>
        )}
      </div>
    </div>
  );
};
