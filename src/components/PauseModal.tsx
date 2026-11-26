import { Home, Play, RotateCcw, Settings } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onMainMenu: () => void;
}

export function PauseModal({
  onResume,
  onRestart,
  onOpenSettings,
  onMainMenu,
}: PauseModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-white/15 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold text-white tracking-wider">
            PAUSED
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Catch your breath before the next sprint
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full min-h-[50px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display text-lg font-bold tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>RESUME</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="w-full min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-white/10 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restart Run</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-white/10 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="w-full min-h-[46px] rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-white/10 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
