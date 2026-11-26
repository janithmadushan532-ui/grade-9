// Procedural Web Audio API synthesizer for SFX & adaptive background music
import { WorldId } from './types';

interface WorldAudioProfile {
  bassNotes: number[];
  arpNotes: number[];
  bassWave: OscillatorType;
  bassCutoff: number;
  arpWave: OscillatorType;
  arpCutoff: number;
  kickFreq: number;
  hatVol: number;
  ambientInterval: number;
}

const WORLD_AUDIO_PROFILES: Record<WorldId, WorldAudioProfile> = {
  city: {
    bassNotes: [55, 55, 65.41, 55, 73.42, 55, 82.41, 73.42], // Driving urban A minor
    arpNotes: [
      220, 261.63, 329.63, 440, 329.63, 261.63, 293.66, 392.0,
      220, 261.63, 329.63, 523.25, 440, 392.0, 329.63, 293.66,
    ],
    bassWave: 'sawtooth',
    bassCutoff: 360,
    arpWave: 'triangle',
    arpCutoff: 1850,
    kickFreq: 135,
    hatVol: 0.045,
    ambientInterval: 32,
  },
  jungle: {
    bassNotes: [65.41, 65.41, 73.42, 65.41, 87.31, 73.42, 98.0, 87.31], // Warm tribal C pentatonic
    arpNotes: [
      261.63, 329.63, 392.0, 523.25, 440.0, 392.0, 329.63, 293.66,
      261.63, 392.0, 440.0, 587.33, 523.25, 440.0, 392.0, 329.63,
    ],
    bassWave: 'triangle',
    bassCutoff: 300,
    arpWave: 'sine',
    arpCutoff: 1500,
    kickFreq: 112,
    hatVol: 0.03,
    ambientInterval: 24,
  },
  desert: {
    bassNotes: [61.74, 61.74, 65.41, 61.74, 77.78, 65.41, 82.41, 65.41], // Phrygian canyon groove
    arpNotes: [
      246.94, 261.63, 311.13, 392.0, 329.63, 311.13, 261.63, 246.94,
      246.94, 311.13, 392.0, 493.88, 392.0, 329.63, 311.13, 261.63,
    ],
    bassWave: 'sawtooth',
    bassCutoff: 310,
    arpWave: 'triangle',
    arpCutoff: 1350,
    kickFreq: 122,
    hatVol: 0.036,
    ambientInterval: 28,
  },
  snow: {
    bassNotes: [73.42, 73.42, 87.31, 73.42, 98.0, 87.31, 110.0, 98.0], // Alpine D dorian shimmer
    arpNotes: [
      587.33, 440.0, 523.25, 659.25, 783.99, 659.25, 523.25, 440.0,
      587.33, 659.25, 880.0, 783.99, 659.25, 523.25, 587.33, 440.0,
    ],
    bassWave: 'sine',
    bassCutoff: 340,
    arpWave: 'sine',
    arpCutoff: 2800,
    kickFreq: 105,
    hatVol: 0.025,
    ambientInterval: 28,
  },
  neon: {
    bassNotes: [49.0, 49.0, 58.27, 49.0, 65.41, 49.0, 73.42, 65.41], // Synthwave G minor drive
    arpNotes: [
      196.0, 293.66, 392.0, 466.16, 587.33, 466.16, 392.0, 293.66,
      196.0, 233.08, 293.66, 392.0, 587.33, 466.16, 392.0, 349.23,
    ],
    bassWave: 'sawtooth',
    bassCutoff: 490,
    arpWave: 'square',
    arpCutoff: 2100,
    kickFreq: 145,
    hatVol: 0.052,
    ambientInterval: 32,
  },
};

class GameAudioEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private sfxEnabled = true;
  private musicEnabled = true;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private isPlayingMusic = false;
  private isPaused = false;
  private coinStreak = 0;
  private lastCoinTime = 0;
  private currentWorld: WorldId = 'city';

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.sfxGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxEnabled ? 0.42 : 0;
      this.musicGain.gain.value = this.musicEnabled ? 0.18 : 0;
      this.sfxGain.connect(this.ctx.destination);
      this.musicGain.connect(this.ctx.destination);

      // Shared white noise buffer for filtered environmental breeze/shaker cues
      const bufSize = Math.floor(this.ctx.sampleRate * 0.6);
      this.noiseBuffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock(): void {
    this.ensureContext();
  }

  public setWorldTheme(worldId: WorldId): void {
    this.currentWorld = worldId;
  }

  public setSettings(sfxEnabled: boolean, musicEnabled: boolean): void {
    this.sfxEnabled = sfxEnabled;
    this.musicEnabled = musicEnabled;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(
        sfxEnabled ? 0.42 : 0,
        this.ctx.currentTime,
        0.02,
      );
    }
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(
        musicEnabled && !this.isPaused ? 0.18 : 0,
        this.ctx.currentTime,
        0.05,
      );
    }
    if (!musicEnabled) {
      this.stopMusic();
    } else if (this.isPlayingMusic && !this.musicTimer) {
      this.startMusicLoop();
    }
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(
        this.musicEnabled && !paused ? 0.18 : 0.04,
        this.ctx.currentTime,
        0.08,
      );
    }
  }

  public startMusic(): void {
    this.isPlayingMusic = true;
    this.isPaused = false;
    this.ensureContext();
    if (this.musicEnabled) {
      this.startMusicLoop();
    }
  }

  public stopMusic(): void {
    this.isPlayingMusic = false;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private startMusicLoop(): void {
    if (this.musicTimer !== null) return;

    this.musicTimer = window.setInterval(() => {
      if (!this.musicEnabled || this.isPaused || !this.ctx || !this.musicGain) {
        return;
      }
      if (this.ctx.state === 'suspended') return;
      const now = this.ctx.currentTime;
      const profile = WORLD_AUDIO_PROFILES[this.currentWorld];
      const step = this.musicStep % 16;

      // Kick on 0, 4, 8, 12
      if (step % 4 === 0) {
        this.playKick(now, profile.kickFreq);
      }
      // Crisp hi-hat / world percussion on offbeats
      if (step % 2 === 1) {
        this.playHat(now, profile.hatVol);
      }
      // Driving world-themed bass on 8th notes
      if (step % 2 === 0) {
        const bFreq = profile.bassNotes[(step / 2) % profile.bassNotes.length];
        this.playSynthNote(
          now,
          bFreq,
          0.14,
          profile.bassWave,
          0.34,
          profile.bassCutoff,
        );
      }
      // Energetic lead arp
      const aFreq = profile.arpNotes[step];
      this.playSynthNote(
        now,
        aFreq,
        0.095,
        profile.arpWave,
        this.currentWorld === 'neon' ? 0.14 : 0.21,
        profile.arpCutoff,
      );

      // Subtle procedural world environmental sound cue
      if (this.musicStep > 0 && this.musicStep % profile.ambientInterval === 0) {
        this.playWorldAmbientCue(now, this.currentWorld);
      }

      this.musicStep++;
    }, 115);
  }

  private playWorldAmbientCue(time: number, worldId: WorldId): void {
    if (!this.ctx || !this.musicGain) return;
    if (worldId === 'jungle') {
      // Tropical bird chirp two-note call
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1450, time);
      osc.frequency.exponentialRampToValueAtTime(2150, time + 0.09);
      osc.frequency.setValueAtTime(1850, time + 0.11);
      osc.frequency.exponentialRampToValueAtTime(2480, time + 0.2);
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.08, time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.23);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.24);
    } else if (worldId === 'desert' || worldId === 'snow') {
      // Filtered canyon wind (desert) or crisp alpine breeze (snow)
      if (!this.noiseBuffer) return;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.value = worldId === 'snow' ? 3.5 : 2.0;
      filter.frequency.setValueAtTime(worldId === 'snow' ? 1400 : 580, time);
      filter.frequency.exponentialRampToValueAtTime(
        worldId === 'snow' ? 2200 : 920,
        time + 0.45,
      );
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.075, time + 0.16);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.55);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      src.start(time);
      src.stop(time + 0.56);
    } else if (worldId === 'city') {
      // Urban metro chord chime
      [523.25, 659.25].forEach((f) => {
        this.playSynthNote(time, f, 0.26, 'triangle', 0.08, 2200);
      });
    } else if (worldId === 'neon') {
      // Cyber sweep pulse
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, time);
      osc.frequency.exponentialRampToValueAtTime(980, time + 0.28);
      gain.gain.setValueAtTime(0.055, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.31);
    }
  }

  private playKick(time: number, startFreq = 135): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);
    gain.gain.setValueAtTime(0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.14);
  }

  private playHat(time: number, vol = 0.045): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(6400, time);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + 0.035);
  }

  private playSynthNote(
    time: number,
    freq: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    cutoff: number,
  ): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, time);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(time);
    osc.stop(time + dur + 0.01);
  }

  public playWorldTransition(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [392.0, 493.88, 587.33, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.075;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  public playCoin(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    if (now - this.lastCoinTime < 0.45) {
      this.coinStreak = Math.min(this.coinStreak + 1, 8);
    } else {
      this.coinStreak = 0;
    }
    this.lastCoinTime = now;

    const baseFreq = 880 * Math.pow(1.045, this.coinStreak);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.setValueAtTime(baseFreq * 1.33, now + 0.045);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playGem(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [659.25, 880, 1174.66, 1567.98].forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + idx * 0.045;
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  public playJump(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.14);
    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playSlide(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.13);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playLaneSwitch(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.055);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playPowerUp(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const t = now + i * 0.04;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.19);
    });
  }

  public playShieldBreak(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.25);
    gain.gain.setValueAtTime(0.36, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playCrash(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.35);
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playUiClick(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.04);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playReward(): void {
    if (!this.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.065;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.24, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }
}

export const gameAudio = new GameAudioEngine();
