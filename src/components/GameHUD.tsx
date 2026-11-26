import { Coins, Globe, Pause, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { POWER_UPS, WORLDS } from '../game/constants';
import { RunHudState } from '../game/types';
import { PowerUpIcon } from './PowerUpIcon';

interface GameHUDProps {
  hud: RunHudState;
  onPause: () => void;
  onActivateHoverboard: () => void;
}

function formatWorldCountdown(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export function GameHUD({
  hud,
  onPause,
  onActivateHoverboard,
}: GameHUDProps) {
  const hoverboardReady =
    hud.hoverboards > 0 && !hud.hasHoverboard && hud.hoverboardCooldown <= 0;

  const currentWorldCfg = WORLDS[hud.currentWorld];
  const worldProgressPct = Math.max(
    0,
    Math.min(100, ((120 - hud.worldTimeRemaining) / 120) * 100),
  );
  const bannerWorldCfg = hud.worldTransitionBanner
    ? WORLDS[hud.worldTransitionBanner.worldId]
    : null;
  const bannerWorldNum = hud.worldTransitionBanner
    ? hud.worldTransitionBanner.stageInLoop
    : 1;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 safe-top safe-bottom">
      {/* Top HUD Row */}
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        {/* Left: Score & Distance + Compact World Tag */}
        <div className="flex flex-col gap-1.5">
          <div className="bg-slate-950/85 border border-white/15 rounded-xl px-3.5 py-2 shadow-lg">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white tabular-nums">
                {hud.score.toLocaleString()}
              </span>
              {hud.multiplier > 1 && (
                <span className="font-mono-num text-xs font-bold text-amber-400">
                  {hud.multiplier}x
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 font-mono-num">
              <span>{hud.distance}m</span>
              <span aria-hidden="true">·</span>
              <span>{hud.speedKmh} km/h</span>
            </div>
          </div>

          {/* Active World & Stage Countdown */}
          <div className="bg-slate-950/85 border border-white/15 rounded-xl px-3 py-1.5 shadow-md max-w-[210px]">
            <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-white">
              <span className="flex items-center gap-1.5 truncate">
                <Globe
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: currentWorldCfg.accentColor }}
                />
                <span className="truncate">{currentWorldCfg.name}</span>
              </span>
              <span className="font-mono-num text-slate-300 shrink-0">
                {formatWorldCountdown(hud.worldTimeRemaining)}
              </span>
            </div>
            <div className="mt-1 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-150"
                style={{
                  width: `${worldProgressPct}%`,
                  backgroundColor: currentWorldCfg.accentColor,
                }}
              />
            </div>
            {hud.worldLoop > 1 && (
              <div className="mt-0.5 text-[10px] font-mono-num font-bold text-amber-300">
                LOOP {hud.worldLoop} · TURBO PACE
              </div>
            )}
          </div>
        </div>

        {/* Right: Coins + Pause Button */}
        <div className="flex items-center gap-2.5">
          <div className="bg-slate-950/85 border border-white/15 rounded-xl px-3.5 py-2.5 flex items-center gap-2 shadow-lg">
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-mono-num text-base sm:text-lg font-bold text-amber-300 tabular-nums">
              {hud.coins}
            </span>
          </div>

          <button
            type="button"
            onClick={onPause}
            aria-label="Pause Game"
            className="pointer-events-auto min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-950/85 border border-white/20 text-white hover:bg-slate-800 active:scale-95 transition-transform shadow-lg focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <Pause className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Animated World Transition Banner */}
      <AnimatePresence>
        {hud.worldTransitionBanner && bannerWorldCfg && (
          <motion.div
            key={`${hud.worldTransitionBanner.worldId}-${hud.worldTransitionBanner.loop}`}
            initial={{ opacity: 0, y: -18, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="mx-auto mt-2 px-5 py-2.5 rounded-2xl bg-slate-950/90 border-2 shadow-2xl text-center max-w-xs sm:max-w-sm"
            style={{ borderColor: bannerWorldCfg.accentColor }}
          >
            <div
              className="text-[11px] font-mono-num font-bold tracking-widest uppercase"
              style={{ color: bannerWorldCfg.accentColor }}
            >
              WORLD {bannerWorldNum} OF 5
              {hud.worldTransitionBanner.loop > 1
                ? ` · LOOP ${hud.worldTransitionBanner.loop}`
                : ''}
            </div>
            <div className="font-display text-xl sm:text-2xl font-extrabold tracking-wide text-white leading-tight mt-0.5">
              {bannerWorldCfg.name}
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              {hud.worldTransitionBanner.loop > 1 &&
              hud.worldTransitionBanner.stageInLoop === 1
                ? 'Loop Complete — Higher Speed & Difficulty!'
                : bannerWorldCfg.subtitle}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Center Action Banner (Power-Ups / Gems / Shield) */}
      {hud.bannerText && (
        <div className="mx-auto mt-2 px-4 py-1.5 rounded-lg bg-slate-950/85 border border-amber-400/50 shadow-lg">
          <p className="font-display text-sm sm:text-base font-bold tracking-wide text-amber-300 text-center">
            {hud.bannerText}
          </p>
        </div>
      )}

      {/* Bottom HUD Row: Active Power-Up Timers + Hoverboard Trigger */}
      <div className="flex items-end justify-between gap-3 mt-auto">
        {/* Active Power-Up Countdown Bars */}
        <div className="flex flex-col gap-2 max-w-[230px] w-full">
          {hud.activePowerUps.map((p) => {
            const cfg = POWER_UPS[p.type];
            const pct = Math.max(
              0,
              Math.min(100, (p.remaining / Math.max(0.1, p.duration)) * 100),
            );
            return (
              <div
                key={p.type}
                className="bg-slate-950/85 border border-white/15 rounded-xl px-3 py-2 shadow-md"
              >
                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-white mb-1">
                  <span className="flex items-center gap-1.5 truncate">
                    <span style={{ color: cfg.color }}>
                      <PowerUpIcon type={p.type} className="w-3.5 h-3.5" />
                    </span>
                    <span className="truncate">{cfg.name}</span>
                  </span>
                  <span className="font-mono-num text-slate-300 shrink-0">
                    {p.remaining.toFixed(1)}s
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-75"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: cfg.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Quick Hoverboard Button & Shield Indicator */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {hud.hasShield && (
            <div className="bg-sky-950/90 border border-sky-400/40 rounded-lg px-2.5 py-1 flex items-center gap-1.5 text-xs font-semibold text-sky-200">
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Shield Active</span>
            </div>
          )}

          <button
            type="button"
            onClick={onActivateHoverboard}
            disabled={!hoverboardReady}
            aria-label="Activate Hoverboard"
            className={`pointer-events-auto min-h-[52px] px-3.5 py-2 rounded-xl border flex items-center gap-2.5 shadow-lg transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-cyan-400 ${
              hud.hasHoverboard
                ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                : hoverboardReady
                  ? 'bg-slate-950/90 border-cyan-400/60 text-white hover:bg-slate-900'
                  : 'bg-slate-950/65 border-white/10 text-slate-400 opacity-75'
            }`}
          >
            <Sparkles className="w-5 h-5 text-cyan-400 shrink-0" />
            <div className="text-left leading-tight">
              <div className="text-xs font-bold tracking-wide">
                {hud.hasHoverboard
                  ? 'ACTIVE'
                  : hud.hoverboardCooldown > 0
                    ? `${Math.ceil(hud.hoverboardCooldown)}s`
                    : 'BOARD'}
              </div>
              <div className="text-[11px] font-mono-num text-cyan-300">
                {hud.hoverboards} left
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
