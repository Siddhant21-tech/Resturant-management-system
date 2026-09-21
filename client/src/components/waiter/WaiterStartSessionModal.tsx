import React from 'react';
import { Table } from '../../types';

interface WaiterStartSessionModalProps {
  isOpen: boolean;
  table: Table | null;
  guestCount: number;
  onGuestCountChange: (count: number) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export const WaiterStartSessionModal: React.FC<WaiterStartSessionModalProps> = ({
  isOpen,
  table,
  guestCount,
  onGuestCountChange,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !table) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
        <h3 className="text-base font-bold text-white">
          Open Session for {table.number}
        </h3>
        <div className="space-y-2">
          <label className="text-xs text-slate-400">Number of Guests</label>
          <div className="flex items-center gap-3">
            {[1, 2, 4, 6, 8].map((num) => (
              <button
                key={num}
                onClick={() => onGuestCountChange(num)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  guestCount === num
                    ? 'bg-orange-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

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
            Confirm & Open
          </button>
        </div>
      </div>
    </div>
  );
};
