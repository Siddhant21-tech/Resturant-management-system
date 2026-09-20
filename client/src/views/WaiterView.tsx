import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  Send,
  Edit2,
  Trash2,
  Receipt,
  Flame,
  Coffee,
  Sparkles,
  Lock,
  Unlock,
} from 'lucide-react';
import { Table, DiningSession, MenuItem, MenuCategory, OrderRound, OrderItem } from '../types';
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

  // Timer tick for live 3-minute countdown calculation
  const [currentTime, setCurrentTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load tables and menu
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

  // Add Item to Cart
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

  // Submit Order Round (Handles online API or Offline Queue)
  const handleSubmitOrderRound = async () => {
    if (!activeSession || cart.length === 0) return;

    if (isSimulatedOffline) {
      // Offline fallback: enqueue in browser storage
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

  // Waiters can edit until preparation is complete.
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

  // Submit item modification
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

  // Cancel item
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

  // Request Bill
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

  const allItems = menuCategories.flatMap((c) => c.items);
  const displayedItems =
    selectedCategory === 'all'
      ? allItems
      : menuCategories.find((c) => c.id === selectedCategory)?.items || [];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Waiter Tablet Header Banner */}
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
        {/* Left Column: Floor Map Tables (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
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
                  onClick={() => handleSelectTable(table)}
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

        {/* Right Column: Active Table Console & Multi-Round Builder (8 cols) */}
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
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-xs shadow-lg shadow-orange-500/20 hover:brightness-110"
                    >
                      <Plus className="w-4 h-4" />
                      Open Dining Session
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handleRequestBill}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 font-semibold text-xs hover:bg-amber-500/20"
                      >
                        <Receipt className="w-4 h-4" />
                        Request Bill
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tab Navigation if session is active: [Order Rounds] vs [Add Items] */}
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

              {/* TAB 1: ORDER ROUNDS LIST WITH 3-MINUTE MODIFICATION RULE */}
              {activeSession && activeTab === 'rounds' && (
                <div className="space-y-4">
                  {(!activeSession.orders || activeSession.orders.length === 0) ? (
                    <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl">
                      <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No orders placed yet for this session.</p>
                      <button
                        onClick={() => setActiveTab('add_items')}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs text-orange-400 font-semibold hover:underline"
                      >
                        Take First Order <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    activeSession.orders.map((round) => (
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
                                  {/* Modification window badge */}
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

                                  {/* Edit & Cancel Buttons (Only if permitted) */}
                                  {!isCancelled && countdown.allowed && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          setModifyingItem(item);
                                          setNewQuantity(item.quantity);
                                          setModError(null);
                                        }}
                                        className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700"
                                        title="Modify Quantity"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleCancelItem(item)}
                                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
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
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: MENU CATALOG & ORDER BUILDER */}
              {(!activeSession || activeTab === 'add_items') && (
                <div className="space-y-4">
                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        selectedCategory === 'all'
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      All Items
                    </button>
                    {menuCategories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCategory(c.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                          selectedCategory === c.id
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>

                  {/* Menu Items Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                    {displayedItems.map((item) => {
                      const inCart = cart.find((c) => c.menuItem.id === item.id);

                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex gap-3 hover:border-slate-700 transition-all"
                        >
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <h3 className="font-bold text-xs text-white truncate">
                                  {item.name}
                                </h3>
                                <span className="font-mono text-xs font-bold text-orange-400">
                                  ₹{item.price}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                {item.description}
                              </p>
                            </div>

                            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60">
                              {/* Station Tag */}
                              {item.station && (
                                <span
                                  className="text-[10px] font-medium"
                                  style={{ color: item.station.colorCode }}
                                >
                                  → {item.station.name}
                                </span>
                              )}

                              {/* Add / Stepper */}
                              {inCart ? (
                                <div className="flex items-center gap-2 bg-slate-800 px-2 py-0.5 rounded-lg">
                                  <button
                                    onClick={() => handleUpdateCartQuantity(item.id, -1)}
                                    className="text-slate-300 hover:text-white font-bold text-xs px-1"
                                  >
                                    -
                                  </button>
                                  <span className="text-xs font-bold text-orange-400">
                                    {inCart.quantity}
                                  </span>
                                  <button
                                    onClick={() => handleUpdateCartQuantity(item.id, 1)}
                                    className="text-slate-300 hover:text-white font-bold text-xs px-1"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleAddToCart(item)}
                                  className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white text-xs font-semibold transition-all"
                                >
                                  + Add
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Cart Summary & Submit Round Action */}
                  {cart.length > 0 && (
                    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-orange-300">
                        <span>
                          Current Round Cart ({cart.reduce((acc, i) => acc + i.quantity, 0)} Items)
                        </span>
                        <span>
                          Subtotal: ₹
                          {cart.reduce((acc, i) => acc + i.quantity * i.menuItem.price, 0)}
                        </span>
                      </div>

                      <input
                        type="text"
                        placeholder="Round notes (e.g. Serve coffee first, extra spicy)..."
                        value={roundNotes}
                        onChange={(e) => setRoundNotes(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      />

                      <button
                        onClick={handleSubmitOrderRound}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs shadow-lg shadow-orange-500/20 hover:brightness-110 flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>
                          {isSimulatedOffline
                            ? 'Enqueue Round Locally (Offline Mode)'
                            : 'Send Round to Kitchen Stations'}
                        </span>
                      </button>
                    </div>
                  )}
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
      {showNewSessionModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Open Session for {selectedTable.number}
            </h3>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Number of Guests</label>
              <div className="flex items-center gap-3">
                {[1, 2, 4, 6, 8].map((num) => (
                  <button
                    key={num}
                    onClick={() => setGuestCount(num)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      guestCount === num
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewSessionModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleStartSession}
                className="px-4 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600"
              >
                Confirm & Open
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modification Modal (3-Minute Rule) */}
      {modifyingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                3-Minute Modification Window
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                Modify: {modifyingItem.menuItem?.name}
              </h3>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400">Adjust Quantity</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNewQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold"
                >
                  -
                </button>
                <span className="font-bold text-lg text-white font-mono">{newQuantity}</span>
                <button
                  onClick={() => setNewQuantity((q) => q + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {modError && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModifyingItem(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmModification}
                className="px-4 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
