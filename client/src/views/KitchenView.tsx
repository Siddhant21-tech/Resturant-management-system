import React, { useState, useEffect } from 'react';
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

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
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
              All ({tickets.length})
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((ticket) => {
            const tableNum = ticket.round?.session?.table?.number || 'Table ?';
            const sessionCode = ticket.round?.session?.sessionCode || '';
            const roundNum = ticket.round?.roundNumber || 1;
            const source = ticket.round?.source || 'WAITER';

            const isPending = ticket.status === 'PENDING';
            const isAccepted = ticket.status === 'ACCEPTED';
            const isPreparing = ticket.status === 'PREPARING';
            const isReady = ticket.status === 'READY';

            return (
              <div
                key={ticket.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isPending
                    ? 'bg-red-950/20 border-red-500/40 ring-1 ring-red-500/30 animate-pulse'
                    : isAccepted
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : isPreparing
                    ? 'bg-blue-950/20 border-blue-500/30'
                    : 'bg-emerald-950/20 border-emerald-500/30'
                }`}
              >
                {/* Header: Table, Round, Time */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-lg text-white">{tableNum}</span>
                      <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {sessionCode}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatElapsed(ticket.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 py-1.5">
                    <span>
                      Round #{roundNum} • Via {source}
                    </span>
                    {ticket.station && (
                      <span
                        className="px-2 py-0.5 rounded font-semibold text-[10px]"
                        style={{
                          backgroundColor: `${ticket.station.colorCode}20`,
                          color: ticket.station.colorCode,
                        }}
                      >
                        {ticket.station.name}
                      </span>
                    )}
                  </div>

                  {/* Item Content */}
                  <div className="py-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-extrabold text-base text-white">
                        {ticket.quantity} × {ticket.menuItem?.name}
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
                        {ticket.status}
                      </span>
                    </div>

                    {ticket.notes && (
                      <div className="mt-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-amber-300 font-medium italic">
                        Note: “{ticket.notes}”
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Cycle Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                  {isPending && (
                    <button
                      onClick={() => handleStatusTransition(ticket, 'ACCEPTED')}
                      className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Accept Ticket (Start 3m Timer)</span>
                    </button>
                  )}

                  {isAccepted && (
                    <button
                      onClick={() => handleStatusTransition(ticket, 'PREPARING')}
                      className="flex-1 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/20"
                    >
                      <Flame className="w-4 h-4" />
                      <span>Start Cooking (Locks Mod)</span>
                    </button>
                  )}

                  {isPreparing && (
                    <button
                      onClick={() => handleStatusTransition(ticket, 'READY')}
                      className="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Mark Ready to Serve</span>
                    </button>
                  )}

                  {isReady && (
                    <button
                      onClick={() => handleStatusTransition(ticket, 'SERVED')}
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
