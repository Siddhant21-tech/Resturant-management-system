import React from 'react';

export type LoginRole = 'manager' | 'waiter' | 'kitchen';

export interface RoleOption {
  id: LoginRole;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface LoginRoleSelectorProps {
  roleOptions: RoleOption[];
  selectedRole: LoginRole;
  onSelectRole: (role: LoginRole) => void;
}

export const LoginRoleSelector: React.FC<LoginRoleSelectorProps> = ({
  roleOptions,
  selectedRole,
  onSelectRole,
}) => {
  const selectedRoleOption = roleOptions.find((role) => role.id === selectedRole)!;

  return (
    <>
      <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        <span>Sign in as</span>
        <span className="normal-case tracking-normal text-emerald-400">3 roles available</span>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1.5" role="tablist" aria-label="Staff role">
        {roleOptions.map((role) => {
          const isActive = role.id === selectedRole;
          return (
            <button
              key={role.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelectRole(role.id)}
              className={`relative flex min-h-[84px] flex-col items-center justify-center gap-1 rounded-xl border px-1.5 py-2 text-center transition duration-200 ${
                isActive
                  ? 'border-emerald-400 bg-emerald-400/10 text-emerald-100 shadow-lg shadow-emerald-950/25'
                  : 'border-slate-600/70 bg-slate-800/50 text-slate-400 hover:border-slate-400 hover:text-white'
              }`}
            >
              {isActive && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-black text-[#05221d]">
                  ✓
                </span>
              )}
              {role.icon}
              <span className="text-[11px] font-bold">{role.label}</span>
              <span className="text-[8px] text-slate-500">{role.description}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-600/70 bg-slate-800/60 px-2.5 py-1.5 text-[10px]">
        <span className="font-bold text-emerald-300">{selectedRoleOption.label}:</span>
        <span className="truncate px-2 text-slate-300">{selectedRoleOption.description}</span>
        <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
          {selectedRole === 'kitchen' ? 'KDS' : selectedRole === 'waiter' ? 'Floor' : 'Admin'}
        </span>
      </div>
    </>
  );
};
