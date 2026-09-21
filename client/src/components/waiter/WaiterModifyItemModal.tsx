import React from 'react';
import { AlertCircle } from 'lucide-react';
import { OrderItem } from '../../types';

interface WaiterModifyItemModalProps {
  item: OrderItem | null;
  newQuantity: number;
  onQuantityChange: (qty: number) => void;
  modError: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const WaiterModifyItemModal: React.FC<WaiterModifyItemModalProps> = ({
  item,
  newQuantity,
  onQuantityChange,
  modError,
  onClose,
  onConfirm,
}) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
        <div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
            3-Minute Modification Window
          </span>
          <h3 className="text-base font-bold text-white mt-1">
            Modify: {item.menuItem?.name}
          </h3>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-slate-400">Adjust Quantity</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onQuantityChange(Math.max(1, newQuantity - 1))}
              className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
            >
              -
            </button>
            <span className="font-bold text-lg text-white font-mono">{newQuantity}</span>
            <button
              onClick={() => onQuantityChange(newQuantity + 1)}
              className="w-8 h-8 rounded-lg bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
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
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
