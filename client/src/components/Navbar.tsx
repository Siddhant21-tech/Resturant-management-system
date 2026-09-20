import React from 'react';
import {
  Utensils,
  ChefHat,
  CreditCard,
  QrCode,
  ShieldAlert,
  Wifi,
  WifiOff,
  Store,
  BellRing,
  LogOut,
} from 'lucide-react';
import { Branch, Restaurant } from '../types';

export type ActiveRole = 'waiter' | 'kitchen' | 'cashier' | 'customer' | 'admin';

interface NavbarProps {
  currentRole: ActiveRole;
  setRole: (role: ActiveRole) => void;
  restaurant: Restaurant | null;
  selectedBranch: Branch | null;
  branches: Branch[];
  setBranch: (branch: Branch) => void;
  isSimulatedOffline: boolean;
  setIsSimulatedOffline: (val: boolean) => void;
  pendingOfflineCount: number;
  allowedRoles: ActiveRole[];
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  setRole,
  restaurant,
  selectedBranch,
  branches,
  setBranch,
  isSimulatedOffline,
  setIsSimulatedOffline,
  pendingOfflineCount,
  allowedRoles,
  onLogout,
}) => {
  const roles: { id: ActiveRole; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'waiter',
      label: 'Waiter Tablet',
      icon: <Utensils className="w-4 h-4" />,
      desc: 'Table floor, sessions, rounds, 3-min edit timer',
    },
    {
      id: 'kitchen',
      label: 'Kitchen KDS',
      icon: <ChefHat className="w-4 h-4" />,
      desc: 'Station routing, live order tickets, status cycle',
    },
    {
      id: 'cashier',
      label: 'Cashier & POS',
      icon: <CreditCard className="w-4 h-4" />,
      desc: 'Bill versions, audit trail, multi-method payment',
    },
    {
      id: 'customer',
      label: 'Customer QR',
      icon: <QrCode className="w-4 h-4" />,
      desc: 'Mobile self-ordering directly to central engine',
    },
    {
      id: 'admin',
      label: 'Admin & Audit',
      icon: <ShieldAlert className="w-4 h-4" />,
      desc: 'Multi-tenancy, stations, live audit trail, revenue',
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      {/* Top Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white font-bold text-lg">
            🍽️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-white">
                {restaurant?.name || 'The Velvet Bistro'}
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                SaaS Engine
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Store className="w-3 h-3 text-slate-500" />
              <select
                value={selectedBranch?.id || ''}
                onChange={(e) => {
                  const found = branches.find((b) => b.id === e.target.value);
                  if (found) setBranch(found);
                }}
                className="bg-transparent border-none text-slate-300 font-medium hover:text-white cursor-pointer focus:outline-none text-xs pr-1"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-white">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Controls & Offline Simulation */}
        <div className="flex items-center gap-3">
          {/* Offline Simulator Switch */}
          <button
            onClick={() => setIsSimulatedOffline(!isSimulatedOffline)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isSimulatedOffline
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 ring-2 ring-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
            title="Simulate Wi-Fi drop to test offline queueing and recovery sync"
          >
            {isSimulatedOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>Offline Mode (Simulated)</span>
                {pendingOfflineCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full font-bold text-[10px]">
                    {pendingOfflineCount} queued
                  </span>
                )}
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Online (Live Sync)</span>
              </>
            )}
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-rose-400/50 hover:text-rose-300"
            title="Sign out of this station"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* Role Switcher Tab Bar */}
      <div className="bg-slate-950/60 border-t border-slate-800/80 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto scrollbar-none py-1.5 gap-1">
          <div className="flex items-center gap-1.5">
            {roles.filter((role) => allowedRoles.includes(role.id)).map((r) => {
              const active = currentRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setRole(r.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 ring-1 ring-orange-400/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                  title={r.desc}
                >
                  {r.icon}
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono">WS: Connected</span>
          </div>
        </div>
      </div>
    </header>
  );
};
