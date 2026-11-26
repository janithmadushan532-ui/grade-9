import { Check, Coins, Gift, Sparkles, X } from 'lucide-react';
import { DAILY_REWARDS } from '../game/constants';
import { canClaimDailyReward } from '../game/storage';
import { SaveData } from '../game/types';

interface DailyRewardModalProps {
  save: SaveData;
  onClaim: () => void;
  onClose: () => void;
}

export function DailyRewardModal({
  save,
  onClaim,
  onClose,
}: DailyRewardModalProps) {
  const claimable = canClaimDailyReward(save);
  const currentDayIdx = save.dailyRewardStreak % 7;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5">
      <div className="w-full max-w-md bg-slate-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-lg font-bold text-white tracking-wide">
              DAILY REWARDS
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Daily Rewards"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            {DAILY_REWARDS.map((item, idx) => {
              const isClaimed = idx < currentDayIdx;
              const isToday = idx === currentDayIdx;
              const isJackpot = idx === 6;

              return (
                <div
                  key={item.day}
                  className={`p-2.5 rounded-xl border text-center flex flex-col items-center justify-center gap-1 ${
                    isJackpot ? 'col-span-3 py-3' : ''
                  } ${
                    isToday && claimable
                      ? 'bg-amber-500/20 border-amber-400 text-white'
                      : isClaimed
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950/75 border-white/10 text-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider">
                    {item.label}
                  </div>
                  <div className="flex items-center gap-1 font-mono-num text-sm font-bold text-amber-300">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>{item.coins}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-cyan-300 font-mono-num">
                    <Sparkles className="w-3 h-3" />
                    <span>+{item.hoverboards} Board{item.hoverboards > 1 ? 's' : ''}</span>
                  </div>
                  {isClaimed && (
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                      <Check className="w-3 h-3" /> Claimed
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onClaim}
            disabled={!claimable}
            className={`w-full min-h-[48px] rounded-xl font-display text-base font-bold tracking-wider transition-transform active:scale-95 ${
              claimable
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                : 'bg-slate-800 text-slate-400 cursor-not-allowed'
            }`}
          >
            {claimable ? 'CLAIM TODAY’S REWARD' : 'COME BACK TOMORROW'}
          </button>
        </div>
      </div>
    </div>
  );
}
