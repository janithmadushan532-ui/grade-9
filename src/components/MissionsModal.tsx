import { useState } from 'react';
import { Award, Check, Coins, Target, X } from 'lucide-react';
import { ACHIEVEMENTS, MISSIONS } from '../game/constants';
import { getAchievementProgress } from '../game/storage';
import { SaveData } from '../game/types';

interface MissionsModalProps {
  save: SaveData;
  onClaimMission: (missionId: string) => void;
  onClaimAchievement: (achievementId: string) => void;
  onClose: () => void;
}

export function MissionsModal({
  save,
  onClaimMission,
  onClaimAchievement,
  onClose,
}: MissionsModalProps) {
  const [tab, setTab] = useState<'missions' | 'achievements'>('missions');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5">
      <div className="w-full max-w-lg max-h-[86dvh] flex flex-col bg-slate-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
          <h2 className="font-display text-lg sm:text-xl font-bold text-white tracking-wide">
            MISSIONS &amp; ACHIEVEMENTS
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Missions"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5 p-2.5 bg-slate-950/60 border-b border-white/10">
          <button
            type="button"
            onClick={() => setTab('missions')}
            className={`min-h-[38px] rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 ${
              tab === 'missions'
                ? 'bg-cyan-400 text-slate-950'
                : 'bg-slate-800/80 text-slate-300'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Missions</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('achievements')}
            className={`min-h-[38px] rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 ${
              tab === 'achievements'
                ? 'bg-amber-400 text-slate-950'
                : 'bg-slate-800/80 text-slate-300'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Achievements</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto modal-scroll p-3.5 space-y-2.5">
          {tab === 'missions' &&
            MISSIONS.map((def) => {
              const state = save.missions.find((m) => m.id === def.id) || {
                id: def.id,
                progress: 0,
                claimed: false,
              };
              const val = Math.min(def.target, state.progress);
              const pct = Math.round((val / def.target) * 100);
              const ready = val >= def.target && !state.claimed;

              return (
                <div
                  key={def.id}
                  className="p-3 rounded-xl bg-slate-950/75 border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 text-sm font-bold text-white">
                      <span className="truncate">{def.title}</span>
                      <span className="font-mono-num text-xs text-slate-300 shrink-0">
                        {val}/{def.target}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden mt-2">
                      <div
                        className="h-full rounded-full bg-cyan-400 transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onClaimMission(def.id)}
                    disabled={!ready}
                    className={`min-h-[40px] px-3 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 ${
                      state.claimed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : ready
                          ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {state.claimed ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Done</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5" />
                        <span className="font-mono-num">{def.reward}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}

          {tab === 'achievements' &&
            ACHIEVEMENTS.map((def) => {
              const claimed = save.claimedAchievements.includes(def.id);
              const progress = Math.min(
                def.target,
                getAchievementProgress(save, def.id),
              );
              const pct = Math.round((progress / def.target) * 100);
              const ready = progress >= def.target && !claimed;

              return (
                <div
                  key={def.id}
                  className="p-3 rounded-xl bg-slate-950/75 border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-white truncate">
                        {def.title}
                      </span>
                      <span className="font-mono-num text-xs text-slate-300 shrink-0">
                        {progress}/{def.target}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {def.description}
                    </p>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden mt-2">
                      <div
                        className="h-full rounded-full bg-amber-400 transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onClaimAchievement(def.id)}
                    disabled={!ready}
                    className={`min-h-[40px] px-3 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 ${
                      claimed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                        : ready
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                          : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {claimed ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Claimed</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5" />
                        <span className="font-mono-num">{def.reward}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
