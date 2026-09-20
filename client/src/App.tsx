import React, { useState, useEffect } from 'react';
import { Navbar, ActiveRole } from './components/Navbar';
import { WaiterView } from './views/WaiterView';
import { KitchenView } from './views/KitchenView';
import { CashierView } from './views/CashierView';
import { CustomerQRView } from './views/CustomerQRView';
import { AdminView } from './views/AdminView';
import { Restaurant, Branch } from './types';
import { fetchRestaurants } from './services/api';
import { getSocket, playNotificationSound } from './services/socket';
import {
  getOfflineQueue,
  flushOfflineQueue,
} from './services/offlineQueue';
import { Bell, CheckCircle2, AlertTriangle } from 'lucide-react';

export const App: React.FC = () => {
  const [currentRole, setRole] = useState<ActiveRole>('waiter');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  // Offline Simulation State
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);
  const [pendingOfflineCount, setPendingOfflineCount] = useState(0);

  // Live Toast Notification
  const [toast, setToast] = useState<{
    id: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning';
  } | null>(null);

  // Refresh trigger counter to re-fetch view data on socket events
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Check offline queue periodically
  useEffect(() => {
    const checkQueue = () => {
      const q = getOfflineQueue();
      setPendingOfflineCount(q.filter((i) => i.status === 'PENDING').length);
    };
    checkQueue();
    const interval = setInterval(checkQueue, 2000);
    return () => clearInterval(interval);
  }, []);

  // When simulated offline is turned OFF, flush queue automatically!
  useEffect(() => {
    if (!isSimulatedOffline) {
      flushOfflineQueue((synced) => {
        setToast({
          id: String(Date.now()),
          title: '📡 Offline Order Synced',
          message: `Order for ${synced.tableNumber} synced to kitchen successfully!`,
          type: 'success',
        });
        setRefreshTrigger((r) => r + 1);
      }).then(({ syncedCount }) => {
        if (syncedCount > 0) {
          const q = getOfflineQueue();
          setPendingOfflineCount(q.filter((i) => i.status === 'PENDING').length);
        }
      });
    }
  }, [isSimulatedOffline]);

  // Load initial restaurant & branches
  useEffect(() => {
    const init = async () => {
      try {
        const restList = await fetchRestaurants();
        setRestaurants(restList);
        if (restList.length > 0) {
          const r = restList[0];
          setSelectedRestaurant(r);
          if (r.branches && r.branches.length > 0) {
            setSelectedBranch(r.branches[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch restaurants:', err);
      }
    };
    init();
  }, []);

  // Initialize Socket.IO Listeners
  useEffect(() => {
    if (!selectedBranch) return;

    const socket = getSocket();
    socket.emit('join_branch', selectedBranch.id);

    // 1. New Order Created
    socket.on('order:created', (data: any) => {
      playNotificationSound('kitchen_order');
      setToast({
        id: String(Date.now()),
        title: `🔴 New Order: ${data.tableNumber}`,
        message: `Round #${data.round.roundNumber} submitted with ${data.round.items.length} items.`,
        type: 'warning',
      });
      setRefreshTrigger((prev) => prev + 1);
    });

    // 2. Kitchen Status Changed
    socket.on('item:status_changed', (data: any) => {
      if (data.status === 'ACCEPTED') {
        setToast({
          id: String(Date.now()),
          title: `🟡 Kitchen Accepted: ${data.itemName}`,
          message: `${data.tableNumber}: 3-minute modification window started.`,
          type: 'info',
        });
      }
      setRefreshTrigger((prev) => prev + 1);
    });

    // 3. Item Ready (Waiter alert)
    socket.on('waiter:item_ready', (data: any) => {
      playNotificationSound('item_ready');
      setToast({
        id: String(Date.now()),
        title: `🟢 Order Ready: ${data.tableNumber}`,
        message: `${data.quantity}x ${data.itemName} is ready for pickup!`,
        type: 'success',
      });
      setRefreshTrigger((prev) => prev + 1);
    });

    // 4. Bill Requested
    socket.on('bill:requested', (data: any) => {
      playNotificationSound('bill_request');
      setToast({
        id: String(Date.now()),
        title: `💳 Bill Requested: ${data.tableNumber}`,
        message: `Customer/Waiter requested invoice for session #${data.sessionCode}.`,
        type: 'warning',
      });
      setRefreshTrigger((prev) => prev + 1);
    });

    // 5. Payment Completed
    socket.on('payment:completed', (data: any) => {
      playNotificationSound('payment_success');
      setToast({
        id: String(Date.now()),
        title: `🎉 Payment Succeeded: ${data.tableNumber}`,
        message: `Invoice #${data.invoiceNumber} (₹${data.amount}) settled via ${data.method}. Table is now AVAILABLE.`,
        type: 'success',
      });
      setRefreshTrigger((prev) => prev + 1);
    });

    return () => {
      socket.off('order:created');
      socket.off('item:status_changed');
      socket.off('waiter:item_ready');
      socket.off('bill:requested');
      socket.off('payment:completed');
    };
  }, [selectedBranch]);

  // Dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!selectedBranch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-mono">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Connecting to Restaurant Management Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Universal Navbar & Role HUD */}
      <Navbar
        currentRole={currentRole}
        setRole={setRole}
        restaurant={selectedRestaurant}
        selectedBranch={selectedBranch}
        branches={selectedRestaurant?.branches || []}
        setBranch={setSelectedBranch}
        isSimulatedOffline={isSimulatedOffline}
        setIsSimulatedOffline={setIsSimulatedOffline}
        pendingOfflineCount={pendingOfflineCount}
      />

      {/* Main Role Experience Body */}
      <main className="flex-1 pb-12">
        {currentRole === 'waiter' && (
          <WaiterView
            branchId={selectedBranch.id}
            isSimulatedOffline={isSimulatedOffline}
            onRefreshTrigger={() => setRefreshTrigger((r) => r + 1)}
          />
        )}

        {currentRole === 'kitchen' && (
          <KitchenView
            branchId={selectedBranch.id}
            onRefreshTrigger={() => setRefreshTrigger((r) => r + 1)}
          />
        )}

        {currentRole === 'cashier' && (
          <CashierView
            branchId={selectedBranch.id}
            onRefreshTrigger={() => setRefreshTrigger((r) => r + 1)}
          />
        )}

        {currentRole === 'customer' && (
          <CustomerQRView
            branchId={selectedBranch.id}
            onRefreshTrigger={() => setRefreshTrigger((r) => r + 1)}
          />
        )}

        {currentRole === 'admin' && (
          <AdminView
            branchId={selectedBranch.id}
            restaurants={restaurants}
            selectedRestaurant={selectedRestaurant}
            onRefreshTrigger={() => setRefreshTrigger((r) => r + 1)}
          />
        )}
      </main>

      {/* Real-time Notification Toast popup */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-bounce">
          <div
            className={`p-4 rounded-2xl border shadow-2xl flex items-start gap-3 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'
                : toast.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-100'
                : 'bg-slate-900/90 border-slate-700 text-slate-100'
            }`}
          >
            <div className="mt-0.5">
              <Bell className="w-5 h-5 text-orange-400 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-extrabold text-xs tracking-tight">{toast.title}</h4>
              <p className="text-[11px] text-slate-300 mt-0.5">{toast.message}</p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
