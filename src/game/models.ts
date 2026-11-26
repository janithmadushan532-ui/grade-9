import * as THREE from 'three';
import {
  CharacterConfig,
  ObstacleKind,
  PowerUpType,
  WorldConfig,
  WorldId,
} from './types';
import { createCrateTexture, createHazardStripeTexture } from './textures';

export interface CharacterRig {
  group: THREE.Group;
  bodyPivot: THREE.Group;
  head: THREE.Group;
  torso: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  backpack: THREE.Group;
  jetFlames: THREE.Group;
  shieldDome: THREE.Mesh;
  hoverboard: THREE.Group;
}

export function buildCharacterModel(cfg: CharacterConfig): CharacterRig {
  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: cfg.primaryColor,
    roughness: 0.42,
    metalness: 0.2,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: cfg.secondaryColor,
    roughness: 0.68,
    metalness: 0.15,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: cfg.accentColor,
    roughness: 0.25,
    metalness: 0.6,
    emissive: cfg.accentColor,
    emissiveIntensity: 0.25,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: cfg.skinColor,
    roughness: 0.65,
    metalness: 0.02,
  });
  const visorMat = new THREE.MeshPhysicalMaterial({
    color: cfg.visorColor,
    roughness: 0.1,
    metalness: 0.85,
    clearcoat: 1.0,
    emissive: cfg.visorColor,
    emissiveIntensity: 0.45,
  });

  // Torso (centered around y = 1.05)
  const torso = new THREE.Group();
  torso.position.set(0, 1.05, 0);
  bodyPivot.add(torso);

  const chest = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.68, 0.36),
    primaryMat,
  );
  chest.castShadow = true;
  torso.add(chest);

  // Chest stripe accent
  const chestStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.12, 0.38),
    accentMat,
  );
  chestStripe.position.set(0, 0.12, 0);
  torso.add(chestStripe);

  // Belt / waist
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.14, 0.34),
    secondaryMat,
  );
  belt.position.set(0, -0.32, 0);
  torso.add(belt);

  // Head + Visor + Hair/Helmet crest
  const head = new THREE.Group();
  head.position.set(0, 0.56, 0);
  torso.add(head);

  const cranium = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.42, 0.42),
    skinMat,
  );
  cranium.castShadow = true;
  head.add(cranium);

  const capHelmet = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.18, 0.46),
    primaryMat,
  );
  capHelmet.position.set(0, 0.17, 0);
  capHelmet.castShadow = true;
  head.add(capHelmet);

  const crest = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.1, 0.48),
    accentMat,
  );
  crest.position.set(0, 0.25, 0.02);
  head.add(crest);

  // Visor faces forward (-Z)
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.13, 0.08),
    visorMat,
  );
  visor.position.set(0, 0.03, -0.2);
  head.add(visor);

  // Backpack / Jetpack Unit (on back +Z)
  const backpack = new THREE.Group();
  backpack.position.set(0, 0.02, 0.24);
  torso.add(backpack);

  const packCore = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.48, 0.18),
    secondaryMat,
  );
  packCore.castShadow = true;
  backpack.add(packCore);

  const thrusterGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.34, 10);
  const thrusterMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    metalness: 0.85,
    roughness: 0.22,
  });
  const leftThruster = new THREE.Mesh(thrusterGeo, thrusterMat);
  leftThruster.position.set(-0.15, -0.05, 0.05);
  backpack.add(leftThruster);

  const rightThruster = new THREE.Mesh(thrusterGeo, thrusterMat);
  rightThruster.position.set(0.15, -0.05, 0.05);
  backpack.add(rightThruster);

  const packGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.22, 0.05),
    accentMat,
  );
  packGlow.position.set(0, 0.04, 0.09);
  backpack.add(packGlow);

  // Jetpack flames (hidden unless jetpack active)
  const jetFlames = new THREE.Group();
  jetFlames.visible = false;
  backpack.add(jetFlames);

  const flameMat = new THREE.MeshBasicMaterial({
    color: '#fb923c',
    transparent: true,
    opacity: 0.92,
  });
  const innerFlameMat = new THREE.MeshBasicMaterial({
    color: '#fef08a',
  });
  [-0.15, 0.15].forEach((x) => {
    const outer = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.55, 8),
      flameMat,
    );
    outer.rotation.x = Math.PI;
    outer.position.set(x, -0.46, 0.05);
    jetFlames.add(outer);

    const inner = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.35, 8),
      innerFlameMat,
    );
    inner.rotation.x = Math.PI;
    inner.position.set(x, -0.36, 0.05);
    jetFlames.add(inner);
  });

  // Arms (pivoted at shoulder)
  const makeArm = (side: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.41, 0.24, 0);

    const sleeve = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.32, 0.2),
      primaryMat,
    );
    sleeve.position.set(0, -0.14, 0);
    sleeve.castShadow = true;
    arm.add(sleeve);

    const forearm = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.26, 0.16),
      skinMat,
    );
    forearm.position.set(0, -0.4, 0);
    arm.add(forearm);

    const glove = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.14, 0.18),
      accentMat,
    );
    glove.position.set(0, -0.54, 0);
    arm.add(glove);

    torso.add(arm);
    return arm;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);

  // Legs (pivoted at hip y = 0.72)
  const makeLeg = (side: -1 | 1) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.17, 0.72, 0);

    const thigh = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.38, 0.24),
      secondaryMat,
    );
    thigh.position.set(0, -0.18, 0);
    thigh.castShadow = true;
    leg.add(thigh);

    const shin = new THREE.Mesh(
      new THREE.BoxGeometry(0.19, 0.26, 0.2),
      secondaryMat,
    );
    shin.position.set(0, -0.46, 0);
    leg.add(shin);

    const shoe = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.14, 0.34),
      accentMat,
    );
    shoe.position.set(0, -0.65, -0.05);
    shoe.castShadow = true;
    leg.add(shoe);

    bodyPivot.add(leg);
    return leg;
  };

  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);

  // Hoverboard under feet (hidden until active)
  const hoverboard = new THREE.Group();
  hoverboard.visible = false;
  hoverboard.position.set(0, 0.12, 0);
  group.add(hoverboard);

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.09, 1.85),
    new THREE.MeshStandardMaterial({
      color: '#06b6d4',
      metalness: 0.7,
      roughness: 0.22,
    }),
  );
  hoverboard.add(deck);

  const deckTrim = new THREE.Mesh(
    new THREE.BoxGeometry(0.74, 0.04, 1.5),
    new THREE.MeshBasicMaterial({ color: '#67e8f9' }),
  );
  hoverboard.add(deckTrim);

  const underGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.04, 1.4),
    new THREE.MeshBasicMaterial({
      color: '#22d3ee',
      transparent: true,
      opacity: 0.75,
    }),
  );
  underGlow.position.set(0, -0.06, 0);
  hoverboard.add(underGlow);

  // Super Shield Energy Dome (hidden unless shield active)
  const shieldDome = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.32, 1),
    new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      wireframe: true,
      transparent: true,
      opacity: 0.52,
    }),
  );
  shieldDome.position.set(0, 1.05, 0);
  shieldDome.visible = false;
  group.add(shieldDome);

  return {
    group,
    bodyPivot,
    head,
    torso,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    backpack,
    jetFlames,
    shieldDome,
    hoverboard,
  };
}

