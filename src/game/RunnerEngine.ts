import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  CHARACTERS,
  LANES,
  LANE_WIDTH,
  POWER_UPS,
  WORLDS,
  WORLD_ORDER,
  getPowerUpDuration,
} from './constants';
import {
  CharacterRig,
  buildCharacterModel,
  buildCoinMesh,
  buildGemMesh,
  buildMcqPowerModel,
  buildObstacleModel,
  buildPowerUpModel,
  buildSceneryProp,
} from './models';
import { createContactShadowTexture, createRoadTexture } from './textures';
import {
  ActivePowerUpState,
  CharacterId,
  GamePhase,
  GraphicsQuality,
  ObstacleKind,
  PowerUpType,
  RunHudState,
  RunSummary,
  WorldId,
  WorldTransitionBanner,
} from './types';
import { gameAudio } from './audio';

interface PooledObstacle {
  kind: ObstacleKind;
  mesh: THREE.Group;
  active: boolean;
  lane: number; // 0, 1, 2
  z: number;
  width: number;
  height: number;
  depth: number;
  clearanceBottom: number; // > 0 for barrier_high
  moveSpeed: number; // > 0 means moves toward player (+Z)
  isRamp: boolean;
  isTrainTop: boolean;
}

interface PooledCoin {
  mesh: THREE.Group;
  active: boolean;
  lane: number;
  x: number;
  y: number;
  z: number;
  magnetized: boolean;
}

interface PooledGem {
  mesh: THREE.Group;
  active: boolean;
  x: number;
  y: number;
  z: number;
}

interface PooledPowerUp {
  type: PowerUpType;
  mesh: THREE.Group;
  active: boolean;
  x: number;
  y: number;
  z: number;
}

interface PooledMcqPower {
  rewardType: PowerUpType;
  mesh: THREE.Group;
  active: boolean;
  x: number;
  y: number;
  z: number;
}

interface PooledScenery {
  meshes: Partial<Record<WorldId, THREE.Group>>;
  activeWorld: WorldId;
  z: number;
  side: -1 | 1;
  xOffset: number;
  index: number;
}

interface Particle {
  mesh: THREE.Mesh;
  active: boolean;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: RunHudState) => void;
  onGameOver: (summary: RunSummary) => void;
  onMcqCollect: (rewardType: PowerUpType) => void;
}

const OBSTACLE_DIMS: Record<
  ObstacleKind,
  { w: number; h: number; d: number; clearance: number }
> = {
  barrier_low: { w: 2.1, h: 1.0, d: 0.55, clearance: 0 },
  barrier_high: { w: 2.2, h: 2.45, d: 0.45, clearance: 1.05 },
  box_stack: { w: 2.0, h: 2.25, d: 1.85, clearance: 0 },
  roadblock: { w: 2.2, h: 1.65, d: 0.95, clearance: 0 },
  car: { w: 2.1, h: 1.52, d: 4.3, clearance: 0 },
  van: { w: 2.18, h: 2.25, d: 5.2, clearance: 0 },
  bus: { w: 2.2, h: 2.65, d: 6.2, clearance: 0 },
  train: { w: 2.3, h: 2.86, d: 11.4, clearance: 0 },
  ramp_train: { w: 2.25, h: 2.86, d: 5.4, clearance: 0 },
};

const _vec3 = new THREE.Vector3();
const _color = new THREE.Color();

