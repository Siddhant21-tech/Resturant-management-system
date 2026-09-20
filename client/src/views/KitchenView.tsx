import React, { useState, useEffect, useMemo } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  Flame,
  UtensilsCrossed,
  Layers,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { KitchenStation, OrderItem } from '../types';
import { fetchStations, fetchKitchenTickets, updateItemStatus } from '../services/api';
import { playNotificationSound } from '../services/socket';

interface KitchenViewProps {
  branchId: string;
  onRefreshTrigger?: () => void;
}

export const KitchenView: React.FC<KitchenViewProps> = ({ branchId, onRefreshTrigger }) => {
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>('all');
  const [tickets, setTickets] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Live timer tick for elapsed preparation time
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stationList, ticketList] = await Promise.all([
        fetchStations(branchId),
        fetchKitchenTickets(branchId, selectedStationId),
      ]);
      setStations(stationList);
      setTickets(ticketList);
    } catch (err) {
      console.error('Error loading kitchen tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [branchId, selectedStationId, onRefreshTrigger]);

  const handleStatusTransition = async (item: OrderItem, nextStatus: string) => {
    try {
      await updateItemStatus(item.id, nextStatus);
      if (nextStatus === 'READY') {
        playNotificationSound('item_ready');
      }
      await loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const formatElapsed = (createdAt: string) => {
    const elapsedSec = Math.floor((currentTime - new Date(createdAt).getTime()) / 1000);
    const m = Math.floor(elapsedSec / 60);
    const s = elapsedSec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  const groupedOrders = useMemo(() => {
    const groups = new Map<string, {
      id: string;
      tableNum: string;
      sessionCode: string;
      roundNum: number;
      source: string;
      createdAt: string;
      items: OrderItem[];
    }>();

    tickets.forEach((ticket) => {
      const roundId = ticket.roundId;
      const existing = groups.get(roundId);
      if (existing) {
        existing.items.push(ticket);
        if (new Date(ticket.createdAt).getTime() < new Date(existing.createdAt).getTime()) {
          existing.createdAt = ticket.createdAt;
        }
        return;
      }

      groups.set(roundId, {
        id: roundId,
        tableNum: ticket.round?.session?.table?.number || 'Table ?',
        sessionCode: ticket.round?.session?.sessionCode || '',
        roundNum: ticket.round?.roundNumber || 1,
        source: ticket.round?.source || 'WAITER',
        createdAt: ticket.createdAt,
        items: [ticket],
      });
    });

    return Array.from(groups.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [tickets]);

  const handleOrderTransition = async (items: OrderItem[], nextStatus: string) => {
    try {
      await Promise.all(items.map((item) => updateItemStatus(item.id, nextStatus)));
      if (nextStatus === 'READY') playNotificationSound('item_ready');
      await loadData();
    } catch (err) {
      console.error('Failed to update kitchen order:', err);
    }
  };

  return (
    <div className="kitchen-board mx-auto flex h-[calc(100vh-112px)] max-w-7xl flex-col overflow-hidden p-4 md:p-6">
      {/* KDS Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>👨‍🍳 Kitchen Display System (KDS)</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-medium">
                Live Station Routing
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Orders automatically route to designated stations. Marking items status syncs real-time with Waiter Tablets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Station View:</span>
          {/* Station Pills */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setSelectedStationId('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedStationId === 'all'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({groupedOrders.length})
            </button>
            {stations.map((s) => {
              const count = tickets.filter((t) => t.stationId === s.id).length;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStationId(s.id)}
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
      </div>

      {/* Tickets Grid */}
      {tickets.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800">
          <ChefHat className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">All Kitchen Queues are Clear</h3>
          <p className="text-xs text-slate-400 mt-1">
            New food or drink orders submitted by Waiters or Customers will appear instantly.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 grid grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2 lg:grid-cols-3 auto-rows-max content-start">
          {groupedOrders.map((order) => {
            const isPending = order.items.some((item) => item.status === 'PENDING');
            const isAccepted = !isPending && order.items.some((item) => item.status === 'ACCEPTED');
            const isPreparing = !isPending && !isAccepted && order.items.some((item) => item.status === 'PREPARING');
            const isReady = !isPending && !isAccepted && !isPreparing && order.items.every((item) => item.status === 'READY');
            const status = isPending ? 'PENDING' : isAccepted ? 'ACCEPTED' : isPreparing ? 'PREPARING' : 'READY';

            return (
              <div
                key={order.id}
                className={`rounded-2xl border p-4 transition-all ${
                  isPending
                    ? 'bg-red-950/20 border-red-500/40 ring-1 ring-red-500/30 animate-pulse'
                    : isAccepted
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : isPreparing
                    ? 'bg-blue-950/20 border-blue-500/30'
                    : 'bg-emerald-950/20 border-emerald-500/30'
                }`}
              >
                {/* Each submitted round stays as one independent kitchen order. */}
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
                      <span>{formatElapsed(order.createdAt)}</span>
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
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isPending
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : isAccepted
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : isPreparing
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1 rounded-lg border border-slate-800 bg-slate-900 p-2">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-100">{item.quantity} × {item.menuItem?.name}</span>
                          {item.notes && <span className="truncate text-[10px] italic text-amber-300">{item.notes}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Status Cycle Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                  {isPending && (
                    <button
                      onClick={() => handleOrderTransition(order.items, 'ACCEPTED')}
                      className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept Order</span>
                    </button>
                  )}

                  {isAccepted && (
                    <button
                      onClick={() => handleOrderTransition(order.items, 'PREPARING')}
                      className="flex-1 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
                    >
                      <Flame className="w-4 h-4" />
                      <span>Start Cooking (Locks Mod)</span>
                    </button>
                  )}

                  {isPreparing && (
                    <button
                      onClick={() => handleOrderTransition(order.items, 'READY')}
                      className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Mark Ready to Serve</span>
                    </button>
                  )}

                  {isReady && (
                    <button
                      onClick={() => handleOrderTransition(order.items, 'SERVED')}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Delivered / Served</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
