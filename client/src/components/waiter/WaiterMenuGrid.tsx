import React from 'react';
import { MenuItem, MenuCategory } from '../../types';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

interface WaiterMenuGridProps {
  categories: MenuCategory[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  cart: CartItem[];
  onAddToCart: (item: MenuItem) => void;
  onUpdateCartQuantity: (menuItemId: string, delta: number) => void;
}

export const WaiterMenuGrid: React.FC<WaiterMenuGridProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  cart,
  onAddToCart,
  onUpdateCartQuantity,
}) => {
  const allItems = categories.flatMap((c) => c.items);
  const displayedItems =
    selectedCategory === 'all'
      ? allItems
      : categories.find((c) => c.id === selectedCategory)?.items || [];

  return (
    <div className="space-y-4">
      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => onSelectCategory('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedCategory === 'all'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          All Items
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelectCategory(c.id)}
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
                    <h3 className="font-bold text-xs text-white truncate">{item.name}</h3>
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
                        onClick={() => onUpdateCartQuantity(item.id, -1)}
                        className="text-slate-300 hover:text-white font-bold text-xs px-1"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold text-orange-400">
                        {inCart.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateCartQuantity(item.id, 1)}
                        className="text-slate-300 hover:text-white font-bold text-xs px-1"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onAddToCart(item)}
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
    </div>
  );
};
