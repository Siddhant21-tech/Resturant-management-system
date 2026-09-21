import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, ActiveRole } from './components/Navbar';
import { WaiterView } from './views/WaiterView';
import { KitchenView } from './views/KitchenView';
import { CashierView } from './views/CashierView';
import { CustomerQRView } from './views/CustomerQRView';
import { AdminView } from './views/AdminView';
import { LoginView } from './views/LoginView';
import { Restaurant, Branch, User } from './types';
import { fetchRestaurants, fetchUsers } from './services/api';
import { useSocketNotifications } from './hooks/useSocketNotifications';
import { useOfflineSimulator } from './hooks/useOfflineSimulator';
import { ToastNotification } from './components/common/ToastNotification';
import { useTheme } from './context/ThemeContext';

export const App: React.FC = () => {
  const { isDark } = useTheme();
  const [currentRole, setRole] = useState<ActiveRole>('waiter');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(null);
  const [isLoadingStaff, setIsLoadingStaff] = useState(false);

  // Refresh trigger counter to re-fetch view data on socket events
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const handleRefresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Socket.IO event listeners & notification sounds
  const { toast, setToast } = useSocketNotifications({
    selectedBranch,
    currentRole,
    onRefresh: handleRefresh,
  });

  // Offline simulation state & automatic queue synchronization
  const {
    isSimulatedOffline,
    setIsSimulatedOffline,
    pendingOfflineCount,
  } = useOfflineSimulator({
    onOrderSynced: (synced) => {
      setToast({
        id: String(Date.now()),
        title: '📡 Offline Order Synced',
        message: `Order for ${synced.tableNumber} synced to kitchen successfully!`,
        type: 'success',
      });
    },
    onRefresh: handleRefresh,
  });

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

  // Load staff users whenever selected branch changes
  useEffect(() => {
    if (!selectedBranch) return;

    setIsLoadingStaff(true);
    fetchUsers(selectedBranch.id)
      .then(setStaffUsers)
      .catch((err) => console.error('Failed to fetch staff:', err))
      .finally(() => setIsLoadingStaff(false));
  }, [selectedBranch]);

  // Loading screen before connecting to branch
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

  // Authentication Gate (Manager / Waiter / Kitchen)
  if (!authenticatedUser) {
    return (
      <LoginView
        restaurant={selectedRestaurant}
        branch={selectedBranch}
        users={staffUsers}
        isLoading={isLoadingStaff}
        onLogin={(user, role) => {
          setAuthenticatedUser(user);
          setRole(role === 'manager' ? 'admin' : role);
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
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
        allowedRoles={[currentRole]}
        onLogout={() => {
          setAuthenticatedUser(null);
          setRole('waiter');
        }}
      />

      {/* Main Role Experience Body */}
      <main className="flex-1 pb-12">
        {currentRole === 'waiter' && (
          <WaiterView
            branchId={selectedBranch.id}
            isSimulatedOffline={isSimulatedOffline}
            onRefreshTrigger={handleRefresh}
          />
        )}

        {currentRole === 'kitchen' && (
          <KitchenView
            branchId={selectedBranch.id}
            onRefreshTrigger={handleRefresh}
          />
        )}

        {currentRole === 'cashier' && (
          <CashierView
            branchId={selectedBranch.id}
            onRefreshTrigger={handleRefresh}
          />
        )}

        {currentRole === 'customer' && (
          <CustomerQRView
            branchId={selectedBranch.id}
            onRefreshTrigger={handleRefresh}
          />
        )}

        {currentRole === 'admin' && (
          <AdminView
            branchId={selectedBranch.id}
            restaurants={restaurants}
            selectedRestaurant={selectedRestaurant}
            onRefreshTrigger={handleRefresh}
          />
        )}
      </main>

      {/* Real-time Notification Toast popup */}
      <ToastNotification toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};
