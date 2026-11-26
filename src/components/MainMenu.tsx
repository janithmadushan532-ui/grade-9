import {
  Award,
  BookOpen,
  ChevronRight,
  Coins,
  Gift,
  Globe,
  Play,
  Settings,
  Trophy,
  User,
  Zap,
} from 'lucide-react';
import { ALL_MCQ_QUESTIONS, getUnitInfo } from '../data/mcqBank';
import { CHARACTERS, WORLDS } from '../game/constants';
import { SaveData } from '../game/types';

interface MainMenuProps {
  save: SaveData;
  dailyAvailable: boolean;
  claimableMissionsCount: number;
  onPlay: () => void;
  onOpenUnitSelect: () => void;
  onOpenShop: (tab: 'characters' | 'worlds' | 'upgrades') => void;
  onOpenMissions: () => void;
  onOpenDaily: () => void;
  onOpenSettings: () => void;
}

export function MainMenu({
  save,
  dailyAvailable,
  claimableMissionsCount,
  onPlay,
  onOpenUnitSelect,
  onOpenShop,
  onOpenMissions,
  onOpenDaily,
  onOpenSettings,
}: MainMenuProps) {
  const activeWorld = WORLDS[save.selectedWorld];
  const activeChar = CHARACTERS[save.selectedCharacter];
  const activeUnit = getUnitInfo(save.selectedScienceUnit);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-6 safe-top safe-bottom">
      {/* Top Bar: Title + Resources + Utility Buttons */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          {/* Brand Title & Saved Starting World */}
          <button
            type="button"
            onClick={() => onOpenShop('worlds')}
            className="pointer-events-auto text-left bg-slate-950/85 hover:bg-slate-900 border border-white/15 hover:border-emerald-400/50 rounded-xl px-3.5 py-2 shadow-lg transition-colors"
          >
            <h1 className="font-display text-lg sm:text-2xl font-bold tracking-wider text-white whitespace-nowrap leading-none">
              POWER RUNNER <span className="text-amber-400">3D</span>
            </h1>
            <div className="flex items-center gap-2 text-[11px] text-slate-300 mt-1">
              <span className="font-semibold text-emerald-300">
                Start: {activeWorld.name}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeChar.name}</span>
            </div>
          </button>

          {/* Coins & Best Score */}
          <div className="flex items-center gap-2">
            <div className="bg-slate-950/85 border border-white/15 rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg">
              <Coins className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-mono-num text-sm sm:text-base font-bold text-amber-300 tabular-nums">
                {save.coins.toLocaleString()}
              </span>
            </div>

            <div className="hidden xs:flex sm:flex bg-slate-950/85 border border-white/15 rounded-xl px-3 py-2 items-center gap-1.5 shadow-lg">
              <Trophy className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="font-mono-num text-sm sm:text-base font-bold text-white tabular-nums">
                {save.highScore.toLocaleString()}
              </span>
            </div>

            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Settings"
              className="pointer-events-auto min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-950/85 border border-white/15 text-slate-200 hover:text-white hover:bg-slate-900 active:scale-95 transition-transform shadow-lg"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Secondary Quick Row: High Score on narrow screens + Daily + Missions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex sm:hidden bg-slate-950/80 border border-white/15 rounded-lg px-2.5 py-1.5 items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs text-slate-300">Best</span>
            <span className="font-mono-num text-xs font-bold text-white tabular-nums">
              {save.highScore.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onOpenDaily}
              className={`pointer-events-auto min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-transform whitespace-nowrap ${
                dailyAvailable
                  ? 'bg-amber-500 text-slate-950 border-amber-300'
                  : 'bg-slate-950/85 text-slate-200 border-white/15 hover:bg-slate-900'
              }`}
            >
              <Gift className="w-4 h-4 shrink-0" />
              <span>{dailyAvailable ? 'Claim Daily' : 'Daily'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenMissions}
              className="pointer-events-auto min-h-[40px] px-3 py-1.5 rounded-xl bg-slate-950/85 border border-white/15 text-xs font-bold text-slate-100 hover:bg-slate-900 flex items-center gap-1.5 shadow-md active:scale-95 transition-transform whitespace-nowrap"
            >
              <Award className="w-4 h-4 text-cyan-400" />
              <span>Missions</span>
              {claimableMissionsCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono-num text-[10px] font-extrabold">
                  {claimableMissionsCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Dock: Keeps center 3D runner unobstructed */}
      <div className="pointer-events-auto w-full max-w-md mx-auto flex flex-col gap-2.5">
        {/* Controls hint */}
        <p className="text-center text-[11px] font-medium text-slate-200 bg-slate-950/65 border border-white/10 rounded-lg py-1 px-3 mx-auto">
          Swipe or Arrow Keys to Steer · Jump · Slide · Double-Tap for Board
        </p>

        {/* Active Grade 9 Science Unit Selector */}
        <button
          type="button"
          onClick={onOpenUnitSelect}
          className="w-full min-h-[46px] rounded-xl bg-slate-950/90 border border-cyan-400/40 hover:border-cyan-300 px-3 py-2 flex items-center justify-between gap-2.5 text-left active:scale-[0.99] transition-transform shadow-md"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                Grade 9 Science MCQ Unit
              </div>
              <div className="font-sinhala text-xs sm:text-sm font-bold text-white truncate">
                {activeUnit
                  ? `ඒකකය ${String(activeUnit.id).padStart(2, '0')}: ${activeUnit.titleSi} (${activeUnit.questionCount} MCQs)`
                  : `සියලුම ඒකක · All Units (${ALL_MCQ_QUESTIONS.length} MCQs)`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-bold text-amber-300 shrink-0">
            <span>Unit</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </button>

        {/* Primary Play CTA */}
        <button
          type="button"
          onClick={onPlay}
          className="w-full min-h-[56px] rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display text-xl sm:text-2xl font-bold tracking-wider flex items-center justify-center gap-2.5 shadow-xl active:scale-[0.98] transition-transform focus-visible:outline-2 focus-visible:outline-white"
        >
          <Play className="w-6 h-6 fill-slate-950" />
          <span>RUN NOW</span>
        </button>

        {/* 3-Tab Bottom Navigation: Characters / Worlds / Upgrades */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onOpenShop('characters')}
            className="min-h-[48px] rounded-xl bg-slate-950/90 border border-white/15 hover:border-cyan-400/60 hover:bg-slate-900 px-2 py-2 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-white active:scale-95 transition-transform"
          >
            <User className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="truncate">Runners</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenShop('worlds')}
            className="min-h-[48px] rounded-xl bg-slate-950/90 border border-white/15 hover:border-emerald-400/60 hover:bg-slate-900 px-2 py-2 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-white active:scale-95 transition-transform"
          >
            <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Worlds</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenShop('upgrades')}
            className="min-h-[48px] rounded-xl bg-slate-950/90 border border-white/15 hover:border-amber-400/60 hover:bg-slate-900 px-2 py-2 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-white active:scale-95 transition-transform"
          >
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">Upgrades</span>
          </button>
        </div>
      </div>
    </div>
  );
}
