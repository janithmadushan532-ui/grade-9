import { Check, Coins, Globe, Lock, Play, Sparkles, X } from 'lucide-react';
import {
  CHARACTERS,
  CHARACTER_ORDER,
  POWERUP_ORDER,
  POWER_UPS,
  WORLDS,
  WORLD_ORDER,
  getCircularWorldOrder,
  getPowerUpDuration,
  getUpgradeCost,
} from '../game/constants';
import { CharacterId, PowerUpType, SaveData, WorldId } from '../game/types';
import { PowerUpIcon } from './PowerUpIcon';

interface ShopModalProps {
  save: SaveData;
  activeTab: 'characters' | 'worlds' | 'upgrades';
  onTabChange: (tab: 'characters' | 'worlds' | 'upgrades') => void;
  onSelectOrBuyCharacter: (id: CharacterId) => void;
  onSelectOrBuyWorld: (id: WorldId) => void;
  onPlayFromWorlds: () => void;
  onUpgradePowerUp: (type: PowerUpType) => void;
  onBuyHoverboard: () => void;
  onClose: () => void;
}

export function ShopModal({
  save,
  activeTab,
  onTabChange,
  onSelectOrBuyCharacter,
  onSelectOrBuyWorld,
  onPlayFromWorlds,
  onUpgradePowerUp,
  onBuyHoverboard,
  onClose,
}: ShopModalProps) {
  const circularOrder = getCircularWorldOrder(save.selectedWorld);
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/75 p-3 sm:p-5">
      <div className="w-full max-w-lg max-h-[88dvh] flex flex-col bg-slate-900 border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10">
          <h2 className="font-display text-lg sm:text-xl font-bold text-white tracking-wide">
            GARAGE &amp; SHOP
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-white/10 rounded-lg px-2.5 py-1">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="font-mono-num text-sm font-bold text-amber-300 tabular-nums">
                {save.coins.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Shop"
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Segmented Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-2.5 bg-slate-950/60 border-b border-white/10">
          {(
            [
              { id: 'characters', label: 'Runners' },
              { id: 'worlds', label: 'Worlds' },
              { id: 'upgrades', label: 'Power-Ups' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={`min-h-[38px] rounded-lg text-xs sm:text-sm font-bold transition-colors ${
                activeTab === t.id
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto modal-scroll p-3.5 space-y-2.5">
          {activeTab === 'characters' &&
            CHARACTER_ORDER.map((id) => {
              const char = CHARACTERS[id];
              const unlocked = save.unlockedCharacters.includes(id);
              const selected = save.selectedCharacter === id;
              const canAfford = save.coins >= char.cost;

              return (
                <div
                  key={id}
                  className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${
                    selected
                      ? 'bg-cyan-950/45 border-cyan-400/70'
                      : 'bg-slate-950/75 border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-11 h-11 rounded-xl shrink-0 border border-white/20 flex items-center justify-center font-display font-bold text-lg text-white"
                      style={{
                        background: `linear-gradient(135deg, ${char.primaryColor}, ${char.secondaryColor})`,
                      }}
                    >
                      {char.name[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-base text-white truncate">
                          {char.name}
                        </span>
                        <span className="text-xs text-slate-400 truncate">
                          {char.title}
                        </span>
                      </div>
                      <p className="text-xs text-cyan-300 font-medium mt-0.5">
                        {char.perkLabel}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectOrBuyCharacter(id)}
                    disabled={!unlocked && !canAfford}
                    className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-transform active:scale-95 ${
                      selected
                        ? 'bg-cyan-400 text-slate-950'
                        : unlocked
                          ? 'bg-slate-800 hover:bg-slate-700 text-white border border-white/15'
                          : canAfford
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                            : 'bg-slate-800/60 text-slate-500 border border-white/5 cursor-not-allowed'
                    }`}
                  >
                    {selected ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Selected</span>
                      </>
                    ) : unlocked ? (
                      <span>Select</span>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span className="font-mono-num">{char.cost}</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}

          {activeTab === 'worlds' && (
            <>
              <div className="p-3 rounded-xl bg-emerald-950/35 border border-emerald-400/30 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <Globe className="w-4 h-4 shrink-0" />
                  <span>Choose Your Starting World (Auto-Cycles Every 2 Min)</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  Route:{' '}
                  <span className="text-white font-semibold">
                    {circularOrder.map((wId) => WORLDS[wId].name).join(' → ')}
                  </span>
                </p>
              </div>

              {WORLD_ORDER.map((id, idx) => {
                const world = WORLDS[id];
                const selected = save.selectedWorld === id;
                const stageNum = circularOrder.indexOf(id) + 1;

                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                      selected
                        ? 'bg-emerald-950/45 border-emerald-400/80'
                        : 'bg-slate-950/75 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl shrink-0 border border-white/20 flex items-center justify-center font-display text-sm font-bold text-white shadow-inner"
                        style={{
                          background: `linear-gradient(135deg, ${world.skyColor}, ${world.accentColor})`,
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-base text-white truncate">
                            {world.name}
                          </span>
                          <span className="text-[10px] font-mono-num font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/25 px-1.5 py-0.5 rounded shrink-0">
                            Stage {stageNum}/5
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {world.subtitle}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectOrBuyWorld(id)}
                      className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-transform active:scale-95 ${
                        selected
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-white/15'
                      }`}
                    >
                      {selected ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Starting</span>
                        </>
                      ) : (
                        <span>Select</span>
                      )}
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={onPlayFromWorlds}
                className="w-full min-h-[48px] mt-1 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-display text-base font-bold tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>PLAY IN {WORLDS[save.selectedWorld].name.toUpperCase()}</span>
              </button>
            </>
          )}

          {activeTab === 'upgrades' && (
            <>
              {/* Buy Extra Hoverboard Charge */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-cyan-950/35 border border-cyan-400/35">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-sm text-white">
                      Hoverboard Charge
                    </div>
                    <p className="text-xs text-cyan-200">
                      Owned: <span className="font-mono-num font-bold">{save.hoverboards}</span> · Protects from crash
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onBuyHoverboard}
                  disabled={save.coins < 100}
                  className={`min-h-[40px] px-3.5 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 ${
                    save.coins >= 100
                      ? 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                      : 'bg-slate-800/60 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span className="font-mono-num">100</span>
                </button>
              </div>

              {POWERUP_ORDER.map((type) => {
                const cfg = POWER_UPS[type];
                const lvl = save.powerUpLevels[type] || 1;
                const maxed = lvl >= cfg.maxLevel;
                const cost = getUpgradeCost(type, lvl);
                const canAfford = save.coins >= cost;
                const curDur = getPowerUpDuration(type, lvl).toFixed(1);

                return (
                  <div
                    key={type}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/75 border border-white/10"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-900 border border-white/10"
                        style={{ color: cfg.color }}
                      >
                        <PowerUpIcon type={type} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-sm text-white truncate">
                            {cfg.name}
                          </span>
                          <span className="font-mono-num text-xs text-slate-400">
                            Lv {lvl}/{cfg.maxLevel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          Duration: <span className="text-slate-200 font-mono-num">{curDur}s</span> · {cfg.description}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onUpgradePowerUp(type)}
                      disabled={maxed || !canAfford}
                      className={`min-h-[40px] px-3 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 ${
                        maxed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                          : canAfford
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                            : 'bg-slate-800/60 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {maxed ? (
                        <span>MAX</span>
                      ) : (
                        <>
                          <Coins className="w-3.5 h-3.5" />
                          <span className="font-mono-num">{cost}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
