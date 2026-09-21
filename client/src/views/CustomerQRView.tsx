import React, { useState, useEffect } from 'react';
import { Flame, Send } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Table, MenuItem, MenuCategory } from '../types';
import { fetchTables, fetchMenu, submitOrderRound } from '../services/api';

interface CustomerQRViewProps {
  branchId: string;
  onRefreshTrigger?: () => void;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}

export const CustomerQRView: React.FC<CustomerQRViewProps> = ({ branchId, onRefreshTrigger }) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [, setOrderPlaced] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');

  const loadData = async () => {
    try {
      const [tableList, menuList] = await Promise.all([
        fetchTables(branchId),
        fetchMenu(branchId),
      ]);
      setTables(tableList);
      setMenuCategories(menuList);

      // Default to Table 15 or first table
      const t15 = tableList.find((t: Table) => t.number === 'Table 15') || tableList[0];
      setSelectedTable((prev) =>
        prev ? tableList.find((t: Table) => t.id === prev.id) || t15 : t15
      );
    } catch (err) {
      console.error('Error loading customer menu:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [branchId, onRefreshTrigger]);

  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItem.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.menuItem.id === itemId) {
            const next = i.quantity + delta;
            return next > 0 ? { ...i, quantity: next } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleSubmitCustomerOrder = async () => {
    if (!selectedTable?.activeSession || cart.length === 0) {
      alert('Please wait for the dining session to be opened by staff or select active table.');
      return;
    }

    try {
      await submitOrderRound({
        sessionId: selectedTable.activeSession.id,
        source: 'CUSTOMER_QR',
        notes: specialInstructions ? `[Customer QR] ${specialInstructions}` : '[Customer QR Order]',
        items: cart.map((c) => ({
          menuItemId: c.menuItem.id,
          quantity: c.quantity,
        })),
      });

      setOrderPlaced(true);
      setCart([]);
      setSpecialInstructions('');
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit order');
    }
  };

  const allItems = menuCategories.flatMap((c) => c.items);
  const displayedItems =
    selectedCategory === 'all'
      ? allItems
      : menuCategories.find((c) => c.id === selectedCategory)?.items || [];

  const cartTotal = cart.reduce((acc, i) => acc + i.quantity * i.menuItem.price, 0);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Simulation Header */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>📲 Customer QR Experience</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                Direct to Central Engine
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Simulates a customer scanning Table QR code from their mobile device.
          </p>
        </div>

        {/* Table Selector Simulator */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Scanned QR on:</span>
          <select
            value={selectedTable?.id || ''}
            onChange={(e) => {
              const found = tables.find((t) => t.id === e.target.value);
              if (found) setSelectedTable(found);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-white focus:outline-none"
          >
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.number} ({t.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mobile Device Mockup Frame */}
      <div className="max-w-md mx-auto bg-slate-950 rounded-3xl border-4 border-slate-800 p-5 shadow-2xl space-y-5">
        {/* Restaurant Banner inside phone */}
        <div className="text-center space-y-1 pb-4 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 mx-auto flex items-center justify-center text-xl shadow-lg shadow-orange-500/20">
            🍽️
          </div>
          <h2 className="font-extrabold text-base text-white tracking-tight">The Velvet Bistro</h2>
          <div className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-slate-900 text-orange-400 border border-slate-800 font-mono">
            <span>📍 {selectedTable?.number || 'Table 15'}</span>
            {selectedTable?.activeSession && (
              <span>• #{selectedTable.activeSession.sessionCode}</span>
            )}
          </div>
        </div>

        {/* Live Order Timeline if order placed */}
        {selectedTable?.activeSession?.orders && selectedTable.activeSession.orders.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Live Order Tracking
              </span>
              <span className="font-mono text-orange-400">
                {selectedTable.activeSession.orders.length} Rounds
              </span>
            </div>

            <div className="space-y-1.5">
              {selectedTable.activeSession.orders.map((round) => (
                <div
                  key={round.id}
                  className="text-[11px] p-2 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
                >
                  <span className="text-slate-300">
                    Round #{round.roundNumber} ({round.items?.length || 0} items)
                  </span>
                  <span className="font-semibold text-emerald-400 uppercase text-[10px]">
                    {round.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          {menuCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === c.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Menu Items */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {displayedItems.map((item) => {
            const inCart = cart.find((c) => c.menuItem.id === item.id);

            return (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 flex gap-3 items-center"
              >
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs text-white truncate">{item.name}</h4>
                  <div className="font-mono text-xs font-bold text-orange-400 mt-0.5">
                    ₹{item.price}
                  </div>
                </div>

                <div>
                  {inCart ? (
                    <div className="flex items-center gap-2 bg-slate-800 px-2 py-1 rounded-xl">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="text-white font-bold text-xs px-1"
                      >
                        -
                      </button>
                      <span className="font-bold text-xs text-orange-400">{inCart.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="text-white font-bold text-xs px-1"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAddToCart(item)}
                      className="px-3 py-1 rounded-xl bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white text-xs font-bold transition-all"
                    >
                      + Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart Drawer in Phone View */}
        {cart.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-white">
              <span>{cart.reduce((a, b) => a + b.quantity, 0)} Items in Cart</span>
              <span className="font-mono text-orange-400 font-bold">₹{cartTotal}</span>
            </div>

            <input
              type="text"
              placeholder="Special instructions for kitchen..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none"
            />

            <button
              onClick={handleSubmitCustomerOrder}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs shadow-lg shadow-orange-500/20 hover:brightness-110 flex items-center justify-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Order to Restaurant Kitchen</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
