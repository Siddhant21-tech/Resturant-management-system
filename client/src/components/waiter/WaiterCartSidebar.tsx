import React from 'react';
import { Send } from 'lucide-react';
import { MenuItem } from '../../types';

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

interface WaiterCartSidebarProps {
  cart: CartItem[];
  roundNotes: string;
  onNotesChange: (notes: string) => void;
  onSubmitRound: () => void;
  isSimulatedOffline: boolean;
}

export const WaiterCartSidebar: React.FC<WaiterCartSidebarProps> = ({
  cart,
  roundNotes,
  onNotesChange,
  onSubmitRound,
  isSimulatedOffline,
}) => {
  if (cart.length === 0) return null;

  const totalItemCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const subtotal = cart.reduce((acc, i) => acc + i.quantity * i.menuItem.price, 0);

  return (
    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 space-y-3">
      <div className="flex items-center justify-between text-xs font-bold text-orange-300">
        <span>Current Round Cart ({totalItemCount} Items)</span>
        <span>Subtotal: ₹{subtotal}</span>
      </div>

      <input
        type="text"
        placeholder="Round notes (e.g. Serve coffee first, extra spicy)..."
        value={roundNotes}
        onChange={(e) => onNotesChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
      />

      <button
        onClick={onSubmitRound}
        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs shadow-lg shadow-orange-500/20 hover:brightness-110 flex items-center justify-center gap-2 transition-all"
      >
        <Send className="w-4 h-4" />
        <span>
          {isSimulatedOffline
            ? 'Enqueue Round Locally (Offline Mode)'
            : 'Send Round to Kitchen Stations'}
        </span>
      </button>
    </div>
  );
};
