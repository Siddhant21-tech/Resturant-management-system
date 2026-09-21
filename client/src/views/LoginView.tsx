import React, { FormEvent, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChefHat,
  Eye,
  EyeOff,
  KeyRound,
  ShieldCheck,
  Sparkles,
  Utensils,
} from 'lucide-react';
import { Branch, Restaurant, User } from '../types';
import {
  LoginRole,
  RoleOption,
  LoginRoleSelector,
} from '../components/login/LoginRoleSelector';
import { WallpaperSettingsModal } from '../components/login/WallpaperSettingsModal';
import { ThemeToggle } from '../components/common/ThemeToggle';

interface LoginViewProps {
  restaurant: Restaurant | null;
  branch: Branch;
  users: User[];
  isLoading: boolean;
  onLogin: (user: User, role: LoginRole) => void;
}

const roleOptions: RoleOption[] = [
  {
    id: 'manager',
    label: 'Manager',
    description: 'Full access',
    icon: <ShieldCheck className="h-5 w-5" />,
  },
  {
    id: 'waiter',
    label: 'Waiter',
    description: 'Floor service',
    icon: <Utensils className="h-5 w-5" />,
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    description: 'KDS station',
    icon: <ChefHat className="h-5 w-5" />,
  },
];

const roleToUserRole: Record<LoginRole, User['role']> = {
  manager: 'MANAGER',
  waiter: 'WAITER',
  kitchen: 'KITCHEN_STAFF',
};

