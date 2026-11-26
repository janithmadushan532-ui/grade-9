import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { GameOverModal } from './components/GameOverModal';
import { MainMenu } from './components/MainMenu';
import { McqQuestionModal } from './components/McqQuestionModal';
import { MissionsModal } from './components/MissionsModal';
import { PauseModal } from './components/PauseModal';
import { DailyRewardModal } from './components/DailyRewardModal';
import { SettingsModal } from './components/SettingsModal';
import { ShopModal } from './components/ShopModal';
import { UnitSelectModal } from './components/UnitSelectModal';
import {
  ALL_MCQ_QUESTIONS,
  SCIENCE_UNITS,
  getUnitInfo,
  pickNextMcqQuestion,
} from './data/mcqBank';
import { McqQuestion, SelectedUnitId } from './data/mcqTypes';
import { gameAudio } from './game/audio';
import {
  ACHIEVEMENTS,
  CHARACTERS,
  DAILY_REWARDS,
  MISSIONS,
  POWER_UPS,
  WORLDS,
  getUpgradeCost,
} from './game/constants';
import { RunnerEngine } from './game/RunnerEngine';
import {
  canClaimDailyReward,
  createDefaultSaveData,
  getAchievementProgress,
  getTodayDateString,
  loadSaveData,
  saveSaveData,
} from './game/storage';
import {
  CharacterId,
  GamePhase,
  GameSettings,
  PowerUpType,
  RunHudState,
  RunSummary,
  SaveData,
  WorldId,
} from './game/types';

type ActiveModal =
  | null
  | 'shop'
  | 'missions'
  | 'daily'
  | 'settings'
  | 'unitSelect';

interface ActiveMcqState {
  question: McqQuestion;
  rewardType: PowerUpType;
  unitTitleSi: string;
  usedCountInCycle: number;
  totalInUnit: number;
}