export function buildCoinMesh(): THREE.Group {
  const g = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: '#fbbf24',
    metalness: 0.88,
    roughness: 0.16,
    emissive: '#d97706',
    emissiveIntensity: 0.35,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: '#fef08a',
    metalness: 0.9,
    roughness: 0.12,
  });

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.11, 16),
    goldMat,
  );
  disc.rotation.x = Math.PI / 2;
  g.add(disc);

  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.13, 12),
    rimMat,
  );
  inner.rotation.x = Math.PI / 2;
  g.add(inner);

  const star = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.28, 0.15),
    goldMat,
  );
  g.add(star);

  return g;
}

export function buildGemMesh(): THREE.Group {
  const g = new THREE.Group();
  const gemMat = new THREE.MeshStandardMaterial({
    color: '#e879f9',
    metalness: 0.4,
    roughness: 0.1,
    emissive: '#c026d3',
    emissiveIntensity: 0.65,
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), gemMat);
  g.add(core);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.04, 8, 20),
    new THREE.MeshBasicMaterial({ color: '#f5d0fe' }),
  );
  halo.rotation.x = Math.PI / 3;
  g.add(halo);
  return g;
}

export function buildPowerUpModel(type: PowerUpType): THREE.Group {
  const g = new THREE.Group();

  const glowRing = (color: string) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.045, 8, 24),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -0.35;
    g.add(ring);

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 12, 12),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.16,
      }),
    );
    g.add(orb);
  };

  if (type === 'magnet') {
    const redMat = new THREE.MeshStandardMaterial({
      color: '#ef4444',
      metalness: 0.6,
      roughness: 0.25,
      emissive: '#dc2626',
      emissiveIntensity: 0.35,
    });
    const tipMat = new THREE.MeshStandardMaterial({
      color: '#e2e8f0',
      metalness: 0.9,
      roughness: 0.15,
    });
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.11, 10, 18, Math.PI),
      redMat,
    );
    arch.position.y = 0.08;
    g.add(arch);

    [-0.32, 0.32].forEach((x) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.26, 10),
        redMat,
      );
      leg.position.set(x, -0.05, 0);
      g.add(leg);

      const tip = new THREE.Mesh(
        new THREE.CylinderGeometry(0.115, 0.115, 0.14, 10),
        tipMat,
      );
      tip.position.set(x, -0.24, 0);
      g.add(tip);
    });
    glowRing('#ef4444');
  } else if (type === 'shield') {
    const shieldMat = new THREE.MeshStandardMaterial({
      color: '#38bdf8',
      metalness: 0.75,
      roughness: 0.15,
      emissive: '#0284c7',
      emissiveIntensity: 0.55,
    });
    const prism = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 0),
      shieldMat,
    );
    prism.scale.set(1, 1.2, 0.55);
    g.add(prism);

    const frame = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.05, 8, 6),
      new THREE.MeshBasicMaterial({ color: '#bae6fd' }),
    );
    g.add(frame);
    glowRing('#38bdf8');
  } else if (type === 'jetpack') {
    const orangeMat = new THREE.MeshStandardMaterial({
      color: '#f97316',
      metalness: 0.65,
      roughness: 0.25,
      emissive: '#ea580c',
      emissiveIntensity: 0.35,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      metalness: 0.9,
      roughness: 0.2,
    });
    [-0.18, 0.18].forEach((x) => {
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.62, 12),
        orangeMat,
      );
      tank.position.set(x, 0.04, 0);
      g.add(tank);

      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 10, 8),
        metalMat,
      );
      cap.position.set(x, 0.34, 0);
      g.add(cap);

      const nozzle = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.2, 10),
        metalMat,
      );
      nozzle.position.set(x, -0.32, 0);
      g.add(nozzle);
    });
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.28, 0.16),
      metalMat,
    );
    g.add(bridge);
    glowRing('#f97316');
  } else if (type === 'speed') {
    const boltMat = new THREE.MeshStandardMaterial({
      color: '#facc15',
      metalness: 0.7,
      roughness: 0.18,
      emissive: '#eab308',
      emissiveIntensity: 0.6,
    });
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.45, 0.14), boltMat);
    top.position.set(0.08, 0.18, 0);
    top.rotation.z = -0.35;
    g.add(top);

    const bot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.45, 0.14), boltMat);
    bot.position.set(-0.08, -0.15, 0);
    bot.rotation.z = -0.35;
    g.add(bot);

    const wing = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.04, 8, 20),
      new THREE.MeshBasicMaterial({ color: '#fef08a' }),
    );
    g.add(wing);
    glowRing('#eab308');
  } else if (type === 'hoverboard') {
    const boardMat = new THREE.MeshStandardMaterial({
      color: '#06b6d4',
      metalness: 0.75,
      roughness: 0.2,
      emissive: '#0891b2',
      emissiveIntensity: 0.45,
    });
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.08, 0.95),
      boardMat,
    );
    deck.rotation.set(0.3, 0.5, 0.2);
    g.add(deck);

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.04, 0.7),
      new THREE.MeshBasicMaterial({ color: '#a5f3fc' }),
    );
    rail.rotation.copy(deck.rotation);
    g.add(rail);
    glowRing('#22d3ee');
  } else {
    // doubleCoins
    const greenMat = new THREE.MeshStandardMaterial({
      color: '#22c55e',
      metalness: 0.75,
      roughness: 0.18,
      emissive: '#16a34a',
      emissiveIntensity: 0.5,
    });
    const coinA = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.1, 16),
      greenMat,
    );
    coinA.rotation.x = Math.PI / 2;
    coinA.position.set(-0.16, 0.08, 0.04);
    g.add(coinA);

    const coinB = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.32, 0.1, 16),
      new THREE.MeshStandardMaterial({
        color: '#facc15',
        metalness: 0.85,
        roughness: 0.15,
        emissive: '#ca8a04',
        emissiveIntensity: 0.4,
      }),
    );
    coinB.rotation.x = Math.PI / 2;
    coinB.position.set(0.16, -0.08, -0.04);
    g.add(coinB);
    glowRing('#22c55e');
  }

  return g;
}

export function buildMcqPowerModel(): THREE.Group {
  const g = new THREE.Group();

  const prismMat = new THREE.MeshStandardMaterial({
    color: '#a855f7',
    metalness: 0.75,
    roughness: 0.14,
    emissive: '#9333ea',
    emissiveIntensity: 0.68,
  });

  const goldRingMat = new THREE.MeshBasicMaterial({
    color: '#fde047',
  });

  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.48, 0),
    prismMat,
  );
  core.scale.set(0.95, 1.25, 0.95);
  g.add(core);

  const innerBeacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.24, 0),
    new THREE.MeshBasicMaterial({ color: '#fef08a' }),
  );
  g.add(innerBeacon);

  const orbitA = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.055, 8, 24),
    goldRingMat,
  );
  orbitA.rotation.x = Math.PI / 3;
  g.add(orbitA);

  const orbitB = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.045, 8, 24),
    new THREE.MeshBasicMaterial({ color: '#22d3ee' }),
  );
  orbitB.rotation.y = Math.PI / 3;
  g.add(orbitB);

  const baseRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.05, 8, 24),
    new THREE.MeshBasicMaterial({
      color: '#facc15',
      transparent: true,
      opacity: 0.9,
    }),
  );
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = -0.45;
  g.add(baseRing);

  return g;
}

