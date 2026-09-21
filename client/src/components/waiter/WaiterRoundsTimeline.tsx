import React from 'react';
import { ShoppingBag, Plus, Lock, Unlock, Edit2, Trash2 } from 'lucide-react';
import { OrderRound, OrderItem } from '../../types';

interface WaiterRoundsTimelineProps {
  orders: OrderRound[];
  onAddItemsClick: () => void;
  onModifyItem: (item: OrderItem) => void;
  onCancelItem: (item: OrderItem) => void;
}

export const WaiterRoundsTimeline: React.FC<WaiterRoundsTimelineProps> = ({
  orders,
  onAddItemsClick,
  onModifyItem,
  onCancelItem,
}) => {
  const getModificationCountdown = (item: OrderItem) => {
    const lockedStatuses = ['PREPARING', 'READY', 'SERVED', 'CANCELLED'];
    if (lockedStatuses.includes(item.status)) {
      return {
        allowed: false,
        label: `Locked (${item.status})`,
        badgeClass: 'bg-slate-800 text-slate-400 border-slate-700',
        isLocked: true,
      };
    }

    if (!item.acceptedAt) {
      return {
        allowed: true,
        label: 'Awaiting Kitchen Accept',
        badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        isLocked: false,
      };
    }

    return {
      allowed: true,
      label: 'Editable until ready',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      isLocked: false,
    };
  };

  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl">
        <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No orders placed yet for this session.</p>
        <button
          onClick={onAddItemsClick}
          className="mt-3 inline-flex items-center gap-1.5 text-xs text-orange-400 font-semibold hover:underline"
        >
          Take First Order <Plus className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((round) => (
        <div
          key={round.id}
          className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 font-bold border border-orange-500/20">
                ROUND #{round.roundNumber}
              </span>
              <span className="text-xs text-slate-400">
                Via {round.source} • {new Date(round.submittedAt).toLocaleTimeString()}
              </span>
            </div>
            <span className="text-xs font-medium text-slate-400">
              Status: <span className="text-slate-200">{round.status}</span>
            </span>
          </div>

          {/* Round Items List */}
          <div className="divide-y divide-slate-800/60">
            {round.items?.map((item) => {
              const countdown = getModificationCountdown(item);
              const isCancelled = item.status === 'CANCELLED';

              return (
                <div
                  key={item.id}
                  className={`py-2.5 flex items-center justify-between gap-3 ${
                    isCancelled ? 'opacity-40 line-through' : ''
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        {item.quantity} × {item.menuItem?.name}
                      </span>
                      {/* Station tag */}
                      {item.station && (
                        <span
                          className="text-[10px] px-1.5 py-0.2 rounded font-medium"
                          style={{
                            backgroundColor: `${item.station.colorCode}20`,
                            color: item.station.colorCode,
                          }}
                        >
                          {item.station.name}
                        </span>
                      )}
                    </div>
                    {item.notes && (
                      <p className="text-xs text-slate-400 italic">“{item.notes}”</p>
                    )}
                    <div className="text-[11px] text-slate-500 font-mono">
                      ₹{item.unitPrice} each = ₹{item.quantity * item.unitPrice}
                    </div>
                  </div>

                  {/* Right Side: Status + 3-Minute Rule Timer + Actions */}
                  <div className="flex items-center gap-2">
                    {!isCancelled && (
                      <span
                        className={`text-[11px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${countdown.badgeClass}`}
                      >
                        {countdown.isLocked ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <Unlock className="w-3 h-3" />
                        )}
                        {countdown.label}
                      </span>
                    )}

                    {/* Edit & Cancel Buttons */}
                    {!isCancelled && countdown.allowed && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onModifyItem(item)}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                          title="Modify Quantity"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onCancelItem(item)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Cancel Item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
