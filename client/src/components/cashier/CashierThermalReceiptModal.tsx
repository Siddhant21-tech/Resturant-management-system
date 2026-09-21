import React from 'react';
import { Bill, DiningSession } from '../../types';
import { printThermalReceipt } from '../../services/thermalPrinter';

interface CashierThermalReceiptModalProps {
  isOpen: boolean;
  bill: Bill;
  session: DiningSession;
  onClose: () => void;
}

export const CashierThermalReceiptModal: React.FC<CashierThermalReceiptModalProps> = ({
  isOpen,
  bill,
  session,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="thermal-receipt bg-white text-slate-950 rounded-2xl p-6 max-w-sm w-full font-mono text-xs space-y-4 shadow-2xl">
        {/* Header */}
        <div className="text-center border-b pb-3 border-dashed border-slate-400 space-y-1">
          <div className="receipt-logo mx-auto" aria-label="Velvet Bistro logo">
            <svg viewBox="0 0 64 64" role="img" aria-hidden="true">
              <path d="M11 25h42v6H11zM17 31h30l-3 20H20z" fill="currentColor" />
              <path d="M24 13h16v12H24zM20 9h24v5H20z" fill="currentColor" />
              <path d="M28 17h8v8h-8z" fill="white" />
            </svg>
          </div>
          <h2 className="text-base font-black uppercase tracking-wider">The Velvet Bistro</h2>
          <p className="text-[10px] text-slate-600">Downtown Flagship • GSTIN: 07AAAAA0000A1Z5</p>
          <p className="text-[10px] text-slate-600">42 Promenade Avenue, Connaught Place</p>
          <div className="pt-2 text-[11px] font-bold">TAX INVOICE #{bill.invoiceNumber}</div>
        </div>

        {/* Meta */}
        <div className="flex justify-between text-[11px] border-b pb-2 border-dashed border-slate-400">
          <div>
            <div>{session.table?.number}</div>
            <div>Session: {session.sessionCode}</div>
          </div>
          <div className="text-right">
            <div>{new Date().toLocaleDateString()}</div>
            <div>{new Date().toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-1 py-1 border-b border-dashed border-slate-400">
          {bill.items?.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.quantity}x {item.name}
              </span>
              <span>₹{item.totalPrice}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>₹{bill.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>GST (5.0%):</span>
            <span>₹{bill.taxAmount.toFixed(2)}</span>
          </div>
          {bill.discountAmount > 0 && (
            <div className="flex justify-between font-bold">
              <span>Discount:</span>
              <span>-₹{bill.discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-800">
            <span>TOTAL:</span>
            <span>₹{bill.finalAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="text-center text-[10px] text-slate-500 pt-3 border-t border-dashed border-slate-400">
          Thank you for dining with us! <br />
          Please visit again.
        </div>

        <div className="flex justify-end gap-2 pt-2 print:hidden">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-800 font-bold hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
          <button
            onClick={printThermalReceipt}
            className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-bold hover:bg-black transition-colors"
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
};