export function buildObstacleModel(
  kind: ObstacleKind,
  world: WorldConfig,
  maxAnisotropy: number,
): THREE.Group {
  const g = new THREE.Group();
  const stripeTex = createHazardStripeTexture(
    world.obstaclePrimary,
    world.obstacleSecondary,
    maxAnisotropy,
  );
  const stripeMat = new THREE.MeshStandardMaterial({
    map: stripeTex,
    roughness: 0.4,
    metalness: 0.16,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: '#64748b',
    metalness: 0.82,
    roughness: 0.24,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: '#0f172a',
    metalness: 0.25,
    roughness: 0.82,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#0b1322',
    roughness: 0.08,
    metalness: 0.85,
    clearcoat: 1.0,
  });

  const addWheelSet = (positions: [number, number][], radius = 0.36, width = 0.26, rimColor = '#cbd5e1') => {
    const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 14);
    const rimGeo = new THREE.CylinderGeometry(radius * 0.56, radius * 0.56, width + 0.02, 10);
    const rimMat = new THREE.MeshStandardMaterial({
      color: rimColor,
      metalness: 0.85,
      roughness: 0.22,
    });
    positions.forEach(([wx, wz]) => {
      const tire = new THREE.Mesh(tireGeo, darkMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wx, radius, wz);
      tire.castShadow = true;
      g.add(tire);

      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, radius, wz);
      g.add(rim);
    });
  };

  // =========================================================================
  // WORLD 1: MODERN CITY
  // =========================================================================
  if (world.id === 'city') {
    if (kind === 'barrier_low') {
      // City Construction Barrier + Reflective Orange Traffic Cones
      const beam = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.38, 0.18), stripeMat);
      beam.position.set(0, 0.74, 0);
      beam.castShadow = true;
      g.add(beam);

      const coneMat = new THREE.MeshStandardMaterial({ color: '#f97316', roughness: 0.52, metalness: 0.05 });
      const whiteMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.35 });
      [-0.88, 0.88].forEach((x) => {
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.42), darkMat);
        base.position.set(x, 0.04, 0);
        g.add(base);
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.68, 12), coneMat);
        cone.position.set(x, 0.38, 0);
        cone.castShadow = true;
        g.add(cone);
        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.14, 12), whiteMat);
        collar.position.set(x, 0.44, 0);
        g.add(collar);
      });
      const strobe = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({ color: '#fbbf24' }),
      );
      strobe.position.set(0, 0.98, 0);
      g.add(strobe);
      return g;
    }

    if (kind === 'barrier_high') {
      // Overhead Metro Highway Gantry Sign (slide under)
      [-1.08, 1.08].forEach((x) => {
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.48, 10), metalMat);
        pillar.position.set(x, 1.24, 0);
        pillar.castShadow = true;
        g.add(pillar);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.48), darkMat);
        foot.position.set(x, 0.07, 0);
        g.add(foot);
      });
      const signBoard = new THREE.Mesh(
        new THREE.BoxGeometry(2.36, 0.96, 0.24),
        new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.42, metalness: 0.25 }),
      );
      signBoard.position.set(0, 1.94, 0);
      signBoard.castShadow = true;
      g.add(signBoard);
      const border = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.78, 0.27), stripeMat);
      border.position.set(0, 1.94, 0);
      g.add(border);
      const lowWarn = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.16, 0.3),
        new THREE.MeshBasicMaterial({ color: '#facc15' }),
      );
      lowWarn.position.set(0, 1.38, 0);
      g.add(lowWarn);
      return g;
    }

    if (kind === 'roadblock') {
      // Concrete Jersey Barrier + Triple Traffic Cones + Work Lamps
      const concrete = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.88, 0.85),
        new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.85, metalness: 0.05 }),
      );
      concrete.position.set(0, 0.44, 0);
      concrete.castShadow = true;
      g.add(concrete);
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.46, 0.34), stripeMat);
      topRail.position.set(0, 1.12, 0);
      g.add(topRail);
      const coneMat = new THREE.MeshStandardMaterial({ color: '#ff5500', roughness: 0.45 });
      [-0.75, 0, 0.75].forEach((x) => {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.56, 10), coneMat);
        c.position.set(x, 1.24, 0.28);
        g.add(c);
      });
      return g;
    }

    if (kind === 'car') {
      // Sleek Modern City Taxi / Sedan
      const carMat = new THREE.MeshPhysicalMaterial({
        color: '#facc15',
        roughness: 0.22,
        metalness: 0.55,
        clearcoat: 0.9,
      });
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.66, 4.25), carMat);
      chassis.position.set(0, 0.62, 0);
      chassis.castShadow = true;
      g.add(chassis);

      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.56, 2.15), carMat);
      cabin.position.set(0, 1.2, -0.15);
      cabin.castShadow = true;
      g.add(cabin);

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.46, 2.22), glassMat);
      windshield.position.set(0, 1.2, -0.15);
      g.add(windshield);

      const checker = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.14, 3.6), stripeMat);
      checker.position.set(0, 0.66, 0);
      g.add(checker);

      const taxiSign = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.18, 0.28),
        new THREE.MeshBasicMaterial({ color: '#fef08a' }),
      );
      taxiSign.position.set(0, 1.56, -0.05);
      g.add(taxiSign);

      [-0.7, 0.7].forEach((x) => {
        const hl = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.16, 0.08),
          new THREE.MeshBasicMaterial({ color: '#fef9c3' }),
        );
        hl.position.set(x, 0.62, 2.13);
        g.add(hl);
      });
      addWheelSet([[-0.96, 1.32], [0.96, 1.32], [-0.96, -1.32], [0.96, -1.32]], 0.34, 0.24);
      return g;
    }

    if (kind === 'van') {
      // City Delivery Van
      const cargoMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.42, metalness: 0.22 });
      const cabMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.34, metalness: 0.48 });
      const cargo = new THREE.Mesh(new THREE.BoxGeometry(2.14, 1.68, 3.55), cargoMat);
      cargo.position.set(0, 1.24, -0.75);
      cargo.castShadow = true;
      g.add(cargo);

      const sideBrand = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.44, 3.1), cabMat);
      sideBrand.position.set(0, 1.34, -0.75);
      g.add(sideBrand);

      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.06, 1.35, 1.55), cabMat);
      cab.position.set(0, 1.08, 1.72);
      cab.castShadow = true;
      g.add(cab);

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.66, 0.14), glassMat);
      windshield.position.set(0, 1.34, 2.48);
      g.add(windshield);

      [-0.72, 0.72].forEach((x) => {
        const hl = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.16, 0.08),
          new THREE.MeshBasicMaterial({ color: '#fef08a' }),
        );
        hl.position.set(x, 0.7, 2.5);
        g.add(hl);
      });
      addWheelSet([[-1.0, 1.55], [1.0, 1.55], [-1.0, -1.65], [1.0, -1.65]], 0.38, 0.26);
      return g;
    }
  }

  // =========================================================================
  // WORLD 2: TROPICAL JUNGLE
  // =========================================================================
  if (world.id === 'jungle') {
    const barkMat = new THREE.MeshStandardMaterial({ color: '#5c3419', roughness: 0.9, metalness: 0.04 });
    const mossMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.72, metalness: 0.04 });
    const rockMat = new THREE.MeshStandardMaterial({ color: '#57534e', roughness: 0.86, metalness: 0.08 });
    const plankMat = new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.84, metalness: 0.04 });

    if (kind === 'barrier_low') {
      // Fallen Mossy Wooden Log (jump over)
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 2.25, 10), barkMat);
      log.rotation.z = Math.PI / 2;
      log.position.set(0, 0.42, 0);
      log.castShadow = true;
      g.add(log);

      const ringMat = new THREE.MeshStandardMaterial({ color: '#d6b48c', roughness: 0.78 });
      [-1.13, 1.13].forEach((x) => {
        const cut = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 10), ringMat);
        cut.rotation.z = Math.PI / 2;
        cut.position.set(x, 0.42, 0);
        g.add(cut);
      });
      [-0.6, 0.2, 0.75].forEach((x, idx) => {
        const fern = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), mossMat);
        fern.position.set(x, 0.82, idx === 1 ? 0.1 : -0.08);
        g.add(fern);
      });
      return g;
    }

    if (kind === 'barrier_high') {
      // Broken Wooden Bridge Arch & Hanging Jungle Vines (slide under)
      [-1.08, 1.08].forEach((x) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 2.48, 8), barkMat);
        post.position.set(x, 1.24, 0);
        post.castShadow = true;
        g.add(post);
      });
      for (let i = -2; i <= 2; i++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 0.56), plankMat);
        plank.position.set(i * 0.46, 1.98 + (i % 2) * 0.08, 0);
        plank.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.14;
        plank.castShadow = true;
        g.add(plank);
      }
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.34, 0.26), barkMat);
      crossBeam.position.set(0, 1.62, 0);
      g.add(crossBeam);

      [-0.7, -0.2, 0.35, 0.8].forEach((x) => {
        const vine = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.52, 6), mossMat);
        vine.rotation.x = Math.PI;
        vine.position.set(x, 1.38, 0.12);
        g.add(vine);
      });
      return g;
    }

    if (kind === 'roadblock') {
      // Dense Jungle Vegetation & Jagged Boulders
      [
        [0, 0.65, 0, 0.82],
        [-0.68, 0.46, 0.2, 0.56],
        [0.68, 0.48, -0.15, 0.58],
      ].forEach(([bx, by, bz, r]) => {
        const boulder = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockMat);
        boulder.position.set(bx, by, bz);
        boulder.castShadow = true;
        g.add(boulder);
      });
      [-0.5, 0.15, 0.65].forEach((bx, idx) => {
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 0), mossMat);
        bush.position.set(bx, 1.18 + idx * 0.05, 0.06);
        bush.castShadow = true;
        g.add(bush);
      });
      return g;
    }

    if (kind === 'box_stack') {
      // Large Rocks + Bundled Timber Logs
      const rockBase = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), rockMat);
      rockBase.scale.set(1.15, 0.9, 1.0);
      rockBase.position.set(-0.2, 0.78, 0);
      rockBase.castShadow = true;
      g.add(rockBase);

      [0.45, 1.15].forEach((ly, idx) => {
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 1.95, 9), barkMat);
        log.rotation.z = Math.PI / 2;
        log.position.set(0.15, ly + 0.55, idx === 0 ? 0.35 : -0.2);
        log.castShadow = true;
        g.add(log);
      });
      const topMoss = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), mossMat);
      topMoss.position.set(0, 1.95, 0);
      g.add(topMoss);
      return g;
    }

    if (kind === 'car') {
      // Jungle Safari 4x4 Jeep
      const jeepMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.55, metalness: 0.25 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.76, 4.15), jeepMat);
      body.position.set(0, 0.74, 0);
      body.castShadow = true;
      g.add(body);

      const frameMat = new THREE.MeshStandardMaterial({ color: '#fef08a', roughness: 0.4, metalness: 0.5 });
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.22, 1.2), jeepMat);
      hood.position.set(0, 1.15, 1.25);
      g.add(hood);

      const cage = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.55, 2.2), frameMat);
      cage.position.set(0, 1.34, -0.45);
      g.add(cage);

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.5, 0.14), glassMat);
      windshield.position.set(0, 1.32, 0.62);
      g.add(windshield);

      addWheelSet([[-0.98, 1.35], [0.98, 1.35], [-0.98, -1.35], [0.98, -1.35]], 0.42, 0.3, '#84cc16');
      return g;
    }

    if (kind === 'van') {
      // Jungle Expedition Canvas-Top Carrier
      const bodyMat = new THREE.MeshStandardMaterial({ color: '#3f6212', roughness: 0.62, metalness: 0.25 });
      const canvasMat = new THREE.MeshStandardMaterial({ color: '#d6d3d1', roughness: 0.9, metalness: 0.02 });
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.92, 5.05), bodyMat);
      base.position.set(0, 0.84, 0);
      base.castShadow = true;
      g.add(base);

      const canopy = new THREE.Mesh(new THREE.BoxGeometry(2.04, 1.02, 3.4), canvasMat);
      canopy.position.set(0, 1.72, -0.75);
      canopy.castShadow = true;
      g.add(canopy);

      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.82, 1.35), bodyMat);
      cab.position.set(0, 1.56, 1.65);
      g.add(cab);

      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.54, 0.12), glassMat);
      windshield.position.set(0, 1.62, 2.3);
      g.add(windshield);

      addWheelSet([[-1.02, 1.55], [1.02, 1.55], [-1.02, -1.65], [1.02, -1.65]], 0.42, 0.3, '#ca8a04');
      return g;
    }

    if (kind === 'bus') {
      // Heavy Jungle Safari Expedition Bus
      const hullMat = new THREE.MeshStandardMaterial({ color: '#65a30d', roughness: 0.5, metalness: 0.32 });
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.22, 2.08, 6.2), hullMat);
      hull.position.set(0, 1.44, 0);
      hull.castShadow = true;
      g.add(hull);
      const rack = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 4.8), barkMat);
      rack.position.set(0, 2.58, -0.2);
      g.add(rack);
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.85, 0.14), glassMat);
      windshield.position.set(0, 1.72, 3.08);
      g.add(windshield);
      const bullbar = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.55, 0.22), metalMat);
      bullbar.position.set(0, 0.72, 3.16);
      g.add(bullbar);
      addWheelSet([[-1.04, 1.9], [1.04, 1.9], [-1.04, -1.9], [1.04, -1.9]], 0.44, 0.32, '#eab308');
      return g;
    }

    if (kind === 'ramp_train') {
      // Wooden Log & Plank Jungle Ramp
      const rampLen = 5.4;
      const rampHeight = 2.86;
      const angle = Math.atan2(rampHeight, rampLen);
      const hyp = Math.hypot(rampLen, rampHeight);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.26, hyp), plankMat);
      deck.position.set(0, rampHeight / 2 - 0.08, 0);
      deck.rotation.x = angle;
      deck.castShadow = true;
      g.add(deck);
      const vineStrip = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.28, hyp - 0.2),
        new THREE.MeshBasicMaterial({ color: '#a3e635' }),
      );
      vineStrip.position.copy(deck.position);
      vineStrip.rotation.copy(deck.rotation);
      g.add(vineStrip);
      [-1.08, 1.08].forEach((x) => {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, rampHeight * 0.85, 8), barkMat);
        post.position.set(x, (rampHeight * 0.85) / 2, -rampLen * 0.38);
        g.add(post);
      });
      return g;
    }
  }

  // =========================================================================
  // WORLD 3: DESERT HIGHWAY
  // =========================================================================
  if (world.id === 'desert') {
    const sandMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.9, metalness: 0.02 });
    const canyonMat = new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.86, metalness: 0.06 });
    const rustMat = new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.78, metalness: 0.35 });
    const cactusMat = new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.72 });

    if (kind === 'barrier_low') {
      // Sandbag Berm + Desert Hazard Bar
      for (let i = -2; i <= 2; i++) {
        const bag = new THREE.Mesh(
          new THREE.BoxGeometry(0.46, 0.28, 0.56),
          new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? '#d97706' : '#f59e0b', roughness: 0.9 }),
        );
        bag.position.set(i * 0.42, 0.14, 0);
        bag.castShadow = true;
        g.add(bag);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.34, 0.18), stripeMat);
      rail.position.set(0, 0.72, 0);
      rail.castShadow = true;
      g.add(rail);
      [-0.9, 0.9].forEach((x) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.88, 0.18), rustMat);
        post.position.set(x, 0.44, 0);
        g.add(post);
      });
      return g;
    }

    if (kind === 'barrier_high') {
      // Canyon Highway Rusty Pipe Arch & Hanging Route Sign (slide under)
      [-1.08, 1.08].forEach((x) => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.48, 8), rustMat);
        pipe.position.set(x, 1.24, 0);
        pipe.castShadow = true;
        g.add(pipe);
      });
      const sign = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.96, 0.26), stripeMat);
      sign.position.set(0, 1.9, 0);
      sign.castShadow = true;
      g.add(sign);
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(1.75, 0.18, 0.3),
        new THREE.MeshBasicMaterial({ color: '#fde047' }),
      );
      plate.position.set(0, 1.34, 0);
      g.add(plate);
      return g;
    }

    if (kind === 'roadblock') {
      // Red Canyon Rock Outcrop & Barrel Cacti
      const rockA = new THREE.Mesh(new THREE.DodecahedronGeometry(0.78, 0), canyonMat);
      rockA.position.set(-0.35, 0.65, 0);
      rockA.castShadow = true;
      g.add(rockA);
      const rockB = new THREE.Mesh(new THREE.DodecahedronGeometry(0.58, 0), rustMat);
      rockB.position.set(0.58, 0.48, 0.15);
      rockB.castShadow = true;
      g.add(rockB);
      const cactus = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 1.15, 8), cactusMat);
      cactus.position.set(0.15, 0.95, -0.15);
      g.add(cactus);
      return g;
    }

    if (kind === 'box_stack') {
      // Desert Sand Pile + Hazard Fuel Drums
      const dune = new THREE.Mesh(new THREE.ConeGeometry(1.18, 1.25, 7), sandMat);
      dune.position.set(-0.15, 0.62, 0);
      dune.castShadow = true;
      g.add(dune);
      const drumA = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.1, 10), stripeMat);
      drumA.position.set(0.55, 0.55, 0.25);
      drumA.castShadow = true;
      g.add(drumA);
      const rockCap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52, 0), canyonMat);
      rockCap.position.set(-0.2, 1.52, -0.1);
      g.add(rockCap);
      return g;
    }

    if (kind === 'car') {
      // Off-Road Desert Jeep / Dune Buggy
      const buggyMat = new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.42, metalness: 0.42 });
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.66, 4.1), buggyMat);
      hull.position.set(0, 0.72, 0);
      hull.castShadow = true;
      g.add(hull);
      const rollBar = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.55, 1.9), darkMat);
      rollBar.position.set(0, 1.28, -0.2);
      g.add(rollBar);
      const lightBar = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.16, 0.16),
        new THREE.MeshBasicMaterial({ color: '#fef08a' }),
      );
      lightBar.position.set(0, 1.54, 0.65);
      g.add(lightBar);
      addWheelSet([[-0.98, 1.38], [0.98, 1.38], [-0.98, -1.38], [0.98, -1.38]], 0.44, 0.32, '#fb923c');
      return g;
    }

    if (kind === 'van') {
      // Rusted Abandoned Desert Pickup Wreck
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.35, 1.85), rustMat);
      cab.position.set(0, 1.08, 0.95);
      cab.rotation.z = 0.04;
      cab.castShadow = true;
      g.add(cab);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.76, 2.85), rustMat);
      bed.position.set(0, 0.78, -1.25);
      bed.rotation.z = 0.04;
      bed.castShadow = true;
      g.add(bed);
      const sandDrift = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.85, 6), sandMat);
      sandDrift.position.set(0.35, 0.42, -1.2);
      g.add(sandDrift);
      const crackedGlass = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.58, 0.12), glassMat);
      crackedGlass.position.set(0, 1.35, 1.86);
      g.add(crackedGlass);
      addWheelSet([[-1.0, 1.45], [1.0, 1.45], [-1.0, -1.55], [1.0, -1.55]], 0.36, 0.26, '#78350f');
      return g;
    }

    if (kind === 'bus') {
      // Heavy Armored Desert Convoy Truck
      const truckMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.48, metalness: 0.38 });
      const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.22, 2.05, 4.3), truckMat);
      trailer.position.set(0, 1.48, -0.9);
      trailer.castShadow = true;
      g.add(trailer);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(2.12, 1.78, 1.75), rustMat);
      cab.position.set(0, 1.34, 2.15);
      cab.castShadow = true;
      g.add(cab);
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.66, 0.14), glassMat);
      windshield.position.set(0, 1.65, 3.0);
      g.add(windshield);
      [-0.78, 0.78].forEach((x) => {
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.3, 8), metalMat);
        stack.position.set(x, 2.1, 1.35);
        g.add(stack);
      });
      addWheelSet([[-1.04, 2.0], [1.04, 2.0], [-1.04, -1.75], [1.04, -1.75]], 0.44, 0.32, '#fbbf24');
      return g;
    }
  }

  // =========================================================================
  // WORLD 4: SNOW MOUNTAIN
  // =========================================================================
  if (world.id === 'snow') {
    const snowMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.55, metalness: 0.04 });
    const iceMat = new THREE.MeshPhysicalMaterial({
      color: '#7dd3fc',
      roughness: 0.12,
      metalness: 0.15,
      clearcoat: 1.0,
      emissive: '#0284c7',
      emissiveIntensity: 0.2,
    });
    const pineBark = new THREE.MeshStandardMaterial({ color: '#452815', roughness: 0.88 });
    const pineLeaf = new THREE.MeshStandardMaterial({ color: '#0f5132', roughness: 0.74 });

    if (kind === 'barrier_low') {
      // Snow-Dusted Fallen Pine Tree (jump over)
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 2.25, 9), pineBark);
      trunk.rotation.z = Math.PI / 2;
      trunk.position.set(0, 0.38, 0);
      trunk.castShadow = true;
      g.add(trunk);

      [-0.6, 0.35].forEach((x) => {
        const needles = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.85, 7), pineLeaf);
        needles.rotation.z = -Math.PI / 2;
        needles.position.set(x, 0.48, 0);
        g.add(needles);
      });
      const snowCap = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.22, 0.38), snowMat);
      snowCap.position.set(0, 0.74, 0);
      g.add(snowCap);
      return g;
    }

    if (kind === 'barrier_high') {
      // Alpine Icicle Arch & Ski Gate (slide under)
      [-1.08, 1.08].forEach((x) => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.48, 0.26), pineBark);
        pillar.position.set(x, 1.24, 0);
        pillar.castShadow = true;
        g.add(pillar);
      });
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.75, 0.32), stripeMat);
      lintel.position.set(0, 1.98, 0);
      lintel.castShadow = true;
      g.add(lintel);
      const drift = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.26, 0.36), snowMat);
      drift.position.set(0, 2.42, 0);
      g.add(drift);

      [-0.75, -0.25, 0.25, 0.75].forEach((x) => {
        const icicle = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.46, 6), iceMat);
        icicle.rotation.x = Math.PI;
        icicle.position.set(x, 1.38, 0.05);
        g.add(icicle);
      });
      return g;
    }

    if (kind === 'roadblock') {
      // Jagged Glacial Ice Blocks
      [
        [-0.48, 0.58, 0.05, 0.98, 1.15, 0.92, 0.1],
        [0.52, 0.48, -0.05, 0.92, 0.95, 0.88, -0.15],
        [0.05, 1.18, 0, 0.85, 0.72, 0.78, 0.22],
      ].forEach(([ix, iy, iz, w, h, d, rot]) => {
        const block = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), iceMat);
        block.position.set(ix, iy, iz);
        block.rotation.y = rot;
        block.castShadow = true;
        g.add(block);
      });
      return g;
    }

    if (kind === 'box_stack') {
      // Deep Snow Pile + Alpine Boulders + Ski Patrol Marker
      const moundA = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 8), snowMat);
      moundA.scale.set(1.15, 0.85, 0.95);
      moundA.position.set(-0.15, 0.65, 0);
      moundA.castShadow = true;
      g.add(moundA);
      const moundB = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), snowMat);
      moundB.position.set(0.35, 1.35, -0.1);
      g.add(moundB);
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 2.05, 8),
        new THREE.MeshBasicMaterial({ color: '#f43f5e' }),
      );
      pole.position.set(0.72, 1.05, 0.35);
      g.add(pole);
      return g;
    }

    if (kind === 'car') {
      // Alpine Tracked Snowmobile / Rescue 4x4
      const bodyMat = new THREE.MeshStandardMaterial({ color: '#e11d48', roughness: 0.32, metalness: 0.48 });
      const hull = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.72, 3.85), bodyMat);
      hull.position.set(0, 0.72, 0);
      hull.castShadow = true;
      g.add(hull);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.56, 1.85), snowMat);
      cabin.position.set(0, 1.24, -0.2);
      g.add(cabin);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.44, 0.14), glassMat);
      visor.position.set(0, 1.24, 0.7);
      g.add(visor);
      const beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, 0.18, 10),
        new THREE.MeshBasicMaterial({ color: '#fbbf24' }),
      );
      beacon.position.set(0, 1.6, -0.2);
      g.add(beacon);
      // Front skis + rear snow tracks
      [-0.75, 0.75].forEach((x) => {
        const ski = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 1.4), metalMat);
        ski.position.set(x, 0.1, 1.55);
        g.add(ski);
        const tread = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.48, 1.65), darkMat);
        tread.position.set(x, 0.26, -1.05);
        g.add(tread);
      });
      return g;
    }

    if (kind === 'van') {
      // Heavy Snow Plough Truck with Angled V-Blade!
      const ploughCabMat = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.35, metalness: 0.45 });
      const bladeMat = new THREE.MeshStandardMaterial({ color: '#facc15', roughness: 0.28, metalness: 0.65 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(2.08, 1.65, 3.75), ploughCabMat);
      body.position.set(0, 1.24, -0.45);
      body.castShadow = true;
      g.add(body);
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.68, 0.14), glassMat);
      windshield.position.set(0, 1.58, 1.4);
      g.add(windshield);

      // Angled front V-shaped snowplough blade (+Z facing player)
      const bladeL = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.88, 0.22), bladeMat);
      bladeL.position.set(-0.54, 0.56, 2.22);
      bladeL.rotation.y = 0.32;
      bladeL.castShadow = true;
      g.add(bladeL);
      const bladeR = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.88, 0.22), bladeMat);
      bladeR.position.set(0.54, 0.56, 2.22);
      bladeR.rotation.y = -0.32;
      bladeR.castShadow = true;
      g.add(bladeR);

      const beacon = new THREE.Mesh(
        new THREE.BoxGeometry(0.85, 0.16, 0.24),
        new THREE.MeshBasicMaterial({ color: '#fde047' }),
      );
      beacon.position.set(0, 2.15, 0.6);
      g.add(beacon);

      addWheelSet([[-1.0, 1.0], [1.0, 1.0], [-1.0, -1.55], [1.0, -1.55]], 0.42, 0.3, '#e2e8f0');
      return g;
    }

    if (kind === 'bus') {
      // Alpine Tracked Snowcat Transport
      const hullMat = new THREE.MeshStandardMaterial({ color: '#0284c7', roughness: 0.35, metalness: 0.45 });
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.18, 1.98, 5.95), hullMat);
      hull.position.set(0, 1.46, 0);
      hull.castShadow = true;
      g.add(hull);
      const snowRoof = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.22, 5.4), snowMat);
      snowRoof.position.set(0, 2.52, -0.1);
      g.add(snowRoof);
      const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.82, 0.14), glassMat);
      windshield.position.set(0, 1.72, 2.96);
      g.add(windshield);
      [-1.02, 1.02].forEach((x) => {
        const track = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.68, 5.4), darkMat);
        track.position.set(x, 0.35, 0);
        g.add(track);
      });
      return g;
    }
  }

  // =========================================================================
  // WORLD 5: FUTURISTIC NEON CITY
  // =========================================================================
  if (world.id === 'neon') {
    const cyberMetal = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.18, metalness: 0.88 });
    const cyanGlow = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
    const pinkGlow = new THREE.MeshBasicMaterial({ color: '#f43f5e' });
    const violetGlow = new THREE.MeshBasicMaterial({ color: '#e879f9' });

    if (kind === 'barrier_low') {
      // Laser Energy Barrier (jump over)
      [-0.98, 0.98].forEach((x) => {
        const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.96, 8), cyberMetal);
        pylon.position.set(x, 0.48, 0);
        pylon.castShadow = true;
        g.add(pylon);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), pinkGlow);
        cap.position.set(x, 0.96, 0);
        g.add(cap);
      });
      [0.45, 0.78].forEach((y) => {
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.96, 8), pinkGlow);
        beam.rotation.z = Math.PI / 2;
        beam.position.set(0, y, 0);
        g.add(beam);
      });
      return g;
    }

    if (kind === 'barrier_high') {
      // Overhead Holographic Laser Scanner Gate (slide under)
      [-1.08, 1.08].forEach((x) => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.48, 0.26), cyberMetal);
        pillar.position.set(x, 1.24, 0);
        pillar.castShadow = true;
        g.add(pillar);
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.2, 0.08), cyanGlow);
        strip.position.set(x, 1.24, 0.12);
        g.add(strip);
      });
      const topArch = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.72, 0.34), cyberMetal);
      topArch.position.set(0, 2.04, 0);
      g.add(topArch);
      const laserField = new THREE.Mesh(
        new THREE.BoxGeometry(1.98, 0.56, 0.14),
        new THREE.MeshBasicMaterial({ color: '#e879f9', transparent: true, opacity: 0.78 }),
      );
      laserField.position.set(0, 1.48, 0);
      g.add(laserField);
      return g;
    }

    if (kind === 'roadblock') {
      // Moving / Hovering Robotic Road Drone Obstacle
      const botGroup = new THREE.Group();
      botGroup.userData.hoverBob = true;
      g.add(botGroup);

      const chassis = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 1), cyberMetal);
      chassis.scale.set(1.25, 0.92, 0.95);
      chassis.position.set(0, 0.92, 0);
      chassis.castShadow = true;
      botGroup.add(chassis);

      const visor = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.22, 0.24), pinkGlow);
      visor.position.set(0, 0.98, 0.52);
      botGroup.add(visor);

      const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.07, 8, 20), cyanGlow);
      coreRing.rotation.x = Math.PI / 2;
      coreRing.position.set(0, 0.85, 0);
      coreRing.userData.spinAxis = 'z';
      botGroup.add(coreRing);

      [-0.78, 0.78].forEach((x) => {
        const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.44, 8), violetGlow);
        pod.position.set(x, 0.55, 0);
        botGroup.add(pod);
      });
      return g;
    }

    if (kind === 'box_stack') {
      // Glowing Cyber Energy Core Pylons
      const monolith = new THREE.Mesh(new THREE.BoxGeometry(1.78, 2.1, 1.55), cyberMetal);
      monolith.position.set(0, 1.05, 0);
      monolith.castShadow = true;
      g.add(monolith);
      [0.45, 1.15, 1.8].forEach((y, i) => {
        const ring = new THREE.Mesh(
          new THREE.BoxGeometry(1.9, 0.16, 1.66),
          i % 2 === 0 ? cyanGlow : violetGlow,
        );
        ring.position.set(0, y, 0);
        g.add(ring);
      });
      return g;
    }

    if (kind === 'car') {
      // Neon Racing Hypercar
      const bodyMat = new THREE.MeshPhysicalMaterial({
        color: '#1e1b4b',
        roughness: 0.14,
        metalness: 0.88,
        clearcoat: 1.0,
      });
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.52, 4.25), bodyMat);
      body.position.set(0, 0.52, 0);
      body.castShadow = true;
      g.add(body);

      const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.42, 2.05), glassMat);
      canopy.position.set(0, 0.94, -0.15);
      g.add(canopy);

      const underGlow = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.1, 4.3), cyanGlow);
      underGlow.position.set(0, 0.22, 0);
      g.add(underGlow);

      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.1, 0.42), pinkGlow);
      spoiler.position.set(0, 1.15, -1.9);
      g.add(spoiler);

      addWheelSet([[-0.98, 1.38], [0.98, 1.38], [-0.98, -1.38], [0.98, -1.38]], 0.34, 0.24, '#22d3ee');
      return g;
    }

    if (kind === 'van') {
      // Futuristic Flying Hover-Cruiser (hovers cleanly above track!)
      const hoverGroup = new THREE.Group();
      hoverGroup.userData.hoverBob = true;
      g.add(hoverGroup);

      const craft = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.88, 4.85), cyberMetal);
      craft.position.set(0, 1.28, 0);
      craft.castShadow = true;
      hoverGroup.add(craft);

      const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.52, 2.1), cyanGlow);
      cockpit.position.set(0, 1.72, 0.85);
      hoverGroup.add(cockpit);

      [-1.02, 1.02].forEach((x) => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 2.8), violetGlow);
        wing.position.set(x, 1.05, -0.2);
        hoverGroup.add(wing);
        const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.22, 10), cyanGlow);
        thruster.position.set(x * 0.72, 0.72, 0);
        hoverGroup.add(thruster);
      });
      return g;
    }

    if (kind === 'bus') {
      // Futuristic Cyber Maglev Transport
      const hull = new THREE.Mesh(new THREE.BoxGeometry(2.18, 1.98, 6.2), cyberMetal);
      hull.position.set(0, 1.48, 0);
      hull.castShadow = true;
      g.add(hull);
      const neonRail = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.24, 6.25), cyanGlow);
      neonRail.position.set(0, 1.12, 0);
      g.add(neonRail);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.72, 0.16), pinkGlow);
      visor.position.set(0, 1.82, 3.12);
      g.add(visor);
      const levGlow = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.18, 5.4), violetGlow);
      levGlow.position.set(0, 0.32, 0);
      g.add(levGlow);
      return g;
    }
  }

  // =========================================================================
  // SHARED FALLBACK / WORLD-COLORED BOX STACK, BUS, TRAIN, RAMP
  // =========================================================================
  if (kind === 'box_stack') {
    const crateTex = createCrateTexture(maxAnisotropy);
    const crateMat = new THREE.MeshStandardMaterial({
      map: crateTex,
      roughness: 0.72,
      metalness: 0.1,
    });
    const baseBox = new THREE.Mesh(new THREE.BoxGeometry(2.05, 1.35, 1.85), crateMat);
    baseBox.position.set(0, 0.675, 0);
    baseBox.castShadow = true;
    baseBox.receiveShadow = true;
    g.add(baseBox);

    const topBox = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.95, 1.35), crateMat);
    topBox.position.set(-0.15, 1.82, 0);
    topBox.rotation.y = 0.18;
    topBox.castShadow = true;
    g.add(topBox);

    const strap = new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.12, 1.88), metalMat);
    strap.position.set(0, 0.68, 0);
    g.add(strap);
  } else if (kind === 'bus') {
    const busMat = new THREE.MeshStandardMaterial({
      color: world.busColor,
      roughness: 0.35,
      metalness: 0.45,
    });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.22, 2.25, 6.2), busMat);
    hull.position.set(0, 1.48, 0);
    hull.castShadow = true;
    hull.receiveShadow = true;
    g.add(hull);

    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.92, 0.12), glassMat);
    windshield.position.set(0, 1.75, 3.06);
    g.add(windshield);

    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.78, 4.9), glassMat);
    sideGlass.position.set(0, 1.78, -0.1);
    g.add(sideGlass);

    const acPod = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.25, 2.2), metalMat);
    acPod.position.set(0, 2.72, -0.4);
    g.add(acPod);

    [-0.75, 0.75].forEach((x) => {
      const hl = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.2, 0.1),
        new THREE.MeshBasicMaterial({ color: '#fef08a' }),
      );
      hl.position.set(x, 0.85, 3.1);
      g.add(hl);
    });
    addWheelSet([[-1.02, 1.8], [1.02, 1.8], [-1.02, -1.8], [1.02, -1.8]], 0.42, 0.28);
  } else if (kind === 'train') {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: world.trainColor,
      roughness: 0.28,
      metalness: 0.6,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: world.accentColor,
      roughness: 0.3,
      metalness: 0.5,
      emissive: world.accentColor,
      emissiveIntensity: world.id === 'neon' ? 0.65 : 0.15,
    });

    const carriage = new THREE.Mesh(new THREE.BoxGeometry(2.34, 2.5, 11.4), bodyMat);
    carriage.position.set(0, 1.62, 0);
    carriage.castShadow = true;
    carriage.receiveShadow = true;
    g.add(carriage);

    const nose = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.5, 0.9), bodyMat);
    nose.position.set(0, 1.25, 5.85);
    nose.rotation.x = 0.22;
    g.add(nose);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.26, 11.45), trimMat);
    stripe.position.set(0, 1.2, 0);
    g.add(stripe);

    const frontGlass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.88, 0.16), glassMat);
    frontGlass.position.set(0, 2.02, 5.72);
    g.add(frontGlass);

    const sideWindows = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.72, 9.6), glassMat);
    sideWindows.position.set(0, 1.92, -0.2);
    g.add(sideWindows);

    [-0.74, 0.74].forEach((x) => {
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 10, 10),
        new THREE.MeshBasicMaterial({ color: '#fef9c3' }),
      );
      lamp.position.set(x, 0.95, 6.28);
      g.add(lamp);
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.42, 10.8), darkMat);
    chassis.position.set(0, 0.28, 0);
    g.add(chassis);
  } else if (kind === 'ramp_train') {
    const rampMat = new THREE.MeshStandardMaterial({
      color: world.id === 'snow' ? '#e2e8f0' : world.id === 'desert' ? '#b45309' : '#475569',
      roughness: 0.55,
      metalness: world.id === 'neon' ? 0.8 : 0.35,
    });
    const rampLen = 5.4;
    const rampHeight = 2.86;
    const angle = Math.atan2(rampHeight, rampLen);
    const hyp = Math.hypot(rampLen, rampHeight);

    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.24, hyp), rampMat);
    deck.position.set(0, rampHeight / 2 - 0.08, 0);
    deck.rotation.x = angle;
    deck.castShadow = true;
    deck.receiveShadow = true;
    g.add(deck);

    const chevronStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.27, hyp - 0.2),
      new THREE.MeshBasicMaterial({ color: world.accentColor }),
    );
    chevronStrip.position.copy(deck.position);
    chevronStrip.rotation.copy(deck.rotation);
    g.add(chevronStrip);

    [-1.08, 1.08].forEach((x) => {
      const support = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, rampHeight * 0.85, 0.35),
        darkMat,
      );
      support.position.set(x, (rampHeight * 0.85) / 2, -rampLen * 0.38);
      g.add(support);
    });
  }

  return g;
}

