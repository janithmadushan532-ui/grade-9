import { Coins, Home, RotateCcw, Trophy } from 'lucide-react';
import { RunSummary } from '../game/types';

interface GameOverModalProps {
  summary: RunSummary;
  highScore: number;
  totalCoins: number;
  onRestart: () => void;
  onMainMenu: () => void;
}

export function GameOverModal({
  summary,
  highScore,
  totalCoins,
  onRestart,
  onMainMenu,
}: GameOverModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="w-full max-w-sm bg-slate-900 border border-white/15 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="text-center space-y-1">
          {summary.isNewHighScore && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-display text-xs font-bold tracking-wider mb-1">
              <Trophy className="w-3.5 h-3.5" />
              <span>NEW HIGH SCORE!</span>
            </div>
          )}
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-wider">
            RUN COMPLETE
          </h2>
        </div>

        {/* Score Card */}
        <div className="bg-slate-950/85 border border-white/10 rounded-xl p-4 space-y-3">
          <div className="text-center">
            <div className="text-xs font-semibold text-slate-400">FINAL SCORE</div>
            <div className="font-display text-4xl font-bold text-white tabular-nums mt-0.5">
              {summary.score.toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center">
            <div>
              <div className="text-[11px] text-slate-400">Distance</div>
              <div className="font-mono-num text-sm font-bold text-cyan-300 tabular-nums">
                {summary.distance}m
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Coins</div>
              <div className="font-mono-num text-sm font-bold text-amber-300 tabular-nums">
                +{summary.coinsEarned}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Best</div>
              <div className="font-mono-num text-sm font-bold text-white tabular-nums">
                {highScore.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Total Coin Balance */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs">
          <span className="text-slate-300 font-semibold">Total Bank</span>
          <span className="flex items-center gap-1.5 font-mono-num text-sm font-bold text-amber-300 tabular-nums">
            <Coins className="w-4 h-4 text-amber-400" />
            {totalCoins.toLocaleString()}
          </span>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onRestart}
            className="w-full min-h-[52px] rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display text-lg font-bold tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
          >
            <RotateCcw className="w-5 h-5" />
            <span>RUN AGAIN</span>
          </button>

          <button
            type="button"
            onClick={onMainMenu}
            className="w-full min-h-[46px] rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-white/10 font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <Home className="w-4 h-4" />
            <span>Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
