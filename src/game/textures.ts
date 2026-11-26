import * as THREE from 'three';
import { WorldConfig } from './types';

export function createRoadTexture(
  world: WorldConfig,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base surface
  ctx.fillStyle = world.roadPrimary;
  ctx.fillRect(0, 0, 512, 512);

  // Subtle surface grit / sleepers / tile pattern
  ctx.fillStyle = world.roadSecondary;
  if (world.id === 'jungle') {
    // Ancient stone blocks
    for (let y = 0; y < 512; y += 64) {
      for (let x = 0; x < 512; x += 64) {
        if ((x / 64 + y / 64) % 2 === 0) {
          ctx.fillRect(x + 2, y + 2, 60, 60);
        }
      }
    }
  } else if (world.id === 'neon') {
    // Cyber grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 3;
    for (let y = 0; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
  } else {
    // Subtle asphalt / sleeper texture bands
    for (let y = 0; y < 512; y += 32) {
      ctx.fillRect(0, y, 512, 6);
    }
  }

  // Side curb trim
  ctx.fillStyle = world.shoulderColor;
  ctx.fillRect(0, 0, 28, 512);
  ctx.fillRect(512 - 28, 0, 28, 512);

  // Accent edge rails
  ctx.fillStyle = world.accentColor;
  ctx.fillRect(28, 0, 8, 512);
  ctx.fillRect(512 - 36, 0, 8, 512);

  // Three lanes divided at 1/3 and 2/3 of the road interior
  const lane1X = Math.round(512 / 3);
  const lane2X = Math.round((512 * 2) / 3);
  ctx.fillStyle = world.laneLineColor;
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(lane1X - 4, y, 8, 34);
    ctx.fillRect(lane2X - 4, y, 8, 34);
  }

  // Subtle rail tracks inside each lane for visual speed feedback
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  [85, 256, 427].forEach((cx) => {
    ctx.fillRect(cx - 26, 0, 4, 512);
    ctx.fillRect(cx + 22, 0, 4, 512);
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  return tex;
}

export function createHazardStripeTexture(
  primary: string,
  secondary: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = secondary;
  ctx.fillRect(0, 0, 256, 128);

  ctx.fillStyle = primary;
  for (let i = -128; i < 384; i += 48) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 24, 0);
    ctx.lineTo(i + 24 + 128, 128);
    ctx.lineTo(i + 128, 128);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(4, maxAnisotropy);
  return tex;
}

export function createCrateTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b45309';
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#92400e';
  for (let y = 16; y < 240; y += 44) {
    ctx.fillRect(16, y, 224, 34);
  }

  // Outer frame & diagonal brace
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 22;
  ctx.strokeRect(11, 11, 234, 234);

  ctx.beginPath();
  ctx.moveTo(20, 20);
  ctx.lineTo(236, 236);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, maxAnisotropy);
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
  grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.22)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
