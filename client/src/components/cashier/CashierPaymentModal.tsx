import React from 'react';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import { Bill } from '../../types';

interface CashierPaymentModalProps {
  isOpen: boolean;
  bill: Bill;
  paymentMethod: 'CASH' | 'UPI' | 'CARD';
  onPaymentMethodChange: (method: 'CASH' | 'UPI' | 'CARD') => void;
  cashTendered: number;
  onCashTenderedChange: (amount: number) => void;
  paymentProcessing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const CashierPaymentModal: React.FC<CashierPaymentModalProps> = ({
  isOpen,
  bill,
  paymentMethod,
  onPaymentMethodChange,
  cashTendered,
  onCashTenderedChange,
  paymentProcessing,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Settle Bill Payment</h3>
            <p className="text-xs text-slate-400 font-mono">Invoice #{bill.invoiceNumber}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Amount Due</span>
            <div className="font-mono text-lg font-black text-orange-400">
              ₹{bill.finalAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Payment Method Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {(['UPI', 'CARD', 'CASH'] as const).map((method) => (
            <button
              key={method}
              onClick={() => onPaymentMethodChange(method)}
              className={`py-2 rounded-lg text-xs font-extrabold transition-all ${
                paymentMethod === method
                  ? 'bg-orange-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {method}
            </button>
          ))}
        </div>

        {/* UPI Dynamic QR View */}
        {paymentMethod === 'UPI' && (
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-3">
            <div className="w-36 h-36 bg-white p-2 mx-auto rounded-xl shadow-lg flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=upi://pay?pa=velvetbistro@icici%26am=${bill.finalAmount}%26cu=INR`}
                alt="UPI Payment QR"
                className="w-full h-full"
              />
            </div>
            <div className="text-xs text-slate-400">
              Scan with GPay, PhonePe, or Paytm <br />
              <span className="font-mono text-slate-300">velvetbistro@icici</span>
            </div>
          </div>
        )}

        {/* Cash Tendered Input */}
        {paymentMethod === 'CASH' && (
          <div className="space-y-2 text-xs">
            <label className="text-slate-400 font-semibold block">Cash Tendered (₹)</label>
            <input
              type="number"
              placeholder="e.g. 1200"
              value={cashTendered || ''}
              onChange={(e) => onCashTenderedChange(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:outline-none text-base"
            />
            {cashTendered >= bill.finalAmount && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex justify-between font-mono font-bold">
                <span>Change Due to Customer:</span>
                <span>₹{(cashTendered - bill.finalAmount).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Card Machine Authorization */}
        {paymentMethod === 'CARD' && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-2">
            <CreditCard className="w-8 h-8 text-blue-400 mx-auto" />
            <p className="text-xs text-slate-300 font-semibold">
              Tap or Insert Card on POS Terminal
            </p>
            <p className="text-[11px] text-slate-500">Supports Visa, Mastercard, RuPay & Amex</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={paymentProcessing}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Payment & Liberate Table</span>
          </button>
        </div>
      </div>
    </div>
  );
};
