export type WorldId = 'city' | 'jungle' | 'desert' | 'snow' | 'neon';

export type CharacterId = 'kai' | 'nova' | 'blaze' | 'frost' | 'volt';

export type PowerUpType =
  | 'magnet'
  | 'shield'
  | 'jetpack'
  | 'speed'
  | 'hoverboard'
  | 'doubleCoins';

export type ObstacleKind =
  | 'barrier_low'
  | 'barrier_high'
  | 'box_stack'
  | 'roadblock'
  | 'car'
  | 'van'
  | 'bus'
  | 'train'
  | 'ramp_train';

import { SelectedUnitId } from '../data/mcqTypes';

export type GamePhase = 'menu' | 'playing' | 'paused' | 'mcq' | 'gameover';

export type GraphicsQuality = 'high' | 'balanced';

export interface WorldConfig {
  id: WorldId;
  name: string;
  subtitle: string;
  cost: number;
  skyColor: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  roadPrimary: string;
  roadSecondary: string;
  laneLineColor: string;
  shoulderColor: string;
  accentColor: string;
  obstaclePrimary: string;
  obstacleSecondary: string;
  trainColor: string;
  busColor: string;
}

export interface CharacterConfig {
  id: CharacterId;
  name: string;
  title: string;
  cost: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  skinColor: string;
  visorColor: string;
  perkLabel: string;
  coinBonus: number; // e.g., 0.1 = +10%
  speedMultiplier: number; // subtle handling/score perk
}

export interface PowerUpConfig {
  id: PowerUpType;
  name: string;
  description: string;
  color: string;
  baseDuration: number; // seconds at level 1
  durationPerLevel: number;
  cooldown: number; // seconds before next spawn/manual activation
  maxLevel: number;
  upgradeBaseCost: number;
}

export interface ActivePowerUpState {
  type: PowerUpType;
  remaining: number;
  duration: number;
}

export interface MissionDef {
  id: string;
  title: string;
  metric: 'coins' | 'distance' | 'jumps' | 'slides' | 'powerups' | 'runs';
  target: number;
  reward: number;
}

export interface MissionProgress {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  metric: 'totalCoins' | 'highScore' | 'totalDistance' | 'unlockWorlds' | 'unlockCharacters' | 'totalPowerups';
  target: number;
  reward: number;
}

export interface GameSettings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  quality: GraphicsQuality;
  swipeSensitivity: 'normal' | 'high';
}

export interface SaveData {
  coins: number;
  highScore: number;
  bestDistance: number;
  totalCoinsCollected: number;
  totalDistance: number;
  totalRuns: number;
  totalJumps: number;
  totalSlides: number;
  totalPowerups: number;
  hoverboards: number;
  selectedWorld: WorldId;
  unlockedWorlds: WorldId[];
  selectedCharacter: CharacterId;
  unlockedCharacters: CharacterId[];
  powerUpLevels: Record<PowerUpType, number>;
  missions: MissionProgress[];
  claimedAchievements: string[];
  dailyRewardStreak: number; // 0..6
  lastDailyClaimDate: string; // YYYY-MM-DD
  selectedScienceUnit: SelectedUnitId;
  usedMcqIdsByUnit: Record<number, string[]>;
  mcqStats: {
    answered: number;
    correct: number;
  };
  settings: GameSettings;
}

export interface WorldTransitionBanner {
  worldId: WorldId;
  loop: number;
  stageInLoop: number;
}

export interface RunHudState {
  score: number;
  distance: number;
  coins: number;
  multiplier: number;
  speedKmh: number;
  activePowerUps: ActivePowerUpState[];
  hoverboards: number;
  hoverboardCooldown: number;
  hasShield: boolean;
  hasHoverboard: boolean;
  isJetpack: boolean;
  bannerText: string | null;
  currentWorld: WorldId;
  worldLoop: number;
  worldTimeRemaining: number;
  worldTransitionBanner: WorldTransitionBanner | null;
}

export interface RunSummary {
  score: number;
  distance: number;
  coinsEarned: number;
  isNewHighScore: boolean;
  powerUpsUsed: number;
  jumps: number;
  slides: number;
}
