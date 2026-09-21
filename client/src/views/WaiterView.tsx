import React, { useState, useEffect } from 'react';
import { Users, Plus, Receipt } from 'lucide-react';
import { Table, DiningSession, MenuItem, MenuCategory, OrderItem } from '../types';
import {
  fetchTables,
  fetchMenu,
  createSession,
  submitOrderRound,
  modifyOrderItem,
  cancelOrderItem,
  requestBill,
} from '../services/api';
import { enqueueOfflineOrder } from '../services/offlineQueue';

import { WaiterTableGrid } from '../components/waiter/WaiterTableGrid';
import { WaiterRoundsTimeline } from '../components/waiter/WaiterRoundsTimeline';
import { WaiterMenuGrid } from '../components/waiter/WaiterMenuGrid';
import { WaiterCartSidebar } from '../components/waiter/WaiterCartSidebar';
import { WaiterModifyItemModal } from '../components/waiter/WaiterModifyItemModal';
import { WaiterStartSessionModal } from '../components/waiter/WaiterStartSessionModal';

interface WaiterViewProps {
  branchId: string;
  isSimulatedOffline: boolean;
  onRefreshTrigger?: () => void;
}

export const WaiterView: React.FC<WaiterViewProps> = ({
  branchId,
  isSimulatedOffline,
  onRefreshTrigger,
}) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [activeSession, setActiveSession] = useState<DiningSession | null>(null);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // New Session Modal State
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [guestCount, setGuestCount] = useState(2);

  // Cart for Adding Items / New Round
  const [cart, setCart] = useState<{ menuItem: MenuItem; quantity: number; notes: string }[]>([]);
  const [roundNotes, setRoundNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'rounds' | 'add_items'>('rounds');

  // Modification dialog state
  const [modifyingItem, setModifyingItem] = useState<OrderItem | null>(null);
  const [newQuantity, setNewQuantity] = useState(1);
  const [modError, setModError] = useState<string | null>(null);

  // Live timer tick for real-time calculation
  const [, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load tables and menu catalog
  const loadData = async () => {
    try {
      setLoading(true);
      const [tableList, menuList] = await Promise.all([
        fetchTables(branchId),
        fetchMenu(branchId),
      ]);
      setTables(tableList);
      setMenuCategories(menuList);

      // Auto-select Table 15 or first active table if available
      if (!selectedTable && tableList.length > 0) {
        const table15 = tableList.find((t: Table) => t.number === 'Table 15') || tableList[0];
        setSelectedTable(table15);
        if (table15.activeSession) {
          setActiveSession(table15.activeSession);
        }
      } else if (selectedTable) {
        const refreshed = tableList.find((t: Table) => t.id === selectedTable.id);
        if (refreshed) {
          setSelectedTable(refreshed);
          setActiveSession(refreshed.activeSession || null);
        }
      }
    } catch (err) {
      console.error('Error loading waiter data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [branchId, onRefreshTrigger]);

  const handleSelectTable = (table: Table) => {
    setSelectedTable(table);
    setActiveSession(table.activeSession || null);
    setCart([]);
    setActiveTab(table.activeSession ? 'rounds' : 'add_items');
  };

  const handleStartSession = async () => {
    if (!selectedTable) return;
    try {
      const session = await createSession({
        branchId,
        tableId: selectedTable.id,
        guestCount,
      });
      setShowNewSessionModal(false);
      await loadData();
      setActiveSession(session);
      setActiveTab('add_items');
    } catch (err: any) {
      alert(err.message || 'Failed to start session');
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItem.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { menuItem: item, quantity: 1, notes: '' }];
    });
  };

  const handleUpdateCartQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.menuItem.id === menuItemId) {
            const next = i.quantity + delta;
            return next > 0 ? { ...i, quantity: next } : null;
          }
          return i;
        })
        .filter(Boolean) as any
    );
  };

  const handleSubmitOrderRound = async () => {
    if (!activeSession || cart.length === 0) return;

    if (isSimulatedOffline) {
      enqueueOfflineOrder({
        sessionId: activeSession.id,
        source: 'WAITER',
        tableNumber: selectedTable?.number || '',
        items: cart.map((c) => ({
          menuItemId: c.menuItem.id,
          name: c.menuItem.name,
          quantity: c.quantity,
          notes: c.notes,
        })),
      });

      alert(
        `📡 Offline Mode Active: Order Round enqueued locally for ${selectedTable?.number}. It will sync automatically once internet returns!`
      );
      setCart([]);
      setActiveTab('rounds');
      return;
    }

    try {
      await submitOrderRound({
        sessionId: activeSession.id,
        source: 'WAITER',
        notes: roundNotes,
        items: cart.map((c) => ({
          menuItemId: c.menuItem.id,
          quantity: c.quantity,
          notes: c.notes,
        })),
      });

      setCart([]);
      setRoundNotes('');
      setActiveTab('rounds');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to send order round');
    }
  };

  const handleConfirmModification = async () => {
    if (!modifyingItem) return;
    setModError(null);
    try {
      await modifyOrderItem(modifyingItem.id, { quantity: newQuantity });
      setModifyingItem(null);
      await loadData();
    } catch (err: any) {
      setModError(err.message || 'Cannot modify this item');
    }
  };

  const handleCancelItem = async (item: OrderItem) => {
    const reason = prompt('Please specify reason for cancellation:', 'Customer changed mind');
    if (!reason) return;
    try {
      await cancelOrderItem(item.id, reason);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Cannot cancel item');
    }
  };

  const handleRequestBill = async () => {
    if (!activeSession) return;
    try {
      await requestBill(activeSession.id);
      alert(`Bill requested for ${selectedTable?.number}. Cashier has been notified!`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to request bill');
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>📱 Waiter Tablet</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-medium">
                Multi-Waiter Session Engine
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Multiple staff can append order rounds to table sessions; order changes remain available until preparation is complete.
          </p>
        </div>

        {/* Selected Table Quick Glance */}
        {selectedTable && (
          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
            <div className="text-right">
              <div className="text-xs text-slate-400">Current Table</div>
              <div className="text-sm font-bold text-white">{selectedTable.number}</div>
            </div>
            <span
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${
                selectedTable.status === 'AVAILABLE'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : selectedTable.status === 'BILL_REQUESTED'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
              }`}
            >
              {selectedTable.status.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>

      {/* Main Grid: Floor Map & Active Table Session Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Floor Map Tables */}
        <div className="lg:col-span-4 space-y-4">
          <WaiterTableGrid
            tables={tables}
            selectedTable={selectedTable}
            onSelectTable={handleSelectTable}
          />
        </div>

        {/* Right Column: Active Table Console */}
        <div className="lg:col-span-8 space-y-4">
          {selectedTable ? (
            <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-5">
              {/* Session Status Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center font-bold text-lg">
                    {selectedTable.number.replace('Table ', 'T')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base">
                        {selectedTable.number}
                      </span>
                      {activeSession && (
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-orange-400 font-semibold">
                          Session #{activeSession.sessionCode}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {activeSession ? (
                        <span>
                          {activeSession.guestCount} Guests • Waiter:{' '}
                          {activeSession.waiter?.name || 'Rahul Sharma'}
                        </span>
                      ) : (
                        <span>Table is currently vacant</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Session Action Buttons */}
                <div className="flex items-center gap-2">
                  {!activeSession ? (
                    <button
                      onClick={() => setShowNewSessionModal(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-xs shadow-lg shadow-orange-500/20 hover:brightness-110 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Open Dining Session
                    </button>
                  ) : (
                    <button
                      onClick={handleRequestBill}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold text-xs hover:bg-amber-500/20 transition-all"
                    >
                      <Receipt className="w-4 h-4" />
                      Request Bill
                    </button>
                  )}
                </div>
              </div>

              {/* Tab Navigation */}
              {activeSession && (
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <button
                    onClick={() => setActiveTab('rounds')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'rounds'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Order Rounds ({activeSession.orders?.length || 0})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('add_items')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'add_items'
                        ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Food & Drinks {cart.length > 0 && `(${cart.length})`}</span>
                  </button>
                </div>
              )}

              {/* TAB 1: ORDER ROUNDS TIMELINE */}
              {activeSession && activeTab === 'rounds' && (
                <WaiterRoundsTimeline
                  orders={activeSession.orders || []}
                  onAddItemsClick={() => setActiveTab('add_items')}
                  onModifyItem={(item) => {
                    setModifyingItem(item);
                    setNewQuantity(item.quantity);
                    setModError(null);
                  }}
                  onCancelItem={handleCancelItem}
                />
              )}

              {/* TAB 2: MENU CATALOG & ORDER BUILDER */}
              {(!activeSession || activeTab === 'add_items') && (
                <div className="space-y-4">
                  <WaiterMenuGrid
                    categories={menuCategories}
                    selectedCategory={selectedCategory}
                    onSelectCategory={setSelectedCategory}
                    cart={cart}
                    onAddToCart={handleAddToCart}
                    onUpdateCartQuantity={handleUpdateCartQuantity}
                  />
                  <WaiterCartSidebar
                    cart={cart}
                    roundNotes={roundNotes}
                    onNotesChange={setRoundNotes}
                    onSubmitRound={handleSubmitOrderRound}
                    isSimulatedOffline={isSimulatedOffline}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-800">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Select a table on the floor map to begin.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Session Modal */}
      <WaiterStartSessionModal
        isOpen={showNewSessionModal}
        table={selectedTable}
        guestCount={guestCount}
        onGuestCountChange={setGuestCount}
        onClose={() => setShowNewSessionModal(false)}
        onConfirm={handleStartSession}
      />

      {/* Modification Modal (3-Minute Rule) */}
      <WaiterModifyItemModal
        item={modifyingItem}
        newQuantity={newQuantity}
        onQuantityChange={setNewQuantity}
        modError={modError}
        onClose={() => setModifyingItem(null)}
        onConfirm={handleConfirmModification}
      />
    </div>
  );
};
