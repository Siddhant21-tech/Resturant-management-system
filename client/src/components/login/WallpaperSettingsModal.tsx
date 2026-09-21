import React from 'react';
import { Upload, X } from 'lucide-react';
import { Restaurant } from '../../types';

interface WallpaperSettingsModalProps {
  isOpen: boolean;
  restaurant: Restaurant | null;
  wallpaper: string;
  wallpaperOpacity: number;
  wallpaperBlur: number;
  onWallpaperChange: (url: string) => void;
  onOpacityChange: (opacity: number) => void;
  onBlurChange: (blur: number) => void;
  onReset: () => void;
  onClose: () => void;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const WallpaperSettingsModal: React.FC<WallpaperSettingsModalProps> = ({
  isOpen,
  restaurant,
  wallpaper,
  wallpaperOpacity,
  wallpaperBlur,
  onWallpaperChange,
  onOpacityChange,
  onBlurChange,
  onReset,
  onClose,
  onFileUpload,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-slate-600 bg-[#0b1b2d] p-5 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-300">
              {restaurant?.name || 'Restaurant'}
            </p>
            <h2 className="mt-1 text-lg font-black text-white">Customize login wallpaper</h2>
            <p className="mt-1 text-xs text-slate-400">
              Saved only for this restaurant on this browser.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Close wallpaper editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-600 bg-slate-900/60 text-xs font-bold text-slate-300 transition hover:border-emerald-400 hover:text-emerald-300">
          <Upload className="h-5 w-5" />
          Upload hotel image
          <input
            type="file"
            accept="image/*"
            onChange={onFileUpload}
            className="hidden"
          />
        </label>

        <div className="my-3 flex items-center gap-2 text-[10px] text-slate-500">
          <span className="h-px flex-1 bg-slate-700" />
          or use image URL
          <span className="h-px flex-1 bg-slate-700" />
        </div>

        <input
          value={wallpaper.startsWith('data:') ? '' : wallpaper}
          onChange={(event) => onWallpaperChange(event.target.value)}
          placeholder="https://..."
          className="h-10 w-full rounded-lg border border-slate-600 bg-[#060f1f] px-3 text-xs text-white outline-none focus:border-emerald-400"
        />

        <div className="mt-4 space-y-4">
          <label className="block text-xs font-bold text-slate-300">
            Wallpaper opacity{' '}
            <span className="float-right text-emerald-300">
              {Math.round(wallpaperOpacity * 100)}%
            </span>
            <input
              type="range"
              min="0.2"
              max="1"
              step="0.01"
              value={wallpaperOpacity}
              onChange={(event) => onOpacityChange(Number(event.target.value))}
              className="mt-2 w-full accent-emerald-400"
            />
          </label>

          <label className="block text-xs font-bold text-slate-300">
            Wallpaper blur{' '}
            <span className="float-right text-emerald-300">{wallpaperBlur}px</span>
            <input
              type="range"
              min="0"
              max="24"
              step="1"
              value={wallpaperBlur}
              onChange={(event) => onBlurChange(Number(event.target.value))}
              className="mt-2 w-full accent-emerald-400"
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg px-3 py-2 text-xs font-bold text-slate-400 hover:text-rose-300 transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-black text-[#03231e] hover:bg-emerald-300 transition-colors"
          >
            Save wallpaper
          </button>
        </div>
      </div>
    </div>
  );
};
