import { ACHIEVEMENTS, MISSIONS, WORLD_ORDER } from './constants';
import { PowerUpType, SaveData, WorldId } from './types';

const STORAGE_KEY = 'power_runner_3d_save_v1';

export function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createDefaultSaveData(): SaveData {
  return {
    coins: 300,
    highScore: 0,
    bestDistance: 0,
    totalCoinsCollected: 0,
    totalDistance: 0,
    totalRuns: 0,
    totalJumps: 0,
    totalSlides: 0,
    totalPowerups: 0,
    hoverboards: 3,
    selectedWorld: 'city',
    unlockedWorlds: [...WORLD_ORDER],
    selectedCharacter: 'kai',
    unlockedCharacters: ['kai'],
    powerUpLevels: {
      magnet: 1,
      shield: 1,
      jetpack: 1,
      speed: 1,
      hoverboard: 1,
      doubleCoins: 1,
    },
    missions: MISSIONS.map((m) => ({
      id: m.id,
      progress: 0,
      claimed: false,
    })),
    claimedAchievements: [],
    dailyRewardStreak: 0,
    lastDailyClaimDate: '',
    selectedScienceUnit: 1,
    usedMcqIdsByUnit: {},
    mcqStats: {
      answered: 0,
      correct: 0,
    },
    settings: {
      sfxEnabled: true,
      musicEnabled: true,
      quality: 'high',
      swipeSensitivity: 'normal',
    },
  };
}

export function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultSaveData();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const defaults = createDefaultSaveData();

    const powerUpLevels: Record<PowerUpType, number> = {
      ...defaults.powerUpLevels,
      ...(parsed.powerUpLevels || {}),
    };

    const existingMissionMap = new Map(
      (parsed.missions || []).map((m) => [m.id, m]),
    );
    const missions = MISSIONS.map((def) => {
      const prev = existingMissionMap.get(def.id);
      return prev
        ? { id: def.id, progress: prev.progress || 0, claimed: !!prev.claimed }
        : { id: def.id, progress: 0, claimed: false };
    });

    const validSelectedWorld: WorldId =
      parsed.selectedWorld &&
      WORLD_ORDER.includes(parsed.selectedWorld as WorldId)
        ? (parsed.selectedWorld as WorldId)
        : defaults.selectedWorld;

    return {
      ...defaults,
      ...parsed,
      selectedWorld: validSelectedWorld,
      unlockedWorlds: [...WORLD_ORDER],
      unlockedCharacters:
        parsed.unlockedCharacters && parsed.unlockedCharacters.length > 0
          ? parsed.unlockedCharacters
          : defaults.unlockedCharacters,
      powerUpLevels,
      missions,
      claimedAchievements: Array.isArray(parsed.claimedAchievements)
        ? parsed.claimedAchievements
        : [],
      selectedScienceUnit:
        parsed.selectedScienceUnit === 'all' ||
        (typeof parsed.selectedScienceUnit === 'number' &&
          parsed.selectedScienceUnit >= 1 &&
          parsed.selectedScienceUnit <= 19)
          ? parsed.selectedScienceUnit
          : defaults.selectedScienceUnit,
      usedMcqIdsByUnit:
        parsed.usedMcqIdsByUnit && typeof parsed.usedMcqIdsByUnit === 'object'
          ? parsed.usedMcqIdsByUnit
          : {},
      mcqStats: {
        answered: parsed.mcqStats?.answered || 0,
        correct: parsed.mcqStats?.correct || 0,
      },
      settings: {
        ...defaults.settings,
        ...(parsed.settings || {}),
      },
    };
  } catch {
    return createDefaultSaveData();
  }
}

export function saveSaveData(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function canClaimDailyReward(save: SaveData): boolean {
  return save.lastDailyClaimDate !== getTodayDateString();
}

export function getAchievementProgress(save: SaveData, id: string): number {
  const def = ACHIEVEMENTS.find((a) => a.id === id);
  if (!def) return 0;
  switch (def.metric) {
    case 'totalCoins':
      return save.totalCoinsCollected;
    case 'highScore':
      return save.highScore;
    case 'totalDistance':
      return save.totalDistance;
    case 'unlockWorlds':
      return save.unlockedWorlds.length;
    case 'unlockCharacters':
      return save.unlockedCharacters.length;
    case 'totalPowerups':
      return save.totalPowerups;
  }
}
