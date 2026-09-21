import React, { useEffect, useState } from 'react';
import { Check, Edit3, Menu as MenuIcon, Plus, Save, X } from 'lucide-react';
import { MenuCategory, MenuItem } from '../types';
import { createMenuItem, fetchMenu, updateMenuItem } from '../services/api';

interface ManagerMenuViewProps {
  branchId: string;
}

interface NewItemFormState {
  categoryId: string;
  name: string;
  price: number;
  prepTimeMinutes: number;
  isVeg: boolean;
  isAvailable: boolean;
}

export const ManagerMenuView: React.FC<ManagerMenuViewProps> = ({ branchId }) => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: '', price: 0 });
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState<NewItemFormState>({
    categoryId: '',
    name: '',
    price: 0,
    prepTimeMinutes: 15,
    isVeg: true,
    isAvailable: true,
  });

  const loadMenu = async () => {
    const list = await fetchMenu(branchId);
    setCategories(list);
  };

  useEffect(() => {
    loadMenu().catch(console.error);
  }, [branchId]);

  const beginEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setDraft({ name: item.name, price: Number(item.price) });
  };

  const saveEdit = async (item: MenuItem) => {
    setSaving(true);
    try {
      await updateMenuItem(item.id, draft);
      setEditingId(null);
      await loadMenu();
    } catch (error: any) {
      alert(error.message || 'Unable to update menu');
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      await updateMenuItem(item.id, { isAvailable: !item.isAvailable });
      await loadMenu();
    } catch (error: any) {
      alert(error.message || 'Unable to update item availability');
    }
  };

  const handleAddItem = async () => {
    if (!newItem.categoryId || !newItem.name.trim() || newItem.price < 0) return;
    setSaving(true);
    try {
      await createMenuItem(branchId, {
        ...newItem,
        name: newItem.name.trim(),
      });
      setShowAdd(false);
      setNewItem({
        categoryId: '',
        name: '',
        price: 0,
        prepTimeMinutes: 15,
        isVeg: true,
        isAvailable: true,
      });
      await loadMenu();
    } catch (error: any) {
      alert(error.message || 'Unable to add menu item');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-slate-900/80 p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
            Manager workspace
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-black text-white">
            <MenuIcon className="h-6 w-6 text-emerald-400" />
            Menu Management
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Update item names, prices, and availability for this branch.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setNewItem((item) => ({ ...item, categoryId: categories[0]?.id || '' }));
            setShowAdd(true);
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-black text-slate-950 hover:bg-emerald-300 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add menu item
        </button>
      </div>

      {/* Category List */}
      <div className="space-y-4">
        {categories.map((category) => (
          <section key={category.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-black text-white">{category.name}</h2>
              <span className="text-xs text-slate-500">{category.items.length} items</span>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              {category.items.map((item) => {
                const isEditing = editingId === item.id;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <input
                          value={draft.name}
                          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                          className="h-9 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                        />
                      ) : (
                        <p className="truncate text-sm font-bold text-white">{item.name}</p>
                      )}
                      <p className="mt-1 text-[11px] text-slate-500">
                        {item.isVeg ? 'Vegetarian' : 'Non-vegetarian'} • {item.station?.name || 'Unassigned'} •{' '}
                        {item.prepTimeMinutes || 15} min
                      </p>
                    </div>

                    {isEditing ? (
                      <input
                        type="number"
                        min="0"
                        value={draft.price}
                        onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })}
                        className="h-9 w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 text-sm text-white focus:outline-none focus:border-emerald-400"
                      />
                    ) : (
                      <span className="font-mono text-sm text-white">₹{Number(item.price).toFixed(2)}</span>
                    )}

                    <button
                      type="button"
                      onClick={() => (isEditing ? saveEdit(item) : beginEdit(item))}
                      disabled={saving}
                      className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:text-white transition-colors"
                      title={isEditing ? 'Save changes' : 'Edit item'}
                    >
                      {isEditing ? <Save className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleAvailability(item)}
                      className={`flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-bold transition-colors ${
                        item.isAvailable
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {item.isAvailable && <Check className="h-3 w-3" />}
                      {item.isAvailable ? 'Available' : 'Unavailable'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Add Item Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Menu setup
                </p>
                <h2 className="mt-1 text-lg font-black text-white">Add menu item</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                Category
                <select
                  value={newItem.categoryId}
                  onChange={(event) => setNewItem({ ...newItem, categoryId: event.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white focus:outline-none focus:border-emerald-400"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold text-slate-300">
                Item name
                <input
                  value={newItem.name}
                  onChange={(event) => setNewItem({ ...newItem, name: event.target.value })}
                  placeholder="e.g. Garlic Naan"
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white focus:outline-none focus:border-emerald-400"
                />
              </label>

              <label className="block text-xs font-bold text-slate-300">
                Price (₹)
                <input
                  type="number"
                  min="0"
                  value={newItem.price}
                  onChange={(event) => setNewItem({ ...newItem, price: Number(event.target.value) })}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white focus:outline-none focus:border-emerald-400"
                />
              </label>

              <label className="block text-xs font-bold text-slate-300">
                Preparation time (minutes)
                <input
                  type="number"
                  min="1"
                  max="240"
                  value={newItem.prepTimeMinutes}
                  onChange={(event) =>
                    setNewItem({ ...newItem, prepTimeMinutes: Number(event.target.value) })
                  }
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-white focus:outline-none focus:border-emerald-400"
                />
              </label>

              <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-3">
                <div>
                  <p className="text-xs font-bold text-slate-200">Item type</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {newItem.isVeg ? 'Vegetarian' : 'Non-vegetarian'}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={newItem.isVeg}
                  onClick={() => setNewItem({ ...newItem, isVeg: !newItem.isVeg })}
                  className={`relative h-7 w-14 rounded-full p-1 transition-colors ${
                    newItem.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                >
                  <span
                    className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      newItem.isVeg ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                  <span className="sr-only">Switch between vegetarian and non-vegetarian</span>
                </button>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <input
                  type="checkbox"
                  checked={newItem.isAvailable}
                  onChange={(event) => setNewItem({ ...newItem, isAvailable: event.target.checked })}
                  className="accent-emerald-400"
                />
                Available immediately
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-lg px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddItem}
                disabled={saving || !newItem.name.trim()}
                className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-black text-slate-950 disabled:opacity-40 hover:bg-emerald-300 transition-colors"
              >
                {saving ? 'Adding...' : 'Add item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