export function buildSceneryProp(
  worldId: WorldId,
  world: WorldConfig,
  variant: number,
): THREE.Group {
  const g = new THREE.Group();

  if (worldId === 'city') {
    if (variant % 3 === 0) {
      // Streetlight
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.14, 6.2, 8),
        new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.75, roughness: 0.28 }),
      );
      pole.position.y = 3.1;
      g.add(pole);

      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.14, 0.14),
        new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.75, roughness: 0.28 }),
      );
      arm.position.set(0.65, 6.1, 0);
      g.add(arm);

      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.12, 0.28),
        new THREE.MeshBasicMaterial({ color: '#fde047' }),
      );
      lamp.position.set(1.2, 5.98, 0);
      g.add(lamp);
    } else {
      // Modern Glass Skyscraper
      const h = 11 + (variant % 4) * 4.5;
      const w = 4.2 + (variant % 2) * 1.4;
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, w),
        new THREE.MeshStandardMaterial({
          color: variant % 2 === 0 ? '#1e3a5f' : '#2b4c7e',
          roughness: 0.28,
          metalness: 0.6,
        }),
      );
      tower.position.y = h / 2;
      g.add(tower);

      const crown = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.72, 1.2, w * 0.72),
        new THREE.MeshStandardMaterial({ color: '#0ea5e9', emissive: '#0284c7', emissiveIntensity: 0.48 }),
      );
      crown.position.y = h + 0.6;
      g.add(crown);

      const band = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.12, 0.45, w + 0.12),
        new THREE.MeshBasicMaterial({ color: '#7dd3fc' }),
      );
      band.position.y = h * 0.65;
      g.add(band);
    }
  } else if (worldId === 'jungle') {
    if (variant % 3 === 0) {
      // Ancient Temple Totem Pillar
      const stoneMat = new THREE.MeshStandardMaterial({ color: '#6b5e53', roughness: 0.88, metalness: 0.06 });
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 1.8), stoneMat);
      plinth.position.y = 0.45;
      g.add(plinth);
      const col = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4.4, 1.2), stoneMat);
      col.position.y = 3.1;
      g.add(col);
      const rune = new THREE.Mesh(
        new THREE.BoxGeometry(1.28, 0.4, 1.28),
        new THREE.MeshBasicMaterial({ color: '#10b981' }),
      );
      rune.position.y = 4.4;
      g.add(rune);
    } else {
      // Lush Palm Tree (trunk + 5 fronds)
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.38, 6.2, 8),
        new THREE.MeshStandardMaterial({ color: '#6b3a20', roughness: 0.86 }),
      );
      trunk.position.y = 3.1;
      trunk.rotation.z = (variant % 2 === 0 ? 1 : -1) * 0.08;
      g.add(trunk);

      const leafMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.68 });
      for (let i = 0; i < 5; i++) {
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.95, 3.1, 5), leafMat);
        frond.position.set(0, 6.1, 0);
        frond.rotation.z = Math.PI / 2.6;
        frond.rotation.y = (i * Math.PI * 2) / 5;
        g.add(frond);
      }
    }
  } else if (worldId === 'desert') {
    if (variant % 2 === 0) {
      // Saguaro Cactus
      const cactusMat = new THREE.MeshStandardMaterial({ color: '#3f8f11', roughness: 0.72 });
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 4.2, 10), cactusMat);
      stem.position.y = 2.1;
      g.add(stem);
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.5, 8), cactusMat);
      armL.position.set(-0.65, 2.5, 0);
      g.add(armL);
      const jointL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.32, 0.32), cactusMat);
      jointL.position.set(-0.35, 1.9, 0);
      g.add(jointL);
      const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8), cactusMat);
      armR.position.set(0.6, 2.9, 0);
      g.add(armR);
    } else {
      // Sandstone Canyon Mesa
      const h = 7 + (variant % 3) * 3.5;
      const rockMat = new THREE.MeshStandardMaterial({ color: '#b9380c', roughness: 0.88 });
      const mesa = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.1, h, 7), rockMat);
      mesa.position.y = h / 2;
      g.add(mesa);
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(2.7, 2.6, 0.9, 7),
        new THREE.MeshStandardMaterial({ color: '#ea580c', roughness: 0.82 }),
      );
      cap.position.y = h + 0.45;
      g.add(cap);
    }
  } else if (worldId === 'snow') {
    if (variant % 3 === 0) {
      // Alpine Snow Peak
      const h = 9 + (variant % 3) * 3;
      const rock = new THREE.Mesh(
        new THREE.ConeGeometry(3.8, h, 6),
        new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.82 }),
      );
      rock.position.y = h / 2;
      g.add(rock);
      const snowCap = new THREE.Mesh(
        new THREE.ConeGeometry(2.2, h * 0.48, 6),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.48 }),
      );
      snowCap.position.y = h * 0.78;
      g.add(snowCap);
    } else {
      // Snow-covered Pine Tree
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.34, 1.8, 8),
        new THREE.MeshStandardMaterial({ color: '#5c3a28', roughness: 0.88 }),
      );
      trunk.position.y = 0.9;
      g.add(trunk);
      const pineMat = new THREE.MeshStandardMaterial({ color: '#0f5132', roughness: 0.74 });
      const snowMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.45 });
      [
        [2.4, 2.2, 2.5],
        [4.0, 1.7, 2.2],
        [5.3, 1.15, 1.8],
      ].forEach(([y, r, ch]) => {
        const tier = new THREE.Mesh(new THREE.ConeGeometry(r, ch, 7), pineMat);
        tier.position.y = y;
        g.add(tier);
        const frost = new THREE.Mesh(new THREE.ConeGeometry(r * 0.72, ch * 0.45, 7), snowMat);
        frost.position.y = y + ch * 0.3;
        g.add(frost);
      });
    }
  } else {
    // Futuristic Neon City
    const h = 10 + (variant % 4) * 4;
    const monolith = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, h, 3.4),
      new THREE.MeshStandardMaterial({
        color: '#0f172a',
        metalness: 0.85,
        roughness: 0.18,
        emissive: '#1e1b4b',
        emissiveIntensity: 0.28,
      }),
    );
    monolith.position.y = h / 2;
    g.add(monolith);

    const neonColor = variant % 2 === 0 ? '#06b6d4' : '#e879f9';
    const neonStrip = new THREE.Mesh(
      new THREE.BoxGeometry(3.55, 0.35, 3.55),
      new THREE.MeshBasicMaterial({ color: neonColor }),
    );
    neonStrip.position.y = h * 0.75;
    g.add(neonStrip);

    const vertBeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, h * 0.9, 3.52),
      new THREE.MeshBasicMaterial({ color: world.accentColor }),
    );
    vertBeam.position.y = h * 0.45;
    g.add(vertBeam);
  }

  return g;
}
