import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = true,
}) => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 border cursor-pointer ${
        isDark
          ? 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white shadow-sm'
          : 'bg-white/90 border-slate-300 text-slate-800 hover:bg-slate-100 hover:text-slate-950 shadow-sm'
      } ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle dark and light mode"
    >
      {isDark ? (
        <>
          <Sun className="h-4 w-4 text-amber-400" />
          {showLabel && <span>Light mode</span>}
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-indigo-600" />
          {showLabel && <span>Dark mode</span>}
        </>
      )}
    </button>
  );
};
