import React, { useState, useEffect, useMemo } from 'react';
import { ChefHat } from 'lucide-react';
import { KitchenStation, OrderItem } from '../types';
import { fetchStations, fetchKitchenTickets, updateItemStatus } from '../services/api';
import { playNotificationSound } from '../services/socket';
import { KitchenStationFilter } from '../components/kitchen/KitchenStationFilter';
import { KitchenOrderCard, KitchenGroupedOrder } from '../components/kitchen/KitchenOrderCard';

interface KitchenViewProps {
  branchId: string;
  onRefreshTrigger?: () => void;
}

export const KitchenView: React.FC<KitchenViewProps> = ({ branchId, onRefreshTrigger }) => {
  const [stations, setStations] = useState<KitchenStation[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<string>('all');
  const [tickets, setTickets] = useState<OrderItem[]>([]);
  const [, setLoading] = useState(true);

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

  // Calculates elapsed preparation time in a clear, human-readable format (e.g. "4m 08s")
  const formatElapsed = (createdAt: string) => {
    const orderCreatedAtTime = new Date(createdAt).getTime();
    const elapsedMilliseconds = currentTime - orderCreatedAtTime;
    const totalElapsedSeconds = Math.floor(elapsedMilliseconds / 1000);

    const minutes = Math.floor(totalElapsedSeconds / 60);
    const seconds = totalElapsedSeconds % 60;

    let paddedSeconds = seconds.toString();
    if (seconds < 10) {
      paddedSeconds = '0' + seconds;
    }

    return `${minutes}m ${paddedSeconds}s`;
  };

  const groupedOrders: KitchenGroupedOrder[] = useMemo(() => {
    const groups = new Map<string, KitchenGroupedOrder>();

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
      if (nextStatus === 'READY') {
        playNotificationSound('item_ready');
      }
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

        <KitchenStationFilter
          stations={stations}
          selectedStationId={selectedStationId}
          onSelectStation={setSelectedStationId}
          totalOrdersCount={groupedOrders.length}
          tickets={tickets}
        />
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
          {groupedOrders.map((order) => (
            <KitchenOrderCard
              key={order.id}
              order={order}
              elapsedText={formatElapsed(order.createdAt)}
              onTransition={handleOrderTransition}
            />
          ))}
        </div>
      )}
    </div>
  );
};