const INITIAL_HUD: RunHudState = {
  score: 0,
  distance: 0,
  coins: 0,
  multiplier: 1,
  speedKmh: 45,
  activePowerUps: [],
  hoverboards: 3,
  hoverboardCooldown: 0,
  hasShield: false,
  hasHoverboard: false,
  isJetpack: false,
  bannerText: null,
  currentWorld: 'city',
  worldLoop: 1,
  worldTimeRemaining: 120,
  worldTransitionBanner: null,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<RunnerEngine | null>(null);

  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [hud, setHud] = useState<RunHudState>(INITIAL_HUD);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [modal, setModal] = useState<ActiveModal>(null);
  const [unitSelectMode, setUnitSelectMode] = useState<'play' | 'select'>('play');
  const [activeMcq, setActiveMcq] = useState<ActiveMcqState | null>(null);
  const [shopTab, setShopTab] = useState<'characters' | 'worlds' | 'upgrades'>(
    'characters',
  );

  // Refs to read fresh state inside engine/window callbacks without recreating WebGL
  const saveRef = useRef(save);
  saveRef.current = save;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const updateSave = useCallback((updater: (prev: SaveData) => SaveData) => {
    setSave((prev) => {
      const next = updater(prev);
      saveSaveData(next);
      return next;
    });
  }, []);

  // Initialize Three.js RunnerEngine once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new RunnerEngine(container, {
      onHudUpdate: (nextHud) => {
        setHud(nextHud);
      },
      onMcqCollect: (rewardType) => {
        const currentSave = saveRef.current;
        const selectedUnit = currentSave.selectedScienceUnit;
        const picked = pickNextMcqQuestion(
          selectedUnit,
          currentSave.usedMcqIdsByUnit,
        );

        updateSave((prev) => ({
          ...prev,
          usedMcqIdsByUnit: picked.nextUsedByUnit,
        }));

        const unitInfo = getUnitInfo(picked.question.unitId);
        const totalInUnit =
          selectedUnit === 'all'
            ? ALL_MCQ_QUESTIONS.length
            : unitInfo?.questionCount || 35;
        const usedCountInCycle =
          selectedUnit === 'all'
            ? SCIENCE_UNITS.reduce(
                (sum, u) => sum + (picked.nextUsedByUnit[u.id]?.length || 0),
                0,
              )
            : picked.nextUsedByUnit[picked.question.unitId]?.length || 1;

        setActiveMcq({
          question: picked.question,
          rewardType,
          unitTitleSi: unitInfo?.titleSi || '',
          usedCountInCycle,
          totalInUnit,
        });
        setPhase('mcq');
      },
      onGameOver: (summary) => {
        const prevSave = saveRef.current;
        const isNewHigh = summary.score > prevSave.highScore;
        const finalSummary: RunSummary = {
          ...summary,
          isNewHighScore: isNewHigh,
        };
        setRunSummary(finalSummary);
        setPhase('gameover');

        updateSave((prev) => {
          const updatedMissions = prev.missions.map((mp) => {
            if (mp.claimed) return mp;
            const def = MISSIONS.find((m) => m.id === mp.id);
            if (!def) return mp;
            let inc = 0;
            if (def.metric === 'coins') inc = summary.coinsEarned;
            else if (def.metric === 'distance') inc = summary.distance;
            else if (def.metric === 'jumps') inc = summary.jumps;
            else if (def.metric === 'slides') inc = summary.slides;
            else if (def.metric === 'powerups') inc = summary.powerUpsUsed;
            else if (def.metric === 'runs') inc = 1;
            return {
              ...mp,
              progress: Math.min(def.target, mp.progress + inc),
            };
          });

          return {
            ...prev,
            coins: prev.coins + summary.coinsEarned,
            highScore: Math.max(prev.highScore, summary.score),
            bestDistance: Math.max(prev.bestDistance, summary.distance),
            totalCoinsCollected: prev.totalCoinsCollected + summary.coinsEarned,
            totalDistance: prev.totalDistance + summary.distance,
            totalRuns: prev.totalRuns + 1,
            totalJumps: prev.totalJumps + summary.jumps,
            totalSlides: prev.totalSlides + summary.slides,
            totalPowerups: prev.totalPowerups + summary.powerUpsUsed,
            missions: updatedMissions,
          };
        });
      },
    });

    engineRef.current = engine;
    engine.setWorld(saveRef.current.selectedWorld);
    engine.setCharacter(saveRef.current.selectedCharacter);
    engine.setQuality(saveRef.current.settings.quality);
    engine.setProgressionData(
      saveRef.current.powerUpLevels,
      saveRef.current.hoverboards,
    );
    gameAudio.setSettings(
      saveRef.current.settings.sfxEnabled,
      saveRef.current.settings.musicEnabled,
    );

    return () => {
      engine.dispose();
      engineRef.current = null;
      gameAudio.stopMusic();
    };
  }, [updateSave]);

  // Sync audio & engine settings whenever save updates
  useEffect(() => {
    const engine = engineRef.current;
    if (engine) {
      if (phaseRef.current === 'menu') {
        engine.setWorld(save.selectedWorld);
      }
      engine.setCharacter(save.selectedCharacter);
      engine.setQuality(save.settings.quality);
      engine.setProgressionData(save.powerUpLevels, save.hoverboards);
    }
    gameAudio.setSettings(save.settings.sfxEnabled, save.settings.musicEnabled);
  }, [save]);

  // Auto-pause if browser tab or mobile WebView goes to background
  useEffect(() => {
    const onVisChange = () => {
      if (document.hidden && phaseRef.current === 'playing') {
        engineRef.current?.pause();
        setPhase('paused');
      }
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => document.removeEventListener('visibilitychange', onVisChange);
  }, []);

  const startRun = useCallback(() => {
    gameAudio.unlock();
    gameAudio.playUiClick();
    gameAudio.startMusic();
    setModal(null);
    setActiveMcq(null);
    setRunSummary(null);
    const startingWorld = saveRef.current.selectedWorld;
    setHud((prev) => ({
      ...prev,
      currentWorld: startingWorld,
      worldLoop: 1,
      worldTimeRemaining: 120,
      worldTransitionBanner: {
        worldId: startingWorld,
        loop: 1,
        stageInLoop: 1,
      },
    }));
    const engine = engineRef.current;
    if (engine) {
      engine.setProgressionData(
        saveRef.current.powerUpLevels,
        saveRef.current.hoverboards,
      );
      engine.startRun(startingWorld);
    }
    setPhase('playing');
  }, []);

  const handleOpenUnitSelect = useCallback((mode: 'play' | 'select') => {
    gameAudio.unlock();
    gameAudio.playUiClick();
    setUnitSelectMode(mode);
    setModal('unitSelect');
  }, []);

  const handleConfirmScienceUnit = useCallback(
    (unitId: SelectedUnitId, startImmediately: boolean) => {
      updateSave((prev) => ({
        ...prev,
        selectedScienceUnit: unitId,
      }));
      if (startImmediately) {
        startRun();
      } else {
        gameAudio.playUiClick();
        setModal(null);
      }
    },
    [startRun, updateSave],
  );

  const handleMcqComplete = useCallback(
    (correct: boolean) => {
      if (!activeMcq) return;
      const { rewardType } = activeMcq;
      updateSave((prev) => ({
        ...prev,
        mcqStats: {
          answered: prev.mcqStats.answered + 1,
          correct: prev.mcqStats.correct + (correct ? 1 : 0),
        },
      }));
      setActiveMcq(null);
      setPhase('playing');
      engineRef.current?.resolveMcqAnswer(correct, rewardType);
    },
    [activeMcq, updateSave],
  );

  const handlePause = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    gameAudio.playUiClick();
    engineRef.current?.pause();
    setPhase('paused');
  }, []);

  const handleResume = useCallback(() => {
    if (phaseRef.current !== 'paused') return;
    gameAudio.playUiClick();
    engineRef.current?.resume();
    setPhase('playing');
  }, []);

  const handleReturnToMenu = useCallback(() => {
    gameAudio.playUiClick();
    gameAudio.setPaused(true);
    engineRef.current?.returnToMenu();
    setPhase('menu');
    setActiveMcq(null);
    setRunSummary(null);
    setModal(null);
  }, []);

  const handleActivateHoverboard = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const activated = engineRef.current?.activateHoverboard();
    if (activated) {
      updateSave((prev) => ({
        ...prev,
        hoverboards: Math.max(0, prev.hoverboards - 1),
      }));
    }
  }, [updateSave]);

  // Keyboard Controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const code = e.code;

      if (phaseRef.current === 'playing') {
        if (code === 'ArrowLeft' || code === 'KeyA') {
          e.preventDefault();
          engineRef.current?.moveLeft();
        } else if (code === 'ArrowRight' || code === 'KeyD') {
          e.preventDefault();
          engineRef.current?.moveRight();
        } else if (code === 'ArrowUp' || code === 'KeyW' || code === 'Space') {
          e.preventDefault();
          engineRef.current?.jump();
        } else if (code === 'ArrowDown' || code === 'KeyS') {
          e.preventDefault();
          engineRef.current?.slide();
        } else if (code === 'KeyH' || code === 'ShiftLeft' || code === 'ShiftRight') {
          e.preventDefault();
          handleActivateHoverboard();
        } else if (code === 'Escape' || code === 'KeyP') {
          e.preventDefault();
          handlePause();
        }
      } else if (phaseRef.current === 'paused') {
        if (code === 'Escape' || code === 'KeyP') {
          e.preventDefault();
          handleResume();
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleActivateHoverboard, handlePause, handleResume]);

  // Touch & Pointer Swipe Controls on Game Surface
  const swipeStartRef = useRef<{
    x: number;
    y: number;
    handled: boolean;
    time: number;
  } | null>(null);
  const lastTapRef = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (phaseRef.current !== 'playing') return;
    const touch = e.touches[0];
    if (!touch) return;
    gameAudio.unlock();

    const now = performance.now();
    if (now - lastTapRef.current < 270) {
      handleActivateHoverboard();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }

    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      handled: false,
      time: now,
    };
  }, [handleActivateHoverboard]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (phaseRef.current !== 'playing') return;
    const start = swipeStartRef.current;
    if (!start || start.handled) return;
    const touch = e.touches[0];
    if (!touch) return;

    const threshold =
      saveRef.current.settings.swipeSensitivity === 'high' ? 20 : 30;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;

    start.handled = true;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) engineRef.current?.moveLeft();
      else engineRef.current?.moveRight();
    } else {
      if (dy < 0) engineRef.current?.jump();
      else engineRef.current?.slide();
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    swipeStartRef.current = null;
  }, []);

  // Mouse drag swipe support for desktop testing
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || phaseRef.current !== 'playing') return;
    swipeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      handled: false,
      time: performance.now(),
    };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || phaseRef.current !== 'playing') return;
    const start = swipeStartRef.current;
    if (!start || start.handled) return;
    const threshold = 30;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    start.handled = true;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) engineRef.current?.moveLeft();
      else engineRef.current?.moveRight();
    } else {
      if (dy < 0) engineRef.current?.jump();
      else engineRef.current?.slide();
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    swipeStartRef.current = null;
  }, []);

  // Shop & Progression Handlers
  const handleSelectOrBuyCharacter = (id: CharacterId) => {
    gameAudio.unlock();
    const cfg = CHARACTERS[id];
    if (save.unlockedCharacters.includes(id)) {
      gameAudio.playUiClick();
      updateSave((prev) => ({ ...prev, selectedCharacter: id }));
    } else if (save.coins >= cfg.cost) {
      gameAudio.playReward();
      updateSave((prev) => ({
        ...prev,
        coins: prev.coins - cfg.cost,
        unlockedCharacters: [...prev.unlockedCharacters, id],
        selectedCharacter: id,
      }));
    }
  };

  const handleSelectOrBuyWorld = (id: WorldId) => {
    gameAudio.unlock();
    gameAudio.playUiClick();
    updateSave((prev) => ({
      ...prev,
      unlockedWorlds: prev.unlockedWorlds.includes(id)
        ? prev.unlockedWorlds
        : [...prev.unlockedWorlds, id],
      selectedWorld: id,
    }));
  };

  const handleUpgradePowerUp = (type: PowerUpType) => {
    gameAudio.unlock();
    const cfg = POWER_UPS[type];
    const lvl = save.powerUpLevels[type] || 1;
    if (lvl >= cfg.maxLevel) return;
    const cost = getUpgradeCost(type, lvl);
    if (save.coins < cost) return;
    gameAudio.playReward();
    updateSave((prev) => ({
      ...prev,
      coins: prev.coins - cost,
      powerUpLevels: {
        ...prev.powerUpLevels,
        [type]: lvl + 1,
      },
    }));
  };

  const handleBuyHoverboard = () => {
    gameAudio.unlock();
    if (save.coins < 100) return;
    gameAudio.playReward();
    updateSave((prev) => ({
      ...prev,
      coins: prev.coins - 100,
      hoverboards: prev.hoverboards + 1,
    }));
  };

  const handleClaimMission = (missionId: string) => {
    const def = MISSIONS.find((m) => m.id === missionId);
    const state = save.missions.find((m) => m.id === missionId);
    if (!def || !state || state.claimed || state.progress < def.target) return;
    gameAudio.playReward();
    updateSave((prev) => ({
      ...prev,
      coins: prev.coins + def.reward,
      missions: prev.missions.map((m) =>
        m.id === missionId ? { ...m, claimed: true } : m,
      ),
    }));
  };

  const handleClaimAchievement = (achievementId: string) => {
    const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
    if (!def || save.claimedAchievements.includes(achievementId)) return;
    const prog = getAchievementProgress(save, achievementId);
    if (prog < def.target) return;
    gameAudio.playReward();
    updateSave((prev) => ({
      ...prev,
      coins: prev.coins + def.reward,
      claimedAchievements: [...prev.claimedAchievements, achievementId],
    }));
  };

  const handleClaimDaily = () => {
    if (!canClaimDailyReward(save)) return;
    const idx = save.dailyRewardStreak % DAILY_REWARDS.length;
    const reward = DAILY_REWARDS[idx];
    gameAudio.playReward();
    updateSave((prev) => ({
      ...prev,
      coins: prev.coins + reward.coins,
      hoverboards: prev.hoverboards + reward.hoverboards,
      dailyRewardStreak: (prev.dailyRewardStreak + 1) % DAILY_REWARDS.length,
      lastDailyClaimDate: getTodayDateString(),
    }));
  };

  const handleUpdateSettings = (next: GameSettings) => {
    gameAudio.playUiClick();
    updateSave((prev) => ({ ...prev, settings: next }));
  };

  const handleResetProgress = () => {
    gameAudio.playUiClick();
    const fresh = createDefaultSaveData();
    saveSaveData(fresh);
    setSave(fresh);
    setModal(null);
  };

  const dailyAvailable = canClaimDailyReward(save);
  const claimableMissionsCount = useMemo(() => {
    const mCount = save.missions.filter((m) => {
      if (m.claimed) return false;
      const def = MISSIONS.find((d) => d.id === m.id);
      return def ? m.progress >= def.target : false;
    }).length;
    const aCount = ACHIEVEMENTS.filter((a) => {
      if (save.claimedAchievements.includes(a.id)) return false;
      return getAchievementProgress(save, a.id) >= a.target;
    }).length;
    return mCount + aCount;
  }, [save]);

  return (
    <div
      className="relative w-full h-[100dvh] overflow-hidden bg-[#0b1020] touch-none select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Dedicated Three.js WebGL Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Main Menu Overlay */}
      {phase === 'menu' && (
        <MainMenu
          save={save}
          dailyAvailable={dailyAvailable}
          claimableMissionsCount={claimableMissionsCount}
          onPlay={() => handleOpenUnitSelect('play')}
          onOpenUnitSelect={() => handleOpenUnitSelect('select')}
          onOpenShop={(tab) => {
            gameAudio.unlock();
            gameAudio.playUiClick();
            setShopTab(tab);
            setModal('shop');
          }}
          onOpenMissions={() => {
            gameAudio.unlock();
            gameAudio.playUiClick();
            setModal('missions');
          }}
          onOpenDaily={() => {
            gameAudio.unlock();
            gameAudio.playUiClick();
            setModal('daily');
          }}
          onOpenSettings={() => {
            gameAudio.unlock();
            gameAudio.playUiClick();
            setModal('settings');
          }}
        />
      )}

      {/* Active Gameplay HUD */}
      {phase === 'playing' && (
        <GameHUD
          hud={hud}
          onPause={handlePause}
          onActivateHoverboard={handleActivateHoverboard}
        />
      )}

      {/* In-Run MCQ Power Reward Modal */}
      {phase === 'mcq' && activeMcq && (
        <McqQuestionModal
          question={activeMcq.question}
          unitTitleSi={activeMcq.unitTitleSi}
          rewardType={activeMcq.rewardType}
          usedCountInCycle={activeMcq.usedCountInCycle}
          totalInUnit={activeMcq.totalInUnit}
          onComplete={handleMcqComplete}
        />
      )}

      {/* Pause Overlay */}
      {phase === 'paused' && modal === null && (
        <PauseModal
          onResume={handleResume}
          onRestart={startRun}
          onOpenSettings={() => {
            gameAudio.playUiClick();
            setModal('settings');
          }}
          onMainMenu={handleReturnToMenu}
        />
      )}

      {/* Game Over Overlay */}
      {phase === 'gameover' && runSummary && (
        <GameOverModal
          summary={runSummary}
          highScore={save.highScore}
          totalCoins={save.coins}
          onRestart={startRun}
          onMainMenu={handleReturnToMenu}
        />
      )}

      {/* Modals */}
      {modal === 'unitSelect' && (
        <UnitSelectModal
          save={save}
          mode={unitSelectMode}
          onConfirm={handleConfirmScienceUnit}
          onClose={() => {
            gameAudio.playUiClick();
            setModal(null);
          }}
        />
      )}

      {modal === 'shop' && (
        <ShopModal
          save={save}
          activeTab={shopTab}
          onTabChange={(t) => {
            gameAudio.playUiClick();
            setShopTab(t);
          }}
          onSelectOrBuyCharacter={handleSelectOrBuyCharacter}
          onSelectOrBuyWorld={handleSelectOrBuyWorld}
          onPlayFromWorlds={() => handleOpenUnitSelect('play')}
          onUpgradePowerUp={handleUpgradePowerUp}
          onBuyHoverboard={handleBuyHoverboard}
          onClose={() => {
            gameAudio.playUiClick();
            setModal(null);
          }}
        />
      )}

      {modal === 'missions' && (
        <MissionsModal
          save={save}
          onClaimMission={handleClaimMission}
          onClaimAchievement={handleClaimAchievement}
          onClose={() => {
            gameAudio.playUiClick();
            setModal(null);
          }}
        />
      )}

      {modal === 'daily' && (
        <DailyRewardModal
          save={save}
          onClaim={handleClaimDaily}
          onClose={() => {
            gameAudio.playUiClick();
            setModal(null);
          }}
        />
      )}

      {modal === 'settings' && (
        <SettingsModal
          settings={save.settings}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={handleResetProgress}
          onClose={() => {
            gameAudio.playUiClick();
            setModal(null);
          }}
        />
      )}
    </div>
  );
}
