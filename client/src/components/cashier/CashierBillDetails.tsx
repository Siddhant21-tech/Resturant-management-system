import React from 'react';
import { History, Printer, CreditCard } from 'lucide-react';
import { Bill, DiningSession } from '../../types';

interface CashierBillDetailsProps {
  bill: Bill;
  session: DiningSession;
  history: Bill[];
  onOpenAdjustModal: () => void;
  onOpenPrintModal: () => void;
  onOpenPaymentModal: () => void;
}

export const CashierBillDetails: React.FC<CashierBillDetailsProps> = ({
  bill,
  session,
  history,
  onOpenAdjustModal,
  onOpenPrintModal,
  onOpenPaymentModal,
}) => {
  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 space-y-6">
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white">{session.table?.number}</h2>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-orange-400 font-bold">
              Session #{session.sessionCode}
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
              Invoice #{bill.invoiceNumber}
            </span>
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
              Version {bill.version}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Waiter: {session.waiter?.name || 'Rahul'} • Opened:{' '}
            {new Date(session.startedAt).toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold border ${
              bill.status === 'PAID'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
            }`}
          >
            {bill.status === 'PAID' ? '✓ PAID & CLOSED' : 'PAYMENT PENDING'}
          </span>
        </div>
      </div>

      {/* Itemized Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Bill Line Items (Aggregated across rounds)
        </h3>

        <div className="bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800/80">
          <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-900/50">
            <span className="col-span-6">Item</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-2 text-right">Price</span>
            <span className="col-span-2 text-right">Amount</span>
          </div>

          {bill.items?.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-12 px-4 py-3 text-xs text-slate-200 items-center"
            >
              <span className="col-span-6 font-semibold text-white">{item.name}</span>
              <span className="col-span-2 text-center font-mono">{item.quantity}</span>
              <span className="col-span-2 text-right font-mono text-slate-400">
                ₹{item.unitPrice}
              </span>
              <span className="col-span-2 text-right font-mono font-bold text-white">
                ₹{item.totalPrice}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Breakdown & Audit History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Audit & Adjustments History */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>Bill Revision & Audit Trail</span>
          </h3>

          <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-3 space-y-2 max-h-40 overflow-y-auto">
            {history.length === 1 && (
              <div className="text-[11px] text-slate-500 italic">
                Initial Version 1 generated from order items. No modifications yet.
              </div>
            )}

            {history.map((hist) => (
              <div
                key={hist.id}
                className="text-xs p-2 rounded-lg bg-slate-900/80 border border-slate-800/60 space-y-1 font-mono"
              >
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="font-bold text-purple-400">Version {hist.version}</span>
                  <span>{new Date(hist.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="text-slate-300">Total: ₹{hist.finalAmount}</div>
                {hist.adjustments?.map((adj) => (
                  <div
                    key={adj.id}
                    className="text-[11px] text-amber-400/90 pt-1 border-t border-slate-800/50"
                  >
                    Reason: “{adj.reason}” by {adj.userId} ({adj.oldValue} → {adj.newValue})
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Subtotal, Tax, Final Amount Box */}
        <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-4 space-y-2 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Subtotal</span>
            <span className="font-mono">₹{bill.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>GST (5.0%)</span>
            <span className="font-mono">₹{bill.taxAmount.toFixed(2)}</span>
          </div>
          {bill.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-400 font-semibold">
              <span>Discount Applied</span>
              <span className="font-mono">-₹{bill.discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-800 flex justify-between text-base font-black text-white">
            <span>Grand Total</span>
            <span className="font-mono text-orange-400">₹{bill.finalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons: [Edit Bill] [Print] [Payment] */}
      <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-800">
        {bill.status !== 'PAID' && (
          <button
            onClick={onOpenAdjustModal}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
          >
            Edit Bill / Discount
          </button>
        )}

        <button
          onClick={onOpenPrintModal}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all"
        >
          <Printer className="w-4 h-4" />
          Print Tax Invoice
        </button>

        {bill.status !== 'PAID' && (
          <button
            onClick={onOpenPaymentModal}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 text-white font-extrabold text-xs shadow-lg shadow-orange-500/20 flex items-center gap-2 transition-all"
          >
            <CreditCard className="w-4 h-4" />
            Process Payment (₹{bill.finalAmount})
          </button>
        )}
      </div>
    </div>
  );
};
