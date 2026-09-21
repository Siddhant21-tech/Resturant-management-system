import React from 'react';
import { Bill } from '../../types';

interface CashierAdjustModalProps {
  isOpen: boolean;
  bill: Bill;
  adjustType: string;
  onAdjustTypeChange: (type: string) => void;
  discountAmount: number;
  onDiscountAmountChange: (amount: number) => void;
  adjustReason: string;
  onAdjustReasonChange: (reason: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export const CashierAdjustModal: React.FC<CashierAdjustModalProps> = ({
  isOpen,
  bill,
  adjustType,
  onAdjustTypeChange,
  discountAmount,
  onDiscountAmountChange,
  adjustReason,
  onAdjustReasonChange,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase font-bold">
            Cashier Authorized Modification
          </span>
          <h3 className="text-base font-bold text-white mt-1">
            Adjust Bill (Will increment to Version {bill.version + 1})
          </h3>
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Adjustment Type</label>
            <select
              value={adjustType}
              onChange={(e) => onAdjustTypeChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none"
            >
              <option value="DISCOUNT">Manager Discount</option>
              <option value="CUSTOMER_CORRECTION">Item Quantity Correction</option>
              <option value="COURTESY">Special Courtesy Waiver</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-400 font-semibold block">
                Discount Percentage (%)
              </label>
              {Number(discountAmount) > 0 && (
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  -₹{((Number(bill.subtotal) * Number(discountAmount)) / 100).toFixed(2)}
                </span>
              )}
            </div>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              placeholder="0"
              value={discountAmount === 0 ? '' : discountAmount}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const val = e.target.value;
                onDiscountAmountChange(val === '' ? 0 : Math.min(100, Math.max(0, Number(val))));
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">
              Mandatory Audit Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Customer correction / Manager approved 10% coupon..."
              value={adjustReason}
              onChange={(e) => onAdjustReasonChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none placeholder-slate-600"
            />
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
            onClick={onSave}
            className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all"
          >
            Save Version {bill.version + 1}
          </button>
        </div>
      </div>
    </div>
  );
};
