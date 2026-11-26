import { useState } from 'react';
import { Music, RotateCcw, Sliders, Volume2, VolumeX, X } from 'lucide-react';
import { GameSettings } from '../game/types';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export function SettingsModal({
  settings,
  onUpdateSettings,
  onResetProgress,
  onClose,
}: SettingsModalProps) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5">
      <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="font-display text-lg font-bold text-white tracking-wide">
              SETTINGS
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Sound Effects Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/75 border border-white/10">
            <div className="flex items-center gap-3">
              {settings.sfxEnabled ? (
                <Volume2 className="w-5 h-5 text-cyan-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-slate-500" />
              )}
              <div>
                <div className="text-sm font-bold text-white">Sound Effects</div>
                <div className="text-xs text-slate-400">Coins, jumps &amp; impacts</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  sfxEnabled: !settings.sfxEnabled,
                })
              }
              className={`min-w-[72px] min-h-[38px] rounded-lg text-xs font-bold ${
                settings.sfxEnabled
                  ? 'bg-cyan-400 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.sfxEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Music Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/75 border border-white/10">
            <div className="flex items-center gap-3">
              <Music
                className={`w-5 h-5 ${
                  settings.musicEnabled ? 'text-amber-400' : 'text-slate-500'
                }`}
              />
              <div>
                <div className="text-sm font-bold text-white">Background Music</div>
                <div className="text-xs text-slate-400">Arcade synth soundtrack</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onUpdateSettings({
                  ...settings,
                  musicEnabled: !settings.musicEnabled,
                })
              }
              className={`min-w-[72px] min-h-[38px] rounded-lg text-xs font-bold ${
                settings.musicEnabled
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {settings.musicEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Graphics Quality */}
          <div className="p-3 rounded-xl bg-slate-950/75 border border-white/10 space-y-2">
            <div className="text-sm font-bold text-white">Graphics Quality</div>
            <div className="grid grid-cols-2 gap-2">
              {(['high', 'balanced'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, quality: q })}
                  className={`min-h-[38px] rounded-lg text-xs font-bold capitalize ${
                    settings.quality === q
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {q === 'high' ? 'High (Shadows)' : 'Balanced (Mobile)'}
                </button>
              ))}
            </div>
          </div>

          {/* Swipe Sensitivity */}
          <div className="p-3 rounded-xl bg-slate-950/75 border border-white/10 space-y-2">
            <div className="text-sm font-bold text-white">Swipe Sensitivity</div>
            <div className="grid grid-cols-2 gap-2">
              {(['normal', 'high'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ ...settings, swipeSensitivity: s })
                  }
                  className={`min-h-[38px] rounded-lg text-xs font-bold capitalize ${
                    settings.swipeSensitivity === s
                      ? 'bg-cyan-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {s === 'normal' ? 'Standard' : 'High (Quick)'}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Save Data */}
          <div className="pt-2 border-t border-white/10">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full min-h-[42px] rounded-xl bg-slate-800 hover:bg-red-950/60 border border-white/10 hover:border-red-500/40 text-xs font-bold text-slate-300 hover:text-red-300 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Saved Progress</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetProgress();
                    setConfirmReset(false);
                  }}
                  className="flex-1 min-h-[42px] rounded-xl bg-red-500 hover:bg-red-400 text-xs font-bold text-white"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 min-h-[42px] rounded-xl bg-slate-800 text-xs font-bold text-slate-200"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