export const LoginView: React.FC<LoginViewProps> = ({
  restaurant,
  users,
  isLoading,
  onLogin,
}) => {
  const [selectedRole, setSelectedRole] = useState<LoginRole>('waiter');
  const [operator, setOperator] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showWallpaperEditor, setShowWallpaperEditor] = useState(false);

  const wallpaperStorageKey = `restaurant-wallpaper:${restaurant?.id || 'default'}`;
  const opacityStorageKey = `restaurant-wallpaper-opacity:${restaurant?.id || 'default'}`;
  const blurStorageKey = `restaurant-wallpaper-blur:${restaurant?.id || 'default'}`;

  const [wallpaper, setWallpaper] = useState(() => {
    if (typeof window === 'undefined') return restaurant?.wallpaperUrl || '';
    return window.localStorage.getItem(wallpaperStorageKey) || restaurant?.wallpaperUrl || '';
  });
  const [wallpaperOpacity, setWallpaperOpacity] = useState(() => {
    if (typeof window === 'undefined') return 0.78;
    return Number(window.localStorage.getItem(opacityStorageKey) || 0.78);
  });
  const [wallpaperBlur, setWallpaperBlur] = useState(() => {
    if (typeof window === 'undefined') return 8;
    return Number(window.localStorage.getItem(blurStorageKey) || 8);
  });

  const availableUsers = useMemo(
    () => users.filter((user) => user.role === roleToUserRole[selectedRole]),
    [selectedRole, users]
  );
  const activeOperator = operator || availableUsers[0]?.name || '';
  const selectedRoleOption = roleOptions.find((role) => role.id === selectedRole)!;

  const selectRole = (role: LoginRole) => {
    setSelectedRole(role);
    setOperator('');
    setPin('');
    setError('');
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const user = availableUsers.find(
      (candidate) =>
        candidate.pinCode === pin.trim() &&
        (candidate.name.toLowerCase() === activeOperator.toLowerCase() ||
          candidate.email.toLowerCase() === activeOperator.toLowerCase())
    );

    if (!user) {
      setError('Check the operator name and PIN, then try again.');
      return;
    }

    setError('');
    onLogin(user, selectedRole);
  };

  const backdrop =
    wallpaper ||
    restaurant?.wallpaperUrl ||
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=2200&q=85';

  const handleWallpaperUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      setWallpaper(value);
      window.localStorage.setItem(wallpaperStorageKey, value);
      setShowWallpaperEditor(false);
    };
    reader.readAsDataURL(file);
  };

  const resetWallpaper = () => {
    setWallpaper('');
    window.localStorage.removeItem(wallpaperStorageKey);
  };

  const handleOpacityChange = (value: number) => {
    setWallpaperOpacity(value);
    window.localStorage.setItem(opacityStorageKey, String(value));
  };

  const handleBlurChange = (value: number) => {
    setWallpaperBlur(value);
    window.localStorage.setItem(blurStorageKey, String(value));
  };

  return (
    <main
      className="login-shell relative min-h-screen overflow-hidden bg-[#07131f] text-white"
      style={
        {
          '--login-backdrop': `url("${backdrop}")`,
          '--login-wallpaper-opacity': wallpaperOpacity,
          '--login-wallpaper-blur': `${wallpaperBlur}px`,
        } as React.CSSProperties
      }
    >
      <div className="login-backdrop" aria-hidden="true" />
      <div className="login-grid" aria-hidden="true" />
      <div className="login-glow login-glow-one" aria-hidden="true" />
      <div className="login-glow login-glow-two" aria-hidden="true" />

      <section className="login-stage relative z-10 flex min-h-screen flex-col items-center justify-center px-5 py-8">
        <div className="mb-3 flex w-full max-w-[374px] items-center justify-between gap-2 text-[10px] font-semibold">
          <div className="rounded-full border border-cyan-300/15 bg-[#071c2b]/80 px-3 py-1.5 text-slate-200 shadow-lg shadow-black/10 backdrop-blur-md">
            <span className="mr-1.5 text-cyan-300">▣</span>
            {restaurant?.name || 'Restaurant'}
          </div>
          <div className="flex items-center gap-1.5">
            <ThemeToggle showLabel={false} />
            <button
              type="button"
              onClick={() => setShowWallpaperEditor(true)}
              className="hidden rounded-full border border-cyan-300/15 bg-[#071c2b]/80 px-3 py-1.5 text-slate-300 shadow-lg shadow-black/10 backdrop-blur-md transition hover:border-emerald-300/60 hover:text-white sm:block"
              title="Customize this restaurant's login wallpaper"
            >
              <span className="mr-1.5 text-cyan-300">▧</span>
              Wallpaper
            </button>
          </div>
        </div>

        <div className="login-card w-full max-w-[374px] rounded-[14px] border border-slate-500/50 p-5 shadow-2xl shadow-black/50 sm:p-6">
          <div className="mb-4 text-center">
            <div className="mb-2 flex items-center justify-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500 text-sm font-black text-[#061a20] shadow-lg shadow-emerald-500/20">
                <Utensils className="h-4 w-4" />
              </div>
              <h1 className="text-lg font-black tracking-tight text-white">
                Gusto<span className="text-emerald-400">OS</span>
              </h1>
            </div>
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Restaurant platform
            </p>
            <p className="mt-2 text-[11px] font-semibold text-slate-300">
              Select your shift role to access station terminal
            </p>
          </div>

          <LoginRoleSelector
            roleOptions={roleOptions}
            selectedRole={selectedRole}
            onSelectRole={selectRole}
          />

          <form onSubmit={handleSubmit}>
            <label
              htmlFor="staff-operator"
              className="mb-1.5 block text-[10px] font-bold text-slate-300"
            >
              Staff Name / Operator ID
            </label>
            <input
              id="staff-operator"
              value={activeOperator}
              onChange={(event) => {
                setOperator(event.target.value);
                setError('');
              }}
              className="mb-3 h-9 w-full rounded-lg border border-slate-600 bg-[#060f1f]/80 px-3 text-xs font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
              placeholder="Enter your name or operator ID"
              required
            />

            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="staff-pin"
                className="block text-[10px] font-bold text-slate-300"
              >
                Station Passcode / PIN
              </label>
              <span className="text-[8px] font-bold text-emerald-400">PIN required</span>
            </div>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                id="staff-pin"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                autoComplete="current-password"
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value.replace(/\D/g, '').slice(0, 8));
                  setError('');
                }}
                placeholder="Enter your PIN"
                className="h-9 w-full rounded-lg border border-slate-600 bg-[#060f1f]/80 pl-9 pr-9 text-sm tracking-[0.35em] text-white outline-none transition placeholder:text-xs placeholder:tracking-normal placeholder:text-slate-600 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setOperator(availableUsers[0]?.name || '');
                setPin(availableUsers[0]?.pinCode || '');
                setError('');
              }}
              className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-slate-600 bg-slate-800/70 text-[10px] font-bold text-slate-300 transition hover:border-emerald-400/50 hover:text-emerald-300"
            >
              <Sparkles className="h-3 w-3 text-yellow-300" />
              Auto-fill demo credentials for {selectedRoleOption.label}
            </button>

            <div className="mt-2 min-h-4 text-[10px] text-rose-300" role="alert">
              {error}
            </div>

            <button
              type="submit"
              disabled={isLoading || users.length === 0}
              className="group mt-1 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-400 to-teal-500 text-xs font-black text-[#03231e] shadow-xl shadow-emerald-950/30 transition hover:from-emerald-300 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Connecting...' : `Sign in as ${selectedRoleOption.label}`}
              {!isLoading && (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between border-t border-slate-700/70 pt-3 text-[9px] text-slate-500">
            <span>
              <span className="text-emerald-400">▣</span> Shift Station Terminal
            </span>
            <span>v4.8 • GustoOS</span>
          </div>
        </div>
      </section>

      <WallpaperSettingsModal
        isOpen={showWallpaperEditor}
        restaurant={restaurant}
        wallpaper={wallpaper}
        wallpaperOpacity={wallpaperOpacity}
        wallpaperBlur={wallpaperBlur}
        onWallpaperChange={(val) => {
          setWallpaper(val);
          window.localStorage.setItem(wallpaperStorageKey, val);
        }}
        onOpacityChange={handleOpacityChange}
        onBlurChange={handleBlurChange}
        onReset={resetWallpaper}
        onClose={() => setShowWallpaperEditor(false)}
        onFileUpload={handleWallpaperUpload}
      />
    </main>
  );
};
