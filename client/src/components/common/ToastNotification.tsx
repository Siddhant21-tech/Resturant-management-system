import React from 'react';
import { Bell } from 'lucide-react';

export interface ToastData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

interface ToastNotificationProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toast, onDismiss }) => {
  if (!toast) return null;

  const colorStyles =
    toast.type === 'success'
      ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'
      : toast.type === 'warning'
      ? 'bg-amber-950/90 border-amber-500/50 text-amber-100'
      : 'bg-slate-900/90 border-slate-700 text-slate-100';

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-bounce">
      <div className={`p-4 rounded-2xl border shadow-2xl flex items-start gap-3 backdrop-blur-md ${colorStyles}`}>
        <div className="mt-0.5">
          <Bell className="w-5 h-5 text-orange-400 animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-extrabold text-xs tracking-tight">{toast.title}</h4>
          <p className="text-[11px] text-slate-300 mt-0.5">{toast.message}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white text-xs font-bold transition-colors"
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