export class RunnerEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;

  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;

  // Lighting & Sky
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;

  // Ground & Track
  private roadMesh: THREE.Mesh;
  private roadMaterial: THREE.MeshStandardMaterial;
  private roadOverlayMesh: THREE.Mesh;
  private roadOverlayMaterial: THREE.MeshStandardMaterial;
  private roadTextureCache = new Map<WorldId, THREE.CanvasTexture>();
  private sideGroundMesh: THREE.Mesh;
  private sideGroundMat: THREE.MeshStandardMaterial;
  private contactShadow: THREE.Mesh;

  // World / Character / Quality
  private menuWorldId: WorldId = 'city';
  private worldId: WorldId = 'city';
  private startWorldIndex = 0;
  private worldIndex = 0;
  private worldLoop = 1;
  private worldElapsed = 0;
  private readonly worldDuration = 120; // ~2 minutes per world
  private worldTransitionActive = false;
  private worldTransitionElapsed = 0;
  private readonly worldTransitionDuration = 4.5;
  private transitionFromWorld: WorldId = 'city';
  private transitionToWorld: WorldId = 'city';
  private worldBannerTimer = 0;
  private worldBannerData: WorldTransitionBanner | null = null;
  private transitionFovBoost = 0;
  private readonly _fromColor = new THREE.Color();
  private readonly _toColor = new THREE.Color();

  private characterId: CharacterId = 'kai';
  private quality: GraphicsQuality = 'high';
  private playerRig!: CharacterRig;

  // Object Pools
  private worldObstaclePools = new Map<WorldId, PooledObstacle[]>();
  private activeObstacles: PooledObstacle[] = [];
  private coinPool: PooledCoin[] = [];
  private gemPool: PooledGem[] = [];
  private powerUpPool: PooledPowerUp[] = [];
  private mcqPowerPool: PooledMcqPower[] = [];
  private sceneryPool: PooledScenery[] = [];
  private particlePool: Particle[] = [];

  // Game State
  private phase: GamePhase = 'menu';
  private laneIndex = 1; // 0 = left, 1 = center, 2 = right
  private playerX = 0;
  private playerY = 0;
  private playerVy = 0;
  private groundY = 0;
  private slideTimer = 0;
  private jumpBuffered = false;
  private invulnTimer = 0;
  private crashTimer = 0;
  private runAnimTime = 0;

  // Run Progression & Stats
  private baseSpeed = 18.5;
  private currentSpeed = 18.5;
  private distance = 0;
  private score = 0;
  private runCoins = 0;
  private runJumps = 0;
  private runSlides = 0;
  private runPowerUps = 0;
  private nextSpawnZ = -34;
  private laneLastStationaryZ: [number, number, number] = [20, 20, 20];
  private nextPowerUpDist = 48;
  private nextMcqDist = 28;
  private nextJetpackCoinZ = -40;
  private lastBannerTimer = 0;
  private bannerText: string | null = null;
  private hudEmitAccum = 0;
  private cameraShake = 0;
  private activationPulseTimer = 0;

  // Power-ups & Inventory
  private powerUpLevels: Record<PowerUpType, number> = {
    magnet: 1,
    shield: 1,
    jetpack: 1,
    speed: 1,
    hoverboard: 1,
    doubleCoins: 1,
  };
  private activePowerUps = new Map<PowerUpType, { remaining: number; duration: number }>();
  private powerUpCooldowns = new Map<PowerUpType, number>();
  private availableHoverboards = 3;
  private hoverboardCooldown = 0;

  constructor(container: HTMLElement, callbacks: EngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.isSoftwareGl = this.detectSoftwareWebGL();
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    // Studio/Outdoor PBR Reflections via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    pmremGenerator.dispose();

    this.camera = new THREE.PerspectiveCamera(58, w / h, 0.1, 220);
    this.camera.position.set(0, 4.4, 7.8);

    // 3-Point Lighting Rig
    this.hemiLight = new THREE.HemisphereLight('#a8d8ff', '#374151', 1.05);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight('#fff5e0', 2.35);
    this.dirLight.position.set(16, 28, 18);
    this.dirLight.castShadow = !this.isSoftwareGl;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 2;
    this.dirLight.shadow.camera.far = 90;
    const d = 22;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.dirLight.shadow.normalBias = 0.02;
    this.scene.add(this.dirLight);

    this.rimLight = new THREE.DirectionalLight('#60a5fa', 0.85);
    this.rimLight.position.set(-12, 10, -25);
    this.scene.add(this.rimLight);

    // Road & Side Ground (plus overlay road for smooth cross-world blending)
    this.roadMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.72,
      metalness: 0.12,
    });
    this.roadMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(10.2, 220),
      this.roadMaterial,
    );
    this.roadMesh.rotation.x = -Math.PI / 2;
    this.roadMesh.position.set(0, 0, -90);
    this.roadMesh.receiveShadow = true;
    this.scene.add(this.roadMesh);

    this.roadOverlayMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.72,
      metalness: 0.12,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.roadOverlayMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(10.2, 220),
      this.roadOverlayMaterial,
    );
    this.roadOverlayMesh.rotation.x = -Math.PI / 2;
    this.roadOverlayMesh.position.set(0, 0.004, -90);
    this.roadOverlayMesh.receiveShadow = true;
    this.roadOverlayMesh.visible = false;
    this.scene.add(this.roadOverlayMesh);

    this.sideGroundMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      roughness: 0.92,
      metalness: 0.05,
    });
    this.sideGroundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(140, 220),
      this.sideGroundMat,
    );
    this.sideGroundMesh.rotation.x = -Math.PI / 2;
    this.sideGroundMesh.position.set(0, -0.03, -90);
    this.sideGroundMesh.receiveShadow = true;
    this.scene.add(this.sideGroundMesh);

    // Soft contact shadow under player
    const shadowTex = createContactShadowTexture();
    this.contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 1.6),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.6,
      }),
    );
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.contactShadow.position.set(0, 0.02, 0);
    this.scene.add(this.contactShadow);

    // Build initial character, pools & world
    this.buildPlayer(this.characterId);
    this.initStaticPools();
    this.applyWorldThemeImmediate(this.worldId);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Events
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      this.handleContextLost,
    );
    this.renderer.domElement.addEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
    );

    this.clock.start();
    this.tick();
  }

  private detectSoftwareWebGL(): boolean {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
  };

  private handleContextRestored = (): void => {
    this.clock.start();
    this.tick();
  };

  public handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    if (w <= 0 || h <= 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.updatePixelRatio();
  };

  private updatePixelRatio(): void {
    if (this.isSoftwareGl) {
      this.renderer.setPixelRatio(1);
    } else {
      const cap = this.quality === 'high' ? 2 : 1.25;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
    }
  }

  public setQuality(quality: GraphicsQuality): void {
    this.quality = quality;
    this.updatePixelRatio();
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && quality === 'high';
    this.dirLight.castShadow = !this.isSoftwareGl && quality === 'high';
  }

  public setWorld(worldId: WorldId): void {
    this.menuWorldId = worldId;
    if (this.phase !== 'menu') return;
    if (this.worldId === worldId && this.worldObstaclePools.has(worldId)) return;
    this.applyWorldThemeImmediate(worldId);
  }

  public setCharacter(characterId: CharacterId): void {
    if (this.characterId === characterId && this.playerRig) return;
    this.characterId = characterId;
    this.buildPlayer(characterId);
  }

  public setProgressionData(
    powerUpLevels: Record<PowerUpType, number>,
    hoverboards: number,
  ): void {
    this.powerUpLevels = { ...powerUpLevels };
    this.availableHoverboards = hoverboards;
  }

  private buildPlayer(characterId: CharacterId): void {
    if (this.playerRig) {
      this.scene.remove(this.playerRig.group);
    }
    this.playerRig = buildCharacterModel(CHARACTERS[characterId]);
    this.playerRig.group.position.set(this.playerX, this.playerY, 0);
    this.scene.add(this.playerRig.group);
  }

  private initStaticPools(): void {
    // 90 Coins
    for (let i = 0; i < 90; i++) {
      const mesh = buildCoinMesh();
      mesh.visible = false;
      this.scene.add(mesh);
      this.coinPool.push({
        mesh,
        active: false,
        lane: 1,
        x: 0,
        y: 1,
        z: 0,
        magnetized: false,
      });
    }

    // 6 Gems
    for (let i = 0; i < 6; i++) {
      const mesh = buildGemMesh();
      mesh.visible = false;
      this.scene.add(mesh);
      this.gemPool.push({ mesh, active: false, x: 0, y: 1, z: 0 });
    }

    // 18 Power-ups (3 of each type)
    const types: PowerUpType[] = [
      'magnet',
      'shield',
      'jetpack',
      'speed',
      'hoverboard',
      'doubleCoins',
    ];
    for (const t of types) {
      for (let i = 0; i < 3; i++) {
        const mesh = buildPowerUpModel(t);
        mesh.visible = false;
        this.scene.add(mesh);
        this.powerUpPool.push({ type: t, mesh, active: false, x: 0, y: 1.1, z: 0 });
      }
    }

    // 6 MCQ Science Power Collectibles
    for (let i = 0; i < 6; i++) {
      const mesh = buildMcqPowerModel();
      mesh.visible = false;
      this.scene.add(mesh);
      this.mcqPowerPool.push({
        rewardType: 'shield',
        mesh,
        active: false,
        x: 0,
        y: 1.25,
        z: 0,
      });
    }

    // 48 Particle sparks
    const pGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    for (let i = 0; i < 48; i++) {
      const pMat = new THREE.MeshBasicMaterial({ color: '#fbbf24' });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particlePool.push({
        mesh,
        active: false,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
      });
    }

    // 24 Roadside Scenery Slots (meshes attached per-world cleanly)
    for (let i = 0; i < 24; i++) {
      const side: -1 | 1 = i % 2 === 0 ? -1 : 1;
      const z = 12 - Math.floor(i / 2) * 12;
      const xOffset = side * (7.8 + (i % 3) * 1.45);
      this.sceneryPool.push({
        meshes: {},
        activeWorld: this.worldId,
        z,
        side,
        xOffset,
        index: i,
      });
    }
  }

  private getRoadTexture(worldId: WorldId): THREE.CanvasTexture {
    let tex = this.roadTextureCache.get(worldId);
    if (!tex) {
      tex = createRoadTexture(
        WORLDS[worldId],
        this.renderer.capabilities.getMaxAnisotropy(),
      );
      this.roadTextureCache.set(worldId, tex);
    }
    return tex;
  }

  private ensureWorldAssets(worldId: WorldId): void {
    const world = WORLDS[worldId];
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();

    // Ensure cached road texture
    this.getRoadTexture(worldId);

    // Ensure obstacle pool for this world
    if (!this.worldObstaclePools.has(worldId)) {
      const pool: PooledObstacle[] = [];
      const counts: Record<ObstacleKind, number> = {
        barrier_low: 8,
        barrier_high: 7,
        box_stack: 7,
        roadblock: 6,
        car: 6,
        van: 5,
        bus: 5,
        train: 7,
        ramp_train: 4,
      };

      (Object.keys(counts) as ObstacleKind[]).forEach((kind) => {
        const dims = OBSTACLE_DIMS[kind];
        for (let i = 0; i < counts[kind]; i++) {
          const mesh = buildObstacleModel(kind, world, maxAniso);
          mesh.visible = false;
          this.scene.add(mesh);
          pool.push({
            kind,
            mesh,
            active: false,
            lane: 1,
            z: 0,
            width: dims.w,
            height: dims.h,
            depth: dims.d,
            clearanceBottom: dims.clearance,
            moveSpeed: 0,
            isRamp: kind === 'ramp_train',
            isTrainTop:
              kind === 'train' ||
              kind === 'bus' ||
              kind === 'van' ||
              kind === 'car',
          });
        }
      });

      this.worldObstaclePools.set(worldId, pool);
    }

    // Ensure roadside scenery meshes for this world across all 24 slots
    for (const s of this.sceneryPool) {
      if (!s.meshes[worldId]) {
        const mesh = buildSceneryProp(worldId, world, s.index);
        mesh.position.set(s.xOffset, 0, s.z);
        if (s.side === 1) {
          mesh.rotation.y = Math.PI;
        }
        mesh.visible = false;
        this.scene.add(mesh);
        s.meshes[worldId] = mesh;
      }
    }
  }

  private applyWorldThemeImmediate(worldId: WorldId): void {
    this.worldId = worldId;
    this.ensureWorldAssets(worldId);
    this.worldTransitionActive = false;
    this.worldTransitionElapsed = 0;
    this.roadOverlayMesh.visible = false;
    this.roadOverlayMaterial.opacity = 0;

    const world = WORLDS[worldId];
    this.scene.background = new THREE.Color(world.skyColor);
    this.scene.fog = new THREE.Fog(world.fogColor, world.fogNear, world.fogFar);

    this.dirLight.color.set(world.sunColor);
    this.dirLight.intensity = world.sunIntensity;
    this.hemiLight.color.set(world.hemiSky);
    this.hemiLight.groundColor.set(world.hemiGround);
    this.hemiLight.intensity = world.hemiIntensity;
    this.rimLight.color.set(world.accentColor);

    this.roadMaterial.map = this.getRoadTexture(worldId);
    this.roadMaterial.needsUpdate = true;
    this.sideGroundMat.color.set(world.shoulderColor);

    for (const s of this.sceneryPool) {
      const prevMesh = s.meshes[s.activeWorld];
      if (prevMesh) prevMesh.visible = false;
      const nextMesh = s.meshes[worldId];
      if (nextMesh) {
        nextMesh.position.set(s.xOffset, 0, s.z);
        nextMesh.visible = true;
      }
      s.activeWorld = worldId;
    }
  }

  private beginWorldTransition(
    nextWorld: WorldId,
    newLoop: number,
    stageInLoop: number,
  ): void {
    const prevWorld = this.worldId;
    this.ensureWorldAssets(nextWorld);

    // Finalize any lingering road blend if a previous transition was incomplete
    if (this.worldTransitionActive) {
      this.roadMaterial.map = this.getRoadTexture(this.transitionToWorld);
      this.roadMaterial.needsUpdate = true;
    }

    this.worldId = nextWorld;
    this.worldLoop = newLoop;
    this.transitionFromWorld = prevWorld;
    this.transitionToWorld = nextWorld;
    this.worldTransitionActive = true;
    this.worldTransitionElapsed = 0;

    const nextTex = this.getRoadTexture(nextWorld);
    if (this.roadMaterial.map) {
      nextTex.offset.y = this.roadMaterial.map.offset.y;
    }
    this.roadOverlayMaterial.map = nextTex;
    this.roadOverlayMaterial.opacity = 0;
    this.roadOverlayMaterial.needsUpdate = true;
    this.roadOverlayMesh.visible = true;

    this.worldBannerData = { worldId: nextWorld, loop: newLoop, stageInLoop };
    this.worldBannerTimer = 3.8;
    this.transitionFovBoost = 4.5;
    this.invulnTimer = Math.max(this.invulnTimer, 0.9);

    const accent = WORLDS[nextWorld].accentColor;
    this.spawnBurst(this.playerX, this.playerY + 1.4, -2, accent, 18);
    gameAudio.setWorldTheme(nextWorld);
    gameAudio.playWorldTransition();
  }

  private updateWorldTransition(dt: number): void {
    if (!this.worldTransitionActive) return;

    this.worldTransitionElapsed += dt;
    const rawT = Math.min(
      1,
      this.worldTransitionElapsed / this.worldTransitionDuration,
    );
    const t = rawT * rawT * (3 - 2 * rawT); // smoothstep

    const from = WORLDS[this.transitionFromWorld];
    const to = WORLDS[this.transitionToWorld];

    if (this.scene.background instanceof THREE.Color) {
      this._fromColor.set(from.skyColor);
      this._toColor.set(to.skyColor);
      this.scene.background.copy(this._fromColor).lerp(this._toColor, t);
    }

    if (this.scene.fog instanceof THREE.Fog) {
      this._fromColor.set(from.fogColor);
      this._toColor.set(to.fogColor);
      this.scene.fog.color.copy(this._fromColor).lerp(this._toColor, t);
      this.scene.fog.near = THREE.MathUtils.lerp(from.fogNear, to.fogNear, t);
      this.scene.fog.far = THREE.MathUtils.lerp(from.fogFar, to.fogFar, t);
    }

    this._fromColor.set(from.sunColor);
    this._toColor.set(to.sunColor);
    this.dirLight.color.copy(this._fromColor).lerp(this._toColor, t);
    this.dirLight.intensity = THREE.MathUtils.lerp(
      from.sunIntensity,
      to.sunIntensity,
      t,
    );

    this._fromColor.set(from.hemiSky);
    this._toColor.set(to.hemiSky);
    this.hemiLight.color.copy(this._fromColor).lerp(this._toColor, t);

    this._fromColor.set(from.hemiGround);
    this._toColor.set(to.hemiGround);
    this.hemiLight.groundColor.copy(this._fromColor).lerp(this._toColor, t);
    this.hemiLight.intensity = THREE.MathUtils.lerp(
      from.hemiIntensity,
      to.hemiIntensity,
      t,
    );

    this._fromColor.set(from.accentColor);
    this._toColor.set(to.accentColor);
    this.rimLight.color.copy(this._fromColor).lerp(this._toColor, t);

    this._fromColor.set(from.shoulderColor);
    this._toColor.set(to.shoulderColor);
    this.sideGroundMat.color.copy(this._fromColor).lerp(this._toColor, t);

    this.roadOverlayMaterial.opacity = t;

    if (rawT >= 1) {
      this.worldTransitionActive = false;
      this.roadMaterial.map = this.getRoadTexture(this.transitionToWorld);
      this.roadMaterial.needsUpdate = true;
      this.roadOverlayMesh.visible = false;
      this.roadOverlayMaterial.opacity = 0;
    }
  }

  public startRun(startWorld?: WorldId): void {
    this.clearActiveTrackEntities();
    this.phase = 'playing';
    this.laneIndex = 1;
    this.playerX = 0;
    this.playerY = 0;
    this.playerVy = 0;
    this.groundY = 0;
    this.slideTimer = 0;
    this.jumpBuffered = false;
    this.invulnTimer = 0;
    this.crashTimer = 0;
    this.runAnimTime = 0;

    // Begin directly in the player's selected starting world and progress circularly
    const chosenWorld = startWorld ?? this.menuWorldId;
    this.menuWorldId = chosenWorld;
    const startIdx = Math.max(0, WORLD_ORDER.indexOf(chosenWorld));
    this.startWorldIndex = startIdx;
    this.worldIndex = startIdx;
    this.worldLoop = 1;
    this.worldElapsed = 0;
    this.transitionFovBoost = 0;
    this.worldBannerTimer = 2.8;
    this.worldBannerData = {
      worldId: WORLD_ORDER[startIdx],
      loop: 1,
      stageInLoop: 1,
    };
    this.applyWorldThemeImmediate(WORLD_ORDER[startIdx]);
    gameAudio.setWorldTheme(WORLD_ORDER[startIdx]);

    const charMult = CHARACTERS[this.characterId].speedMultiplier;
    this.baseSpeed = 19.0 * charMult;
    this.currentSpeed = this.baseSpeed;
    this.distance = 0;
    this.score = 0;
    this.runCoins = 0;
    this.runJumps = 0;
    this.runSlides = 0;
    this.runPowerUps = 0;
    this.nextSpawnZ = -32;
    this.laneLastStationaryZ = [20, 20, 20];
    this.nextPowerUpDist = 48;
    this.nextMcqDist = 28;
    this.hoverboardCooldown = 0;
    this.cameraShake = 0;
    this.activationPulseTimer = 0;
    this.bannerText = null;
    this.lastBannerTimer = 0;
    this.activePowerUps.clear();
    this.powerUpCooldowns.clear();

    this.playerRig.group.rotation.set(0, 0, 0);
    this.playerRig.bodyPivot.rotation.set(0, 0, 0);
    this.playerRig.bodyPivot.scale.setScalar(1);
    this.playerRig.shieldDome.visible = false;
    this.playerRig.hoverboard.visible = false;
    this.playerRig.jetFlames.visible = false;

    // Seed initial coins & patterns ahead
    for (let i = 0; i < 4; i++) {
      this.spawnNextWave();
    }
    this.emitHud();
  }

  public returnToMenu(): void {
    this.clearActiveTrackEntities();
    this.phase = 'menu';
    this.laneIndex = 1;
    this.playerX = 0;
    this.playerY = 0;
    this.playerVy = 0;
    this.slideTimer = 0;
    this.worldBannerTimer = 0;
    this.worldBannerData = null;
    this.transitionFovBoost = 0;
    this.activationPulseTimer = 0;
    this.activePowerUps.clear();
    this.playerRig.group.position.set(0, 0, 0);
    this.playerRig.group.rotation.set(0, 0, 0);
    this.playerRig.bodyPivot.rotation.set(0, 0, 0);
    this.playerRig.bodyPivot.scale.setScalar(1);
    this.playerRig.shieldDome.visible = false;
    this.playerRig.hoverboard.visible = false;
    this.playerRig.jetFlames.visible = false;
    this.applyWorldThemeImmediate(this.menuWorldId);
  }

  public pause(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      gameAudio.setPaused(true);
    }
  }

  public resume(): void {
    if (this.phase === 'paused') {
      this.phase = 'playing';
      this.clock.getDelta(); // reset delta spike
      gameAudio.setPaused(false);
    }
  }

  public resolveMcqAnswer(correct: boolean, rewardType: PowerUpType): void {
    if (this.phase !== 'mcq') return;
    this.phase = 'playing';
    this.clock.getDelta(); // reset delta spike
    gameAudio.setPaused(false);
    this.invulnTimer = Math.max(this.invulnTimer, 1.6);

    if (correct) {
      this.activatePowerUp(rewardType);
    } else {
      this.setBanner('POWER MISSED', 1.4);
    }
    this.emitHud();
  }

  // Player Input Handlers
  public moveLeft(): void {
    if (this.phase !== 'playing') return;
    if (this.laneIndex > 0) {
      this.laneIndex--;
      gameAudio.playLaneSwitch();
    }
  }

  public moveRight(): void {
    if (this.phase !== 'playing') return;
    if (this.laneIndex < 2) {
      this.laneIndex++;
      gameAudio.playLaneSwitch();
    }
  }

  public jump(): void {
    if (this.phase !== 'playing') return;
    if (this.activePowerUps.has('jetpack')) return;
    if (this.playerY <= this.groundY + 0.08) {
      this.playerVy = 13.8;
      this.slideTimer = 0;
      this.jumpBuffered = false;
      this.runJumps++;
      gameAudio.playJump();
    } else {
      this.jumpBuffered = true;
    }
  }

  public slide(): void {
    if (this.phase !== 'playing') return;
    if (this.activePowerUps.has('jetpack')) return;
    if (this.playerY > this.groundY + 0.15) {
      // Fast-fall slam!
      this.playerVy = Math.min(this.playerVy, -24);
    }
    this.slideTimer = 0.65;
    this.runSlides++;
    gameAudio.playSlide();
  }

  public activateHoverboard(): boolean {
    if (this.phase !== 'playing') return false;
    if (this.activePowerUps.has('hoverboard')) return false;
    if (this.hoverboardCooldown > 0) return false;
    if (this.availableHoverboards <= 0) {
      this.setBanner('NO HOVERBOARDS LEFT', 1.2);
      return false;
    }
    this.availableHoverboards--;
    this.hoverboardCooldown = POWER_UPS.hoverboard.cooldown;
    this.activatePowerUp('hoverboard');
    this.emitHud();
    return true;
  }

  private setBanner(text: string, duration = 1.6): void {
    this.bannerText = text;
    this.lastBannerTimer = duration;
  }

  private clearActiveTrackEntities(): void {
    this.worldObstaclePools.forEach((pool) => {
      for (const o of pool) {
        o.active = false;
        o.mesh.visible = false;
      }
    });
    this.activeObstacles = [];
    for (const c of this.coinPool) {
      c.active = false;
      c.magnetized = false;
      c.mesh.visible = false;
    }
    for (const g of this.gemPool) {
      g.active = false;
      g.mesh.visible = false;
    }
    for (const p of this.powerUpPool) {
      p.active = false;
      p.mesh.visible = false;
    }
    for (const m of this.mcqPowerPool) {
      m.active = false;
      m.mesh.visible = false;
    }
    for (const pt of this.particlePool) {
      pt.active = false;
      pt.mesh.visible = false;
    }
  }

  private spawnBurst(x: number, y: number, z: number, hexColor: string, count = 10): void {
    let spawned = 0;
    for (const p of this.particlePool) {
      if (!p.active) {
        p.active = true;
        p.life = 0;
        p.maxLife = 0.35 + Math.random() * 0.22;
        p.mesh.visible = true;
        p.mesh.position.set(x, y, z);
        p.mesh.scale.setScalar(1);
        (p.mesh.material as THREE.MeshBasicMaterial).color.set(hexColor);
        p.vx = (Math.random() - 0.5) * 9;
        p.vy = 2 + Math.random() * 6;
        p.vz = (Math.random() - 0.5) * 8;
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  private acquireObstacle(kind: ObstacleKind, lane: number, z: number, moveSpeed = 0): PooledObstacle | null {
    const pool = this.worldObstaclePools.get(this.worldId);
    if (!pool) return null;
    for (const o of pool) {
      if (!o.active && o.kind === kind) {
        o.active = true;
        o.lane = lane;
        o.z = z;
        o.moveSpeed = moveSpeed;
        o.mesh.visible = true;
        o.mesh.position.set(LANES[lane], 0, z);
        this.activeObstacles.push(o);
        return o;
      }
    }
    return null;
  }

  private spawnTrackObstacle(
    kind: ObstacleKind,
    lane: number,
    z: number,
    desiredMoveSpeed = 0,
  ): PooledObstacle | null {
    let moveSpeed = desiredMoveSpeed;
    // Prevent a moving vehicle from catching up to a stationary obstacle ahead in the same lane
    if (moveSpeed > 0 && this.laneLastStationaryZ[lane] - z < 44) {
      moveSpeed = 0;
    }
    if (moveSpeed === 0) {
      this.laneLastStationaryZ[lane] = Math.min(this.laneLastStationaryZ[lane], z);
    }
    return this.acquireObstacle(kind, lane, z, moveSpeed);
  }

  private spawnCoinLine(lane: number, startZ: number, count: number, spacing = 2.3, y = 0.9, arc = false): void {
    for (let i = 0; i < count; i++) {
      for (const c of this.coinPool) {
        if (!c.active) {
          c.active = true;
          c.magnetized = false;
          c.lane = lane;
          c.x = LANES[lane];
          c.y = arc ? y + Math.sin((i / Math.max(1, count - 1)) * Math.PI) * 1.9 : y;
          c.z = startZ - i * spacing;
          c.mesh.visible = true;
          c.mesh.position.set(c.x, c.y, c.z);
          break;
        }
      }
    }
  }

  private spawnGem(lane: number, z: number, y = 1.1): void {
    for (const g of this.gemPool) {
      if (!g.active) {
        g.active = true;
        g.x = LANES[lane];
        g.y = y;
        g.z = z;
        g.mesh.visible = true;
        g.mesh.position.set(g.x, g.y, g.z);
        return;
      }
    }
  }

  private spawnPowerUp(lane: number, z: number, y = 1.15): void {
    const allTypes: PowerUpType[] = [
      'magnet',
      'shield',
      'jetpack',
      'speed',
      'hoverboard',
      'doubleCoins',
    ];
    const eligible = allTypes.filter(
      (t) => !this.activePowerUps.has(t) && (this.powerUpCooldowns.get(t) || 0) <= 0,
    );
    const pool = eligible.length > 0 ? eligible : allTypes;
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    for (const p of this.powerUpPool) {
      if (!p.active && p.type === chosen) {
        p.active = true;
        p.x = LANES[lane];
        p.y = y;
        p.z = z;
        p.mesh.visible = true;
        p.mesh.position.set(p.x, p.y, p.z);
        return;
      }
    }
  }

  private spawnMcqPower(lane: number, z: number, y = 1.25): void {
    const allTypes: PowerUpType[] = [
      'magnet',
      'shield',
      'jetpack',
      'speed',
      'hoverboard',
      'doubleCoins',
    ];
    const eligible = allTypes.filter((t) => !this.activePowerUps.has(t));
    const pool = eligible.length > 0 ? eligible : allTypes;
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    for (const m of this.mcqPowerPool) {
      if (!m.active) {
        m.active = true;
        m.rewardType = chosen;
        m.x = LANES[lane];
        m.y = y;
        m.z = z;
        m.mesh.visible = true;
        m.mesh.position.set(m.x, m.y, m.z);
        return;
      }
    }
  }

  private spawnCityWave(z: number, safeLane: number, otherLanes: number[], loopMult: number): void {
    const p = Math.floor(Math.random() * 6);
    if (p === 0) {
      // Moving taxi/car + parked delivery van + jumpable city traffic barrier
      this.spawnTrackObstacle('car', otherLanes[0], z - 5, 7.5 * loopMult);
      this.spawnTrackObstacle('van', otherLanes[1], z - 3, 0);
      this.spawnTrackObstacle('barrier_low', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 3.5, 5, 2.0, 1.0, true);
    } else if (p === 1) {
      // Ramp onto parked metro train + moving city bus
      this.spawnTrackObstacle('ramp_train', safeLane, z, 0);
      this.spawnTrackObstacle('train', safeLane, z - 8.4, 0);
      this.spawnCoinLine(safeLane, z - 4.5, 5, 2.2, 3.7, false);
      this.spawnTrackObstacle('bus', otherLanes[0], z - 5, 5.8 * loopMult);
      this.spawnTrackObstacle('barrier_high', otherLanes[1], z - 1, 0);
    } else if (p === 2) {
      // Slide under highway gantry + construction crates + oncoming delivery van
      this.spawnTrackObstacle('barrier_high', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 4, 6, 2.2, 0.65, false);
      this.spawnTrackObstacle('box_stack', otherLanes[0], z - 2, 0);
      this.spawnTrackObstacle('van', otherLanes[1], z - 6, 6.2 * loopMult);
    } else if (p === 3) {
      // Multi-lane city rush: moving bus + moving car + open sprint lane
      this.spawnTrackObstacle('bus', otherLanes[0], z - 6, 6.5 * loopMult);
      this.spawnTrackObstacle('car', otherLanes[1], z - 4, 8.8 * loopMult);
      this.spawnCoinLine(safeLane, z + 2, 6, 2.2, 0.95, false);
    } else if (p === 4) {
      // Construction zone: cones/roadblock + parked taxi + slide gate
      this.spawnTrackObstacle('roadblock', otherLanes[0], z - 1, 0);
      this.spawnTrackObstacle('car', otherLanes[1], z - 3, 0);
      this.spawnTrackObstacle('barrier_high', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 3.5, 5, 2.0, 0.65, false);
    } else {
      // Dual metro trains with open express lane
      this.spawnTrackObstacle('train', otherLanes[0], z - 7, 10.0 * loopMult);
      this.spawnTrackObstacle('roadblock', otherLanes[1], z - 2, 0);
      this.spawnCoinLine(safeLane, z + 2, 7, 2.2, 0.95, false);
    }
  }

  private spawnJungleWave(z: number, safeLane: number, otherLanes: number[], loopMult: number): void {
    const p = Math.floor(Math.random() * 6);
    if (p === 0) {
      // Fallen mossy log to jump + dense boulders + moving safari jeep
      this.spawnTrackObstacle('barrier_low', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 3.5, 5, 2.0, 1.0, true);
      this.spawnTrackObstacle('roadblock', otherLanes[0], z - 2, 0);
      this.spawnTrackObstacle('car', otherLanes[1], z - 5, 6.4 * loopMult);
    } else if (p === 1) {
      // Wooden log ramp onto jungle train + hanging vine bridge
      this.spawnTrackObstacle('ramp_train', safeLane, z, 0);
      this.spawnTrackObstacle('train', safeLane, z - 8.4, 0);
      this.spawnCoinLine(safeLane, z - 4.5, 5, 2.2, 3.7, false);
      this.spawnTrackObstacle('barrier_high', otherLanes[0], z - 1, 0);
      this.spawnTrackObstacle('box_stack', otherLanes[1], z - 4, 0);
    } else if (p === 2) {
      // Slide under broken wooden vine bridge + canvas expedition van + boulders
      this.spawnTrackObstacle('barrier_high', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 4, 6, 2.2, 0.65, false);
      this.spawnTrackObstacle('van', otherLanes[0], z - 4, 4.8 * loopMult);
      this.spawnTrackObstacle('roadblock', otherLanes[1], z - 2, 0);
    } else if (p === 3) {
      // Heavy safari bus + timber/rock piles + clear trail
      this.spawnTrackObstacle('bus', otherLanes[0], z - 5, 5.2 * loopMult);
      this.spawnTrackObstacle('box_stack', otherLanes[1], z - 3, 0);
      this.spawnCoinLine(safeLane, z + 2, 6, 2.2, 0.95, false);
    } else if (p === 4) {
      // Parked expedition jeep + fallen log + moving jungle rail train
      this.spawnTrackObstacle('car', otherLanes[0], z - 2, 0);
      this.spawnTrackObstacle('train', otherLanes[1], z - 8, 8.2 * loopMult);
      this.spawnTrackObstacle('barrier_low', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 3.5, 5, 2.0, 1.0, true);
    } else {
      // Dense jungle trail: foliage boulders + canvas truck + open sprint
      this.spawnTrackObstacle('roadblock', otherLanes[0], z - 1, 0);
      this.spawnTrackObstacle('van', otherLanes[1], z - 5, 0);
      this.spawnCoinLine(safeLane, z + 2, 6, 2.2, 0.95, false);
    }
  }

  private spawnDesertWave(z: number, safeLane: number, otherLanes: number[], loopMult: number): void {
    const p = Math.floor(Math.random() * 6);
    if (p === 0) {
      // Sandbag berm to jump + abandoned rusted pickup + red canyon rocks
      this.spawnTrackObstacle('barrier_low', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 3.5, 5, 2.0, 1.0, true);
      this.spawnTrackObstacle('van', otherLanes[0], z - 3, 0);
      this.spawnTrackObstacle('roadblock', otherLanes[1], z - 1, 0);
    } else if (p === 1) {
      // Desert ramp onto freight train + armored convoy truck
      this.spawnTrackObstacle('ramp_train', safeLane, z, 0);
      this.spawnTrackObstacle('train', safeLane, z - 8.4, 0);
      this.spawnCoinLine(safeLane, z - 4.5, 5, 2.2, 3.7, false);
      this.spawnTrackObstacle('bus', otherLanes[0], z - 6, 6.2 * loopMult);
      this.spawnTrackObstacle('box_stack', otherLanes[1], z - 2, 0);
    } else if (p === 2) {
      // Slide under rusty canyon pipe arch + moving desert buggy + cacti
      this.spawnTrackObstacle('barrier_high', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 4, 6, 2.2, 0.65, false);
      this.spawnTrackObstacle('car', otherLanes[0], z - 5, 8.6 * loopMult);
      this.spawnTrackObstacle('roadblock', otherLanes[1], z - 2, 0);
    } else if (p === 3) {
      // Highway convoy: heavy desert truck + sand dunes/drums + open corridor
      this.spawnTrackObstacle('bus', otherLanes[0], z - 5, 6.0 * loopMult);
      this.spawnTrackObstacle('box_stack', otherLanes[1], z - 3, 0);
      this.spawnCoinLine(safeLane, z + 2, 6, 2.2, 0.95, false);
    } else if (p === 4) {
      // Freight train + abandoned pickup + pipe arch
      this.spawnTrackObstacle('train', otherLanes[0], z - 8, 9.2 * loopMult);
      this.spawnTrackObstacle('van', otherLanes[1], z - 3, 0);
      this.spawnTrackObstacle('barrier_high', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 3.5, 5, 2.0, 0.65, false);
    } else {
      // Dual desert racers / dune buggies leaving 1 open lane
      this.spawnTrackObstacle('car', otherLanes[0], z - 4, 8.4 * loopMult);
      this.spawnTrackObstacle('barrier_low', otherLanes[1], z, 0);
      this.spawnCoinLine(safeLane, z + 2, 6, 2.2, 0.95, false);
    }
  }

  private spawnSnowWave(z: number, safeLane: number, otherLanes: number[], loopMult: number): void {
    const p = Math.floor(Math.random() * 6);
    if (p === 0) {
      // Snow-dusted fallen pine + glacial ice block + moving snowmobile
      this.spawnTrackObstacle('barrier_low', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 3.5, 5, 2.0, 1.0, true);
      this.spawnTrackObstacle('roadblock', otherLanes[0], z - 2, 0);
      this.spawnTrackObstacle('car', otherLanes[1], z - 5, 7.2 * loopMult);
    } else if (p === 1) {
      // Ice ramp onto glacier express train + snow plough truck
      this.spawnTrackObstacle('ramp_train', safeLane, z, 0);
      this.spawnTrackObstacle('train', safeLane, z - 8.4, 0);
      this.spawnCoinLine(safeLane, z - 4.5, 5, 2.2, 3.7, false);
      this.spawnTrackObstacle('van', otherLanes[0], z - 5, 4.6 * loopMult);
      this.spawnTrackObstacle('barrier_high', otherLanes[1], z - 1, 0);
    } else if (p === 2) {
      // Slide under icicle ski arch + snow pile + alpine snowcat
      this.spawnTrackObstacle('barrier_high', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 4, 6, 2.2, 0.65, false);
      this.spawnTrackObstacle('box_stack', otherLanes[0], z - 2, 0);
      this.spawnTrackObstacle('bus', otherLanes[1], z - 6, 5.0 * loopMult);
    } else if (p === 3) {
      // Snow plough clearing + parked snowmobile + clear powder path
      this.spawnTrackObstacle('van', otherLanes[0], z - 5, 4.5 * loopMult);
      this.spawnTrackObstacle('car', otherLanes[1], z - 3, 0);
      this.spawnCoinLine(safeLane, z + 2, 6, 2.2, 0.95, false);
    } else if (p === 4) {
      // Glacier express train + glacial ice blocks + jumpable pine log
      this.spawnTrackObstacle('train', otherLanes[0], z - 8, 8.8 * loopMult);
      this.spawnTrackObstacle('roadblock', otherLanes[1], z - 2, 0);
      this.spawnTrackObstacle('barrier_low', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 3.5, 5, 2.0, 1.0, true);
    } else {
      // Tracked snowcat + snow piles + open sprint corridor
      this.spawnTrackObstacle('bus', otherLanes[0], z - 5, 5.2 * loopMult);
      this.spawnTrackObstacle('box_stack', otherLanes[1], z - 3, 0);
      this.spawnCoinLine(safeLane, z + 2, 6, 2.2, 0.95, false);
    }
  }

  private spawnNeonWave(z: number, safeLane: number, otherLanes: number[], loopMult: number): void {
    const p = Math.floor(Math.random() * 6);
    if (p === 0) {
      // Laser energy barrier + moving hypercar + hovering robotic drone
      this.spawnTrackObstacle('barrier_low', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 3.5, 5, 2.0, 1.0, true);
      this.spawnTrackObstacle('car', otherLanes[0], z - 6, 9.5 * loopMult);
      this.spawnTrackObstacle('roadblock', otherLanes[1], z - 4, 3.6 * loopMult);
    } else if (p === 1) {
      // Cyber ramp onto hypergrid train + flying hover-cruiser
      this.spawnTrackObstacle('ramp_train', safeLane, z, 0);
      this.spawnTrackObstacle('train', safeLane, z - 8.4, 0);
      this.spawnCoinLine(safeLane, z - 4.5, 5, 2.2, 3.7, false);
      this.spawnTrackObstacle('van', otherLanes[0], z - 5, 7.2 * loopMult);
      this.spawnTrackObstacle('barrier_high', otherLanes[1], z - 1, 0);
    } else if (p === 2) {
      // Slide under holographic scanner gate + cyber energy pylons + maglev transport
      this.spawnTrackObstacle('barrier_high', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 4, 6, 2.2, 0.65, false);
      this.spawnTrackObstacle('box_stack', otherLanes[0], z - 2, 0);
      this.spawnTrackObstacle('bus', otherLanes[1], z - 6, 7.6 * loopMult);
    } else if (p === 3) {
      // Flying hover-cruiser + patrolling robotic drone + open neon strip
      this.spawnTrackObstacle('van', otherLanes[0], z - 5, 7.4 * loopMult);
      this.spawnTrackObstacle('roadblock', otherLanes[1], z - 3, 4.2 * loopMult);
      this.spawnCoinLine(safeLane, z + 2, 6, 2.2, 0.95, false);
    } else if (p === 4) {
      // Hypergrid train + neon hypercar + holographic slide gate
      this.spawnTrackObstacle('train', otherLanes[0], z - 8, 10.5 * loopMult);
      this.spawnTrackObstacle('car', otherLanes[1], z - 4, 8.8 * loopMult);
      this.spawnTrackObstacle('barrier_high', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 3.5, 5, 2.0, 0.65, false);
    } else {
      // Cyber maglev transport + energy pylons + laser barrier
      this.spawnTrackObstacle('bus', otherLanes[0], z - 6, 7.5 * loopMult);
      this.spawnTrackObstacle('box_stack', otherLanes[1], z - 2, 0);
      this.spawnTrackObstacle('barrier_low', safeLane, z, 0);
      this.spawnCoinLine(safeLane, z + 3.5, 5, 2.0, 1.0, true);
    }
  }

  private spawnNextWave(): void {
    const z = this.nextSpawnZ;
    const lanes = [0, 1, 2];
    const safeLane = lanes[Math.floor(Math.random() * 3)];
    const otherLanes = lanes.filter((l) => l !== safeLane);
    const loopMoveMult = 1 + (this.worldLoop - 1) * 0.14;

    if (this.worldId === 'city') {
      this.spawnCityWave(z, safeLane, otherLanes, loopMoveMult);
    } else if (this.worldId === 'jungle') {
      this.spawnJungleWave(z, safeLane, otherLanes, loopMoveMult);
    } else if (this.worldId === 'desert') {
      this.spawnDesertWave(z, safeLane, otherLanes, loopMoveMult);
    } else if (this.worldId === 'snow') {
      this.spawnSnowWave(z, safeLane, otherLanes, loopMoveMult);
    } else {
      this.spawnNeonWave(z, safeLane, otherLanes, loopMoveMult);
    }

    // Spawn special Mystery Gem occasionally
    if (Math.random() < 0.16) {
      this.spawnGem(safeLane, z - 13, 1.15);
    }

    // Dynamic Power-Up & Science Orb spawn (EVERY power-up triggers mandatory MCQ!)
    if (this.distance >= this.nextMcqDist) {
      this.spawnMcqPower(safeLane, z - 10, 1.3);
      this.nextMcqDist = this.distance + 44 + Math.random() * 26;
    } else if (this.distance >= this.nextPowerUpDist) {
      this.spawnPowerUp(safeLane, z - 11, 1.25);
      this.nextPowerUpDist = this.distance + 58 + Math.random() * 40;
    }

    const gap = Math.max(
      19.5,
      28 - (this.currentSpeed - 18) * 0.25 - (this.worldLoop - 1) * 1.4,
    );
    this.nextSpawnZ -= gap;
  }

  private activatePowerUp(type: PowerUpType): void {
    const lvl = this.powerUpLevels[type] || 1;
    const duration = getPowerUpDuration(type, lvl);
    this.activePowerUps.set(type, { remaining: duration, duration });
    this.powerUpCooldowns.set(type, POWER_UPS[type].cooldown);
    this.runPowerUps++;
    this.activationPulseTimer = 0.72;
    this.transitionFovBoost = Math.max(this.transitionFovBoost, 3.0);

    gameAudio.playPowerUp();
    this.spawnBurst(this.playerX, this.playerY + 1.1, 0, POWER_UPS[type].color, 18);
    this.spawnBurst(this.playerX, this.playerY + 1.3, -0.3, '#fde047', 10);
    this.setBanner(`${POWER_UPS[type].name.toUpperCase()} ACTIVATED!`, 1.7);

    if (type === 'jetpack') {
      this.slideTimer = 0;
      this.playerVy = 0;
      this.nextJetpackCoinZ = -18;
    }
  }

  private handleObstacleHit(obs: PooledObstacle): void {
    // Check Speed Boost smash
    if (this.activePowerUps.has('speed')) {
      obs.active = false;
      obs.mesh.visible = false;
      this.cameraShake = 0.25;
      this.spawnBurst(obs.mesh.position.x, 1.2, obs.z, '#facc15', 16);
      gameAudio.playShieldBreak();
      return;
    }

    // Check Super Shield protection
    if (this.activePowerUps.has('shield')) {
      this.activePowerUps.delete('shield');
      obs.active = false;
      obs.mesh.visible = false;
      this.invulnTimer = 1.25;
      this.cameraShake = 0.32;
      this.spawnBurst(this.playerX, this.playerY + 1.1, 0, '#38bdf8', 18);
      this.setBanner('SHIELD SAVED YOU!', 1.4);
      gameAudio.playShieldBreak();
      this.emitHud();
      return;
    }

    // Check Hoverboard protection
    if (this.activePowerUps.has('hoverboard')) {
      this.activePowerUps.delete('hoverboard');
      obs.active = false;
      obs.mesh.visible = false;
      this.invulnTimer = 1.25;
      this.cameraShake = 0.32;
      this.spawnBurst(this.playerX, this.playerY + 0.5, 0, '#22d3ee', 18);
      this.setBanner('HOVERBOARD IMPACT!', 1.4);
      gameAudio.playShieldBreak();
      this.emitHud();
      return;
    }

    // Fatal Crash -> Game Over
    this.phase = 'gameover';
    this.crashTimer = 0.85;
    this.cameraShake = 0.45;
    gameAudio.playCrash();
    gameAudio.setPaused(true);
    this.spawnBurst(this.playerX, this.playerY + 1.0, 0, '#ef4444', 22);

    const summary: RunSummary = {
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      coinsEarned: this.runCoins,
      isNewHighScore: false,
      powerUpsUsed: this.runPowerUps,
      jumps: this.runJumps,
      slides: this.runSlides,
    };
    this.callbacks.onGameOver(summary);
  }

  private emitHud(): void {
    const activePowerUps: ActivePowerUpState[] = [];
    this.activePowerUps.forEach((val, key) => {
      activePowerUps.push({
        type: key,
        remaining: val.remaining,
        duration: val.duration,
      });
    });

    const mult =
      (this.activePowerUps.has('speed') ? 2 : 1) *
      (this.activePowerUps.has('doubleCoins') ? 2 : 1);

    this.callbacks.onHudUpdate({
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      coins: this.runCoins,
      multiplier: mult,
      speedKmh: Math.round(this.currentSpeed * 2.5),
      activePowerUps,
      hoverboards: this.availableHoverboards,
      hoverboardCooldown: this.hoverboardCooldown,
      hasShield: this.activePowerUps.has('shield'),
      hasHoverboard: this.activePowerUps.has('hoverboard'),
      isJetpack: this.activePowerUps.has('jetpack'),
      bannerText: this.lastBannerTimer > 0 ? this.bannerText : null,
      currentWorld: this.worldId,
      worldLoop: this.worldLoop,
      worldTimeRemaining: Math.max(0, this.worldDuration - this.worldElapsed),
      worldTransitionBanner:
        this.worldBannerTimer > 0 ? this.worldBannerData : null,
    });
  }

  private updateMenuScene(dt: number, elapsed: number): void {
    // Showcase character running smoothly on live 3D track
    if (this.roadMaterial.map) {
      this.roadMaterial.map.offset.y -= dt * 1.4;
    }
    this.moveScenery(dt * 11);
    this.animateRunner(dt, elapsed, 11);

    // Gentle cinematic camera sway in menu
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const aspect = w / Math.max(1, h);
    const baseDist = aspect < 0.85 ? 6.4 : 5.4;

    const targetFov = aspect < 0.85 ? 58 : 50;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 6, dt);
    this.camera.updateProjectionMatrix();

    this.camera.position.x = THREE.MathUtils.damp(
      this.camera.position.x,
      Math.sin(elapsed * 0.45) * 1.35,
      4,
      dt,
    );
    this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, 2.7, 4, dt);
    this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, baseDist, 4, dt);
    this.camera.lookAt(0, 1.35, -1.5);
  }

  private moveScenery(dz: number): void {
    for (const s of this.sceneryPool) {
      s.z += dz;
      if (s.z > 20) {
        s.z -= 144;
        // Seamlessly bring in the new world's props from the far horizon
        if (s.activeWorld !== this.worldId) {
          const oldMesh = s.meshes[s.activeWorld];
          if (oldMesh) oldMesh.visible = false;
          const nextMesh = s.meshes[this.worldId];
          if (nextMesh) nextMesh.visible = true;
          s.activeWorld = this.worldId;
        }
      }
      const activeMesh = s.meshes[s.activeWorld];
      if (activeMesh) {
        activeMesh.position.z = s.z;
      }
    }
  }

  private updatePlaying(dt: number, elapsed: number): void {
    // Advance world timer (~2 minutes per world, pauses automatically when paused/MCQ)
    this.worldElapsed += dt;
    if (this.worldElapsed >= this.worldDuration - 12) {
      const upcomingIdx = (this.worldIndex + 1) % WORLD_ORDER.length;
      this.ensureWorldAssets(WORLD_ORDER[upcomingIdx]);
    }
    if (this.worldElapsed >= this.worldDuration) {
      this.worldElapsed -= this.worldDuration;
      const nextIndex = (this.worldIndex + 1) % WORLD_ORDER.length;
      const newLoop =
        nextIndex === this.startWorldIndex
          ? this.worldLoop + 1
          : this.worldLoop;
      const stageInLoop =
        ((nextIndex - this.startWorldIndex + WORLD_ORDER.length) %
          WORLD_ORDER.length) +
        1;
      this.worldIndex = nextIndex;
      this.beginWorldTransition(WORLD_ORDER[nextIndex], newLoop, stageInLoop);
    }

    this.updateWorldTransition(dt);

    if (this.worldBannerTimer > 0) {
      this.worldBannerTimer = Math.max(0, this.worldBannerTimer - dt);
    }
    if (this.transitionFovBoost > 0) {
      this.transitionFovBoost = Math.max(0, this.transitionFovBoost - dt * 2.4);
    }

    // Speed ramps gradually with distance + world loop difficulty scaling
    const distBoost = Math.min(20, this.distance * 0.011);
    const loopSpeedBonus = (this.worldLoop - 1) * 3.8;
    const speedMult = this.activePowerUps.has('speed') ? 1.45 : 1.0;
    const targetSpeed = (this.baseSpeed + distBoost + loopSpeedBonus) * speedMult;
    this.currentSpeed = THREE.MathUtils.damp(this.currentSpeed, targetSpeed, 5, dt);

    const dz = this.currentSpeed * dt;
    this.distance += dz;
    this.laneLastStationaryZ[0] += dz;
    this.laneLastStationaryZ[1] += dz;
    this.laneLastStationaryZ[2] += dz;
    const scoreRate = this.activePowerUps.has('speed') ? 18 : 10;
    this.score += dz * scoreRate * 0.14;

    if (this.roadMaterial.map) {
      this.roadMaterial.map.offset.y -= dz * 0.062;
    }
    if (this.worldTransitionActive && this.roadOverlayMaterial.map) {
      this.roadOverlayMaterial.map.offset.y -= dz * 0.062;
    }
    this.moveScenery(dz);

    // Timers & Power-Up durations
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.activationPulseTimer > 0) {
      this.activationPulseTimer = Math.max(0, this.activationPulseTimer - dt);
    }
    if (this.lastBannerTimer > 0) {
      this.lastBannerTimer = Math.max(0, this.lastBannerTimer - dt);
    }
    if (this.hoverboardCooldown > 0) {
      this.hoverboardCooldown = Math.max(0, this.hoverboardCooldown - dt);
    }

    this.powerUpCooldowns.forEach((cd, key) => {
      if (cd > 0) this.powerUpCooldowns.set(key, Math.max(0, cd - dt));
    });

    this.activePowerUps.forEach((state, key) => {
      state.remaining -= dt;
      if (state.remaining <= 0) {
        this.activePowerUps.delete(key);
        if (key === 'jetpack') {
          this.invulnTimer = Math.max(this.invulnTimer, 1.1);
        }
      }
    });

    // Player X lane damping
    const targetX = LANES[this.laneIndex];
    const prevX = this.playerX;
    this.playerX = THREE.MathUtils.damp(this.playerX, targetX, 17, dt);
    const lateralVel = (this.playerX - prevX) / Math.max(0.001, dt);

    // Check ground height (ramp / train roof support)
    let surfaceY = 0;
    for (const obs of this.activeObstacles) {
      if (!obs.active) continue;
      if (Math.abs(this.playerX - LANES[obs.lane]) < 1.35) {
        const halfD = obs.depth / 2;
        if (obs.isRamp && obs.z + halfD >= -0.3 && obs.z - halfD <= 0.3) {
          // Linear interpolation from front (+halfD, y=0) to back (-halfD, y=2.86)
          const t = THREE.MathUtils.clamp((obs.z + halfD) / obs.depth, 0, 1);
          surfaceY = Math.max(surfaceY, t * obs.height);
        } else if (
          obs.isTrainTop &&
          obs.z + halfD >= -0.35 &&
          obs.z - halfD <= 0.35 &&
          this.playerY >= obs.height - 0.55
        ) {
          surfaceY = Math.max(surfaceY, obs.height);
        }
      }
    }
    this.groundY = surfaceY;

    // Vertical Physics (Jetpack vs Gravity)
    const isJetpack = this.activePowerUps.has('jetpack');
    if (isJetpack) {
      this.playerY = THREE.MathUtils.damp(this.playerY, 4.7, 7, dt);
      this.playerVy = 0;
      // Spawn aerial coin trails during jetpack
      this.nextJetpackCoinZ += dz;
      if (this.nextJetpackCoinZ >= 3.0) {
        this.nextJetpackCoinZ = 0;
        const jLane = Math.floor(Math.random() * 3);
        this.spawnCoinLine(jLane, -42, 4, 2.3, 4.7, false);
      }
      if (Math.random() < 0.45) {
        this.spawnBurst(this.playerX, this.playerY + 0.6, 0.4, '#fb923c', 1);
      }
    } else {
      this.playerVy -= 36 * dt;
      this.playerY += this.playerVy * dt;
      if (this.playerY <= this.groundY) {
        this.playerY = this.groundY;
        this.playerVy = 0;
        if (this.jumpBuffered) {
          this.jumpBuffered = false;
          this.playerVy = 13.8;
          this.slideTimer = 0;
          this.runJumps++;
          gameAudio.playJump();
        }
      }
    }

    if (this.slideTimer > 0) {
      this.slideTimer = Math.max(0, this.slideTimer - dt);
    }

    // Player Hitbox
    const isSliding = this.slideTimer > 0 && this.playerY <= this.groundY + 0.1;
    const playerH = isSliding ? 0.72 : 1.75;
    const playerBottom = this.playerY;
    const playerTop = this.playerY + playerH;

    // Advance & Check Obstacles (iterates backward so despawned obstacles splice cleanly)
    for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
      const obs = this.activeObstacles[i];
      if (!obs.active) {
        this.activeObstacles.splice(i, 1);
        continue;
      }
      obs.z += dz + obs.moveSpeed * dt;
      obs.mesh.position.z = obs.z;

      for (let c = 0; c < obs.mesh.children.length; c++) {
        const child = obs.mesh.children[c];
        if (child.userData.hoverBob) {
          child.position.y = Math.sin(elapsed * 4.5 + obs.lane * 1.7) * 0.14;
          for (let gc = 0; gc < child.children.length; gc++) {
            const grand = child.children[gc];
            if (grand.userData.spinAxis === 'z') {
              grand.rotation.z += dt * 3.5;
            }
          }
        }
      }

      if (obs.z > 18) {
        obs.active = false;
        obs.mesh.visible = false;
        this.activeObstacles.splice(i, 1);
        continue;
      }

      if (this.invulnTimer > 0 || isJetpack) continue;
      if (obs.isRamp) continue; // ramps elevate rather than crash

      // AABB Overlap Check
      const obsX = LANES[obs.lane];
      const hitX = Math.abs(this.playerX - obsX) < obs.width * 0.46 + 0.36;
      const hitZ = Math.abs(obs.z) < obs.depth * 0.47 + 0.32;
      if (hitX && hitZ) {
        const obsBottom = obs.clearanceBottom;
        const obsTop = obs.height;
        // Clear if player's feet are above obstacle top or head is below clearance
        const verticalOverlap =
          playerBottom < obsTop - 0.12 && playerTop > obsBottom + 0.08;
        if (verticalOverlap) {
          this.handleObstacleHit(obs);
          if (this.phase !== 'playing') return;
        }
      }
    }

    // Advance & Check Coins
    const hasMagnet = this.activePowerUps.has('magnet');
    const doubleCoins = this.activePowerUps.has('doubleCoins');
    const charBonus = CHARACTERS[this.characterId].coinBonus;

    for (const c of this.coinPool) {
      if (!c.active) continue;
      c.z += dz;

      if (hasMagnet && c.z > -20 && c.z < 4) {
        c.magnetized = true;
      }

      if (c.magnetized) {
        c.x = THREE.MathUtils.damp(c.x, this.playerX, 14, dt);
        c.y = THREE.MathUtils.damp(c.y, this.playerY + 0.95, 14, dt);
        c.z = THREE.MathUtils.damp(c.z, 0, 14, dt);
      }

      c.mesh.position.set(c.x, c.y, c.z);
      c.mesh.rotation.y += dt * 4.2;

      if (c.z > 12) {
        c.active = false;
        c.magnetized = false;
        c.mesh.visible = false;
        continue;
      }

      // Pickup distance check
      _vec3.set(c.x - this.playerX, c.y - (this.playerY + 0.9), c.z);
      if (_vec3.lengthSq() < 1.35) {
        c.active = false;
        c.magnetized = false;
        c.mesh.visible = false;
        const gained = Math.max(
          1,
          Math.round((doubleCoins ? 2 : 1) * (1 + charBonus)),
        );
        this.runCoins += gained;
        this.score += 15 * gained;
        gameAudio.playCoin();
        this.spawnBurst(c.x, c.y, c.z, doubleCoins ? '#4ade80' : '#fbbf24', 5);
      }
    }

    // Advance & Check Mystery Gems
    for (const g of this.gemPool) {
      if (!g.active) continue;
      g.z += dz;
      g.mesh.position.set(g.x, g.y + Math.sin(elapsed * 4) * 0.16, g.z);
      g.mesh.rotation.y += dt * 2.5;
      if (g.z > 12) {
        g.active = false;
        g.mesh.visible = false;
        continue;
      }
      _vec3.set(g.x - this.playerX, g.y - (this.playerY + 0.95), g.z);
      if (_vec3.lengthSq() < 1.6) {
        g.active = false;
        g.mesh.visible = false;
        this.runCoins += 25;
        this.score += 250;
        gameAudio.playGem();
        this.setBanner('MYSTERY GEM +25 COINS!', 1.5);
        this.spawnBurst(g.x, g.y, g.z, '#e879f9', 14);
      }
    }

    // Advance & Check Power-Ups (ALL track power-ups require an MCQ answer!)
    for (const p of this.powerUpPool) {
      if (!p.active) continue;
      p.z += dz;
      p.mesh.position.set(p.x, p.y + Math.sin(elapsed * 3.5) * 0.18, p.z);
      p.mesh.rotation.y += dt * 2.4;
      if (p.z > 12) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      _vec3.set(p.x - this.playerX, p.y - (this.playerY + 0.95), p.z);
      if (_vec3.lengthSq() < 1.85) {
        p.active = false;
        p.mesh.visible = false;
        gameAudio.playGem();
        this.spawnBurst(p.x, p.y, p.z, POWER_UPS[p.type].color, 18);
        this.phase = 'mcq';
        gameAudio.setPaused(true);
        this.callbacks.onMcqCollect(p.type);
        return;
      }
    }

    // Advance & Check MCQ Science Power Collectibles
    for (const m of this.mcqPowerPool) {
      if (!m.active) continue;
      m.z += dz;
      m.mesh.position.set(m.x, m.y + Math.sin(elapsed * 4.2) * 0.2, m.z);
      m.mesh.rotation.y += dt * 2.8;
      if (m.z > 12) {
        m.active = false;
        m.mesh.visible = false;
        continue;
      }
      _vec3.set(m.x - this.playerX, m.y - (this.playerY + 0.95), m.z);
      if (_vec3.lengthSq() < 1.95) {
        m.active = false;
        m.mesh.visible = false;
        gameAudio.playGem();
        this.spawnBurst(m.x, m.y, m.z, '#a855f7', 16);
        this.phase = 'mcq';
        gameAudio.setPaused(true);
        this.callbacks.onMcqCollect(m.rewardType);
        return;
      }
    }

    // Keep spawning waves ahead
    this.nextSpawnZ += dz;
    while (this.nextSpawnZ > -105) {
      this.spawnNextWave();
    }

    // Update Player Pose & Rig
    this.playerRig.group.position.set(this.playerX, this.playerY, 0);
    this.playerRig.group.rotation.z = THREE.MathUtils.clamp(
      -lateralVel * 0.028,
      -0.32,
      0.32,
    );
    // Blink briefly during post-shield invulnerability & celebration pulse on MCQ power activation
    this.playerRig.bodyPivot.visible =
      this.invulnTimer <= 0 || Math.floor(elapsed * 20) % 2 === 0;
    if (this.activationPulseTimer > 0) {
      const pulsePhase = (1 - this.activationPulseTimer / 0.72) * Math.PI * 2;
      this.playerRig.bodyPivot.scale.setScalar(1 + Math.sin(pulsePhase) * 0.14);
    } else {
      this.playerRig.bodyPivot.scale.setScalar(1);
    }

    this.playerRig.shieldDome.visible = this.activePowerUps.has('shield');
    if (this.playerRig.shieldDome.visible) {
      this.playerRig.shieldDome.rotation.y += dt * 1.8;
      this.playerRig.shieldDome.rotation.x += dt * 0.9;
    }

    this.playerRig.hoverboard.visible = this.activePowerUps.has('hoverboard');
    this.playerRig.jetFlames.visible = isJetpack;
    if (isJetpack) {
      const flicker = 0.85 + Math.sin(elapsed * 38) * 0.22;
      this.playerRig.jetFlames.scale.set(1, flicker, 1);
    }

    this.animateRunner(dt, elapsed, this.currentSpeed);

    // Contact Shadow tracks groundY directly under player
    this.contactShadow.position.set(this.playerX, this.groundY + 0.025, 0);
    const heightAboveGround = Math.max(0, this.playerY - this.groundY);
    const shadowScale = Math.max(0.35, 1 - heightAboveGround * 0.14);
    this.contactShadow.scale.setScalar(shadowScale);
    (this.contactShadow.material as THREE.MeshBasicMaterial).opacity =
      Math.max(0.15, 0.58 - heightAboveGround * 0.1);

    // Camera Follow + Adaptive Portrait/Landscape Framing + Speed FOV
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    const aspect = w / Math.max(1, h);
    const isPortrait = aspect < 0.85;

    const baseFov = isPortrait ? 65 : 57;
    const speedFovBoost =
      (this.activePowerUps.has('speed') ? 10 : 0) +
      (isJetpack ? 6 : 0) +
      this.transitionFovBoost;
    this.camera.fov = THREE.MathUtils.damp(
      this.camera.fov,
      baseFov + speedFovBoost,
      6,
      dt,
    );
    this.camera.updateProjectionMatrix();

    if (this.cameraShake > 0) {
      this.cameraShake = Math.max(0, this.cameraShake - dt * 1.6);
    }
    const shakeX = (Math.random() - 0.5) * this.cameraShake;
    const shakeY = (Math.random() - 0.5) * this.cameraShake;

    const targetCamX = this.playerX * 0.68 + shakeX;
    const targetCamY = (isPortrait ? 4.9 : 4.35) + this.playerY * 0.72 + shakeY;
    const targetCamZ = isPortrait ? 8.8 : 7.5;

    this.camera.position.x = THREE.MathUtils.damp(
      this.camera.position.x,
      targetCamX,
      10,
      dt,
    );
    this.camera.position.y = THREE.MathUtils.damp(
      this.camera.position.y,
      targetCamY,
      8,
      dt,
    );
    this.camera.position.z = THREE.MathUtils.damp(
      this.camera.position.z,
      targetCamZ,
      8,
      dt,
    );

    this.camera.lookAt(
      this.playerX * 0.45,
      this.playerY + 1.35,
      -8,
    );

    // Emit HUD at ~15Hz to keep React ultra-fast
    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.065) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }
  }

  private animateRunner(dt: number, elapsed: number, speed: number): void {
    const rig = this.playerRig;
    const isJetpack = this.activePowerUps.has('jetpack');
    const isHoverboard = this.activePowerUps.has('hoverboard');
    const isSliding =
      this.phase === 'playing' &&
      this.slideTimer > 0 &&
      this.playerY <= this.groundY + 0.1;
    const isAirborne =
      this.phase === 'playing' && this.playerY > this.groundY + 0.15;

    if (isJetpack) {
      // Superhero flight pose
      rig.bodyPivot.rotation.x = THREE.MathUtils.damp(rig.bodyPivot.rotation.x, -0.45, 10, dt);
      rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, 0, 10, dt);
      rig.leftLeg.rotation.x = THREE.MathUtils.damp(rig.leftLeg.rotation.x, 0.25, 10, dt);
      rig.rightLeg.rotation.x = THREE.MathUtils.damp(rig.rightLeg.rotation.x, 0.45, 10, dt);
      rig.leftArm.rotation.x = THREE.MathUtils.damp(rig.leftArm.rotation.x, -2.5, 10, dt);
      rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, -2.5, 10, dt);
      return;
    }

    if (isSliding) {
      // Baseball slide pose
      rig.bodyPivot.rotation.x = THREE.MathUtils.damp(rig.bodyPivot.rotation.x, 1.05, 18, dt);
      rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, -0.42, 18, dt);
      rig.leftLeg.rotation.x = THREE.MathUtils.damp(rig.leftLeg.rotation.x, -0.4, 18, dt);
      rig.rightLeg.rotation.x = THREE.MathUtils.damp(rig.rightLeg.rotation.x, 0.35, 18, dt);
      rig.leftArm.rotation.x = THREE.MathUtils.damp(rig.leftArm.rotation.x, -0.6, 18, dt);
      rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, 0.5, 18, dt);
      return;
    }

    if (isHoverboard) {
      // Surf stance
      rig.bodyPivot.rotation.x = THREE.MathUtils.damp(rig.bodyPivot.rotation.x, 0.08, 12, dt);
      rig.bodyPivot.rotation.y = THREE.MathUtils.damp(rig.bodyPivot.rotation.y, 0.65, 12, dt);
      rig.bodyPivot.position.y = 0.14 + Math.sin(elapsed * 8) * 0.04;
      rig.hoverboard.position.y = 0.1 + Math.sin(elapsed * 8) * 0.04;
      rig.leftLeg.rotation.x = THREE.MathUtils.damp(rig.leftLeg.rotation.x, -0.22, 12, dt);
      rig.rightLeg.rotation.x = THREE.MathUtils.damp(rig.rightLeg.rotation.x, 0.22, 12, dt);
      rig.leftArm.rotation.x = 0;
      rig.rightArm.rotation.x = 0;
      rig.leftArm.rotation.z = -0.65;
      rig.rightArm.rotation.z = 0.65;
      return;
    }

    rig.bodyPivot.rotation.y = THREE.MathUtils.damp(rig.bodyPivot.rotation.y, 0, 14, dt);
    rig.leftArm.rotation.z = THREE.MathUtils.damp(rig.leftArm.rotation.z, 0, 14, dt);
    rig.rightArm.rotation.z = THREE.MathUtils.damp(rig.rightArm.rotation.z, 0, 14, dt);

    if (isAirborne) {
      // Jump tuck pose
      rig.bodyPivot.rotation.x = THREE.MathUtils.damp(rig.bodyPivot.rotation.x, -0.15, 12, dt);
      rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, 0, 12, dt);
      rig.leftLeg.rotation.x = THREE.MathUtils.damp(rig.leftLeg.rotation.x, 0.85, 12, dt);
      rig.rightLeg.rotation.x = THREE.MathUtils.damp(rig.rightLeg.rotation.x, -0.45, 12, dt);
      rig.leftArm.rotation.x = THREE.MathUtils.damp(rig.leftArm.rotation.x, -2.1, 12, dt);
      rig.rightArm.rotation.x = THREE.MathUtils.damp(rig.rightArm.rotation.x, -1.6, 12, dt);
      return;
    }

    // Crisp running cycle
    this.runAnimTime += dt * (speed * 0.62);
    const swing = Math.sin(this.runAnimTime);
    const bob = Math.abs(Math.cos(this.runAnimTime)) * 0.09;

    rig.bodyPivot.rotation.x = THREE.MathUtils.damp(rig.bodyPivot.rotation.x, -0.14, 14, dt);
    rig.bodyPivot.position.y = bob;
    rig.leftLeg.rotation.x = swing * 0.92;
    rig.rightLeg.rotation.x = -swing * 0.92;
    rig.leftArm.rotation.x = -swing * 0.88;
    rig.rightArm.rotation.x = swing * 0.88;
  }

  private updateParticles(dt: number): void {
    for (const p of this.particlePool) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vy -= 14 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      const s = 1 - p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.05, s));
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private tick = (): void => {
    if (this.disposed) return;

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const elapsed = this.clock.getElapsedTime();

    if (this.phase === 'menu') {
      this.updateMenuScene(dt, elapsed);
    } else if (this.phase === 'playing') {
      this.updatePlaying(dt, elapsed);
    } else if (this.phase === 'gameover' && this.crashTimer > 0) {
      this.crashTimer = Math.max(0, this.crashTimer - dt);
      this.playerRig.bodyPivot.rotation.x += dt * 4.5;
      this.playerRig.group.position.y = Math.max(
        0,
        this.playerRig.group.position.y - dt * 3,
      );
    }

    this.updateParticles(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    window.clearTimeout(this.frameId);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener(
      'webglcontextlost',
      this.handleContextLost,
    );
    this.renderer.domElement.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
    );
    this.roadTextureCache.forEach((tex) => {
      tex.dispose();
    });
    this.roadTextureCache.clear();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

export { _color };
