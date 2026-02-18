// engine.js — Bus Back city engine

import * as THREE from 'three';
import { EffectComposer }  from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export let scene, camera, renderer, playerCar, roadGroup;

const ROAD_SEGMENT_LENGTH = 40;
const ROAD_SEGMENT_COUNT  = 20;
const ROAD_WIDTH          = 21;
const ROAD_LOOP           = ROAD_SEGMENT_COUNT * ROAD_SEGMENT_LENGTH;
const SKY_COLOR           = 0x04060e;

const roadSegments    = [];
const buildingGroups  = [];
const intersectionGrps = [];
let shakeMagnitude    = 0;
let cameraLean        = 0;

let composer      = null;
let rainPosArray  = null;
let rainGeo       = null;

// ── Canvas textures ───────────────────────────────────────────────────────────

function makeRoadTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#2d2d2d';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 12000; i++) {
    const v = 30 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
  }
  // Cracks
  for (let c = 0; c < 6; c++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 512, Math.random() * 512);
    ctx.lineTo(Math.random() * 512, Math.random() * 512);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 8);
  return tex;
}

function makeWindowTexture(cols, rows) {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 512;
  const ctx = cv.getContext('2d');
  // Building facade — mid grey so it's visible
  ctx.fillStyle = '#5a6070';
  ctx.fillRect(0, 0, 256, 512);
  const cw = 256 / cols, rh = 512 / rows;
  const pw = cw * 0.6, ph = rh * 0.55;
  const ox = (cw - pw) / 2, oy = (rh - ph) / 2;
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      const lit = Math.random() > 0.3;
      if (lit) {
        const warm = Math.random() > 0.4;
        ctx.fillStyle = warm
          ? `rgba(255,${200 + Math.floor(Math.random()*55)},${80 + Math.floor(Math.random()*80)},0.9)`
          : `rgba(${120 + Math.floor(Math.random()*80)},180,255,0.85)`;
      } else {
        ctx.fillStyle = 'rgba(8,12,22,0.95)';
      }
      ctx.fillRect(c * cw + ox, r * rh + oy, pw, ph);
    }
  }
  return new THREE.CanvasTexture(cv);
}

// Pre-bake window texture pool
const winTexPool = [];
function initWinTexPool() {
  for (const [c, r] of [[3,10],[4,12],[5,14],[3,8],[4,10]]) {
    winTexPool.push(makeWindowTexture(c, r));
  }
}

// ── Materials ────────────────────────────────────────────────────────────────

let roadMat, curMat, dashMat;

// Visible mid-tone city building colors (not near-black)
const BUILDING_COLORS = [
  0x6a7a8a, 0x5d6a7a, 0x7a6a80, 0x706560,
  0x6a7060, 0x607575, 0x807060, 0x686878
];

// ── Rain texture (vertical streak per drop) ───────────────────────────────────

function makeRainTexture() {
  const cv = document.createElement('canvas');
  cv.width = 4; cv.height = 32;
  const ctx = cv.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 32);
  grad.addColorStop(0.0,  'rgba(160,190,255,0)');
  grad.addColorStop(0.3,  'rgba(160,190,255,0.85)');
  grad.addColorStop(0.7,  'rgba(200,220,255,0.85)');
  grad.addColorStop(1.0,  'rgba(160,190,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 32);
  return new THREE.CanvasTexture(cv);
}

function createRain() {
  const COUNT = 3500;
  rainPosArray = new Float32Array(COUNT * 3);
  const camZ = -80; // seed in front of camera
  for (let i = 0; i < COUNT; i++) {
    rainPosArray[i*3]   = (Math.random() - 0.5) * 130;
    rainPosArray[i*3+1] = Math.random() * 75;
    rainPosArray[i*3+2] = camZ - Math.random() * 220;
  }
  rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPosArray, 3));
  const mat = new THREE.PointsMaterial({
    map: makeRainTexture(),
    color: 0xaabbdd,
    size: 0.55,
    opacity: 0.32,
    transparent: true,
    sizeAttenuation: true,
    depthWrite: false
  });
  scene.add(new THREE.Points(rainGeo, mat));
}

// ── Sky gradient backdrop ─────────────────────────────────────────────────────

function createSkyGradient() {
  const cv = document.createElement('canvas');
  cv.width = 4; cv.height = 512;
  const ctx = cv.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.00, '#01020a'); // deep space
  grad.addColorStop(0.30, '#03060f'); // night navy
  grad.addColorStop(0.60, '#07051a'); // dark purple
  grad.addColorStop(0.80, '#180628'); // rich purple horizon
  grad.addColorStop(0.92, '#2a0c14'); // red-purple glow
  grad.addColorStop(1.00, '#1a0808'); // dark orange at ground
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 512);
  const tex = new THREE.CanvasTexture(cv);
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(2000, 500),
    new THREE.MeshBasicMaterial({ map: tex, fog: false, depthWrite: false })
  );
  sky.renderOrder = -10;
  sky.position.set(0, 110, -430);
  scene.add(sky);
}

// ── Init ──────────────────────────────────────────────────────────────────────

export function init(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY_COLOR);
  scene.fog = new THREE.FogExp2(SKY_COLOR, 0.007);

  camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, 4.2, 8.5);
  camera.lookAt(0, 1.2, -20);

  // ── Lighting ──
  // Low ambient — ACES + bloom provides brightness; too much ambient kills contrast
  scene.add(new THREE.AmbientLight(0x223355, 0.55));

  // Hemisphere: cool blue sky, warm orange ground bounce
  scene.add(new THREE.HemisphereLight(0x334466, 0x221108, 1.1));

  // Key directional (above-front, cool moonlight)
  const key = new THREE.DirectionalLight(0xc8d8ff, 2.8);
  key.position.set(0, 40, 10);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.camera.left = -60;
  key.shadow.camera.right = 60;
  key.shadow.camera.top = 60;
  key.shadow.camera.bottom = -60;
  key.shadow.camera.far = 200;
  scene.add(key);

  // Left fill (cooler blue rim)
  const left = new THREE.DirectionalLight(0x6688cc, 1.2);
  left.position.set(-30, 20, 0);
  scene.add(left);

  // Right fill (warm orange city glow)
  const right = new THREE.DirectionalLight(0xcc8833, 1.2);
  right.position.set(30, 20, 0);
  scene.add(right);

  // ── Textures & materials ──
  initWinTexPool();
  const roadTex = makeRoadTexture();
  // MeshStandardMaterial with low roughness = wet city asphalt shimmer
  roadMat  = new THREE.MeshStandardMaterial({ map: roadTex, color: 0x888888, roughness: 0.18, metalness: 0.14 });
  dashMat  = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.75, transparent: true });
  curMat   = new THREE.MeshBasicMaterial({ color: 0xffdd00, opacity: 0.6, transparent: true });

  // ── Road ──
  roadGroup = new THREE.Group();
  scene.add(roadGroup);
  for (let i = 0; i < ROAD_SEGMENT_COUNT; i++) {
    const seg = createRoadSegment();
    seg.position.z = -i * ROAD_SEGMENT_LENGTH;
    roadGroup.add(seg);
    roadSegments.push(seg);
  }

  // Ground beyond road
  const groundMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(300, ROAD_LOOP + 100),
    new THREE.MeshLambertMaterial({ color: 0x1a1a20 })
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.set(0, -0.02, -ROAD_LOOP / 2);
  scene.add(groundMesh);

  // ── City blocks ──
  for (let i = 0; i < ROAD_SEGMENT_COUNT; i++) {
    addCityBlock(-i * ROAD_SEGMENT_LENGTH);
  }

  // ── Intersections (every 400m — 2 per 800-unit loop) ──
  createIntersection(-200);
  createIntersection(-600);

  // ── Skyline ──
  createSkyline();

  // ── Stars ──
  createStars();

  // ── Player car ──
  playerCar = createGNXCar();
  playerCar.position.set(0, 0.6, 0);
  scene.add(playerCar);

  // ── Sky + rain ──
  createSkyGradient();
  createRain();

  // ── Bloom composer ──
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const bW = isMobile ? window.innerWidth  * 0.6 : window.innerWidth;
  const bH = isMobile ? window.innerHeight * 0.6 : window.innerHeight;
  const renderPass = new RenderPass(scene, camera);
  const bloomPass  = new UnrealBloomPass(
    new THREE.Vector2(bW, bH),
    0.90,  // strength
    0.55,  // radius
    0.82   // threshold — only very bright pixels bloom (neons, lights)
  );
  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  window.addEventListener('resize', onResize);
  window.__busBackScene = scene;
  return { scene, camera, renderer, playerCar };
}

// ── Road segment ─────────────────────────────────────────────────────────────

function createRoadSegment() {
  const g = new THREE.Group();

  // Road surface
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_SEGMENT_LENGTH),
    roadMat
  );
  road.rotation.x = -Math.PI / 2;
  road.receiveShadow = true;
  g.add(road);

  // White edge lines
  for (const ex of [-(ROAD_WIDTH / 2 - 0.12), (ROAD_WIDTH / 2 - 0.12)]) {
    const e = new THREE.Mesh(new THREE.PlaneGeometry(0.2, ROAD_SEGMENT_LENGTH), dashMat);
    e.rotation.x = -Math.PI / 2;
    e.position.set(ex, 0.01, 0);
    g.add(e);
  }

  // Dashed lane markers
  for (const lx of [-3.5, 3.5]) {
    for (let d = -ROAD_SEGMENT_LENGTH / 2 + 2; d < ROAD_SEGMENT_LENGTH / 2; d += 7) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 4.2), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(lx, 0.01, d);
      g.add(dash);
    }
  }

  // Double yellow center line
  for (const cx of [-0.15, 0.15]) {
    const cl = new THREE.Mesh(new THREE.PlaneGeometry(0.1, ROAD_SEGMENT_LENGTH), curMat);
    cl.rotation.x = -Math.PI / 2;
    cl.position.set(cx, 0.01, 0);
    g.add(cl);
  }

  // Curbs
  const curbMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  for (const side of [-1, 1]) {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, ROAD_SEGMENT_LENGTH), curbMat);
    curb.position.set(side * (ROAD_WIDTH / 2 + 0.15), 0.1, 0);
    g.add(curb);

    // Sidewalk
    const sw = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.15, ROAD_SEGMENT_LENGTH),
      new THREE.MeshLambertMaterial({ color: 0x505055 })
    );
    sw.position.set(side * (ROAD_WIDTH / 2 + 2.05), 0.075, 0);
    g.add(sw);
  }

  return g;
}

// ── City block ────────────────────────────────────────────────────────────────

const NEON_COLORS = [0x00ffee, 0xff00aa, 0x88ff00, 0xff3300, 0xaa00ff, 0xff8800];

function addCityBlock(zPos) {
  const group = new THREE.Group();
  group.position.z = zPos;

  for (const side of [-1, 1]) {
    const num = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < num; i++) {
      const w = 4 + Math.random() * 8;
      const h = 8 + Math.random() * 32;
      const d = 5 + Math.random() * 7;
      const bx = side * (ROAD_WIDTH / 2 + 4 + Math.random() * 3 + w / 2);
      const bz = -ROAD_SEGMENT_LENGTH / 2 + (i / num) * ROAD_SEGMENT_LENGTH + d / 2;

      // Facade with window texture
      const winTex = winTexPool[Math.floor(Math.random() * winTexPool.length)];
      const buildMat = new THREE.MeshLambertMaterial({
        map: winTex,
        color: 0xffffff   // no tint — let canvas texture show true colors
      });
      const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildMat);
      building.position.set(bx, h / 2, bz);
      building.castShadow = true;
      building.receiveShadow = true;
      group.add(building);

      // Rooftop water tower (25%)
      if (Math.random() > 0.75) {
        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(0.5, 0.5, 1.0, 8),
          new THREE.MeshLambertMaterial({ color: 0x5a4020 })
        );
        tank.position.set(bx + (Math.random() - 0.5) * w * 0.4, h + 0.5, bz);
        group.add(tank);
        for (let l = 0; l < 3; l++) {
          const ang = (l / 3) * Math.PI * 2;
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.04, 0.04, 0.9, 4),
            new THREE.MeshLambertMaterial({ color: 0x333333 })
          );
          leg.position.set(bx + Math.cos(ang) * 0.4, h + 0.45, bz + Math.sin(ang) * 0.4);
          group.add(leg);
        }
      }

      // HVAC (40%)
      if (Math.random() > 0.6) {
        const hvac = new THREE.Mesh(
          new THREE.BoxGeometry(w * 0.3, 0.45, d * 0.22),
          new THREE.MeshLambertMaterial({ color: 0x888888 })
        );
        hvac.position.set(bx, h + 0.22, bz);
        group.add(hvac);
      }

      // Aircraft beacon on tall buildings
      if (h > 20) {
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.13, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xff2200 })
        );
        beacon.position.set(bx, h + 0.15, bz);
        group.add(beacon);
      }

      // Neon sign (35%) — MeshBasicMaterial always glows, no PointLight needed
      if (Math.random() > 0.65) {
        const nc = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
        const neonW = 1.0 + Math.random() * 2.2;
        const neon = new THREE.Mesh(
          new THREE.BoxGeometry(neonW, 0.32, 0.08),
          new THREE.MeshBasicMaterial({ color: nc })
        );
        neon.position.set(bx - side * (w / 2 + 0.05), h * 0.5 + Math.random() * h * 0.25, bz + d / 2 - 0.06);
        group.add(neon);
      }
    }
  }

  // Street lamps — one per block, alternating sides
  const lampSide = (Math.round(zPos / ROAD_SEGMENT_LENGTH) % 2 === 0) ? 1 : -1;
  for (const side of [lampSide]) {
    const lampX = side * (ROAD_WIDTH / 2 + 1.2);
    const lampZ = -10;
    const poleMat = new THREE.MeshLambertMaterial({ color: 0x2a2a2a });

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5.5, 6), poleMat);
    pole.position.set(lampX, 2.75, lampZ);
    group.add(pole);

    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 4), poleMat);
    arm.rotation.z = side * Math.PI / 2;
    arm.position.set(lampX - side * 1.1, 5.5, lampZ);
    group.add(arm);

    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffaa44 })
    );
    lens.position.set(lampX - side * 2.2, 5.4, lampZ);
    group.add(lens);

    const lampLight = new THREE.PointLight(0xff9933, 4.0, 24);
    lampLight.position.copy(lens.position);
    group.add(lampLight);
  }

  // Sidewalk props
  for (const side of [-1, 1]) {
    const swX = side * (ROAD_WIDTH / 2 + 2.2);

    // Fire hydrant (50%)
    if (Math.random() > 0.5) {
      const hydrant = new THREE.Group();
      const hBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.15, 0.48, 8),
        new THREE.MeshLambertMaterial({ color: 0xcc2200 })
      );
      const hTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.13, 0.16, 8),
        hBody.material
      );
      hTop.position.y = 0.32;
      hydrant.add(hBody, hTop);
      hydrant.position.set(swX + side * 0.4, 0.24, Math.random() * 25 - 15);
      group.add(hydrant);
    }

    // Trash can (50%)
    if (Math.random() > 0.5) {
      const trash = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.16, 0.7, 8),
        new THREE.MeshLambertMaterial({ color: 0x303030 })
      );
      trash.position.set(swX + side * 0.7, 0.35, Math.random() * 25 - 15);
      group.add(trash);
    }

    // Parked car (45%)
    if (Math.random() > 0.55) {
      const pc = makeParkedCar();
      pc.position.set(side * (ROAD_WIDTH / 2 + 5.5 + Math.random() * 1.5), 0.35, Math.random() * 20 - 10);
      group.add(pc);
    }
  }

  scene.add(group);
  buildingGroups.push({ group, baseZ: zPos });
}

function makeParkedCar() {
  const g = new THREE.Group();
  const colors = [0x2a3a4a, 0x3a2020, 0x202020, 0x2a3520, 0x1a1a30];
  const c = colors[Math.floor(Math.random() * colors.length)];
  const mat = new THREE.MeshLambertMaterial({ color: c });
  // 2 meshes only — body + roof
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 3.0), mat);
  body.position.y = 0.35;
  g.add(body);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 1.6), mat);
  roof.position.set(0, 0.85, 0.1);
  g.add(roof);
  return g;
}

// ── Intersections ─────────────────────────────────────────────────────────────

const INTER_HALF = 22;   // half-length of intersection zone (44 units total)
const SIDE_W     = 30;   // side-street road width

function buildTrafficPole(x, z, group, lightRefs) {
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 7.5, 6), poleMat);
  pole.position.set(x, 3.75, z);
  group.add(pole);

  const armDir = x < 0 ? 1 : -1;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 4), poleMat);
  arm.rotation.z = Math.PI / 2;
  arm.position.set(x + armDir * 1.4, 7.5, z);
  group.add(arm);

  const hx = x + armDir * 2.8;
  const hy = 7.35;
  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 1.45, 0.42),
    new THREE.MeshLambertMaterial({ color: 0x0a0a0a })
  );
  housing.position.set(hx, hy, z);
  group.add(housing);

  // Red top, Yellow mid, Green bottom
  const bulbColors  = [0xff2200, 0xffaa00, 0x00ff44];
  const bulbOffsets = [0.44, 0, -0.44];
  const bulbs = [];
  for (let i = 0; i < 3; i++) {
    const bMat = new THREE.MeshBasicMaterial({
      color: bulbColors[i],
      opacity: i === 0 ? 1.0 : 0.12,
      transparent: true
    });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 6), bMat);
    bulb.position.set(hx, hy + bulbOffsets[i], z + 0.22);
    group.add(bulb);
    bulbs.push(bMat); // store material ref for animation
  }
  lightRefs.push(bulbs);
}

function createIntersection(zPos) {
  const g = new THREE.Group();
  g.position.z = zPos;

  const sideRoadMat  = new THREE.MeshLambertMaterial({ map: makeRoadTexture(), color: 0xffffff });
  const stripeMat    = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.82, transparent: true });
  const stopLineMat  = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.72, transparent: true });
  const curbMat      = new THREE.MeshLambertMaterial({ color: 0x555555 });
  const sidewalkMat  = new THREE.MeshLambertMaterial({ color: 0x505055 });

  // ── Side-street road surfaces (left & right) ──
  for (const side of [-1, 1]) {
    const sr = new THREE.Mesh(
      new THREE.PlaneGeometry(SIDE_W, INTER_HALF * 2),
      sideRoadMat
    );
    sr.rotation.x = -Math.PI / 2;
    sr.position.set(side * (ROAD_WIDTH / 2 + SIDE_W / 2), 0.004, 0);
    g.add(sr);

    // Far curb of side street
    const fc = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, INTER_HALF * 2), curbMat);
    fc.position.set(side * (ROAD_WIDTH / 2 + SIDE_W + 0.14), 0.09, 0);
    g.add(fc);

    // Far sidewalk of side street
    const fsw = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.13, INTER_HALF * 2), sidewalkMat);
    fsw.position.set(side * (ROAD_WIDTH / 2 + SIDE_W + 1.74), 0.065, 0);
    g.add(fsw);

    // Corner sidewalk pads (fill between main sidewalk and side road)
    for (const cz of [-1, 1]) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.13, INTER_HALF * 2), sidewalkMat);
      pad.position.set(side * (ROAD_WIDTH / 2 + 2.05), 0.065, 0);
      // Only add once per side (not per cz) — skip second
      if (cz === -1) g.add(pad);
    }

    // 2 small buildings visible down the side street
    for (let bi = 0; bi < 2; bi++) {
      const bw = 4 + Math.random() * 5;
      const bh = 6 + Math.random() * 10;
      const bd = 4 + Math.random() * 4;
      const bx = side * (ROAD_WIDTH / 2 + SIDE_W + 3.8 + bw / 2);
      const bz = (bi === 0 ? -INTER_HALF * 0.45 : INTER_HALF * 0.45);
      const winTex = winTexPool[Math.floor(Math.random() * winTexPool.length)];
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(bw, bh, bd),
        new THREE.MeshLambertMaterial({ map: winTex, color: 0xffffff })
      );
      b.position.set(bx, bh / 2, bz);
      g.add(b);
    }
  }

  // ── Crosswalk stripes (approaching & receding) ──
  const numStripes = 9;
  const stripeW    = 0.72;
  const stripeD    = 3.5;
  for (const cz of [-(INTER_HALF - 5), (INTER_HALF - 5)]) {
    for (let s = 0; s < numStripes; s++) {
      const sx = -ROAD_WIDTH / 2 + 1.5 + s * ((ROAD_WIDTH - 3.0) / (numStripes - 1));
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(stripeW, stripeD), stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(sx, 0.019, cz);
      g.add(stripe);
    }

    // Stop line before each crosswalk
    const stopZ = cz + (cz < 0 ? -2.4 : 2.4);
    const sl = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, 0.42), stopLineMat);
    sl.rotation.x = -Math.PI / 2;
    sl.position.set(0, 0.019, stopZ);
    g.add(sl);
  }

  // ── Traffic light poles (4 corners) ──
  const lightRefs = [];
  const corners = [
    [-(ROAD_WIDTH / 2 + 2.0), -(INTER_HALF - 3)],
    [ (ROAD_WIDTH / 2 + 2.0), -(INTER_HALF - 3)],
    [-(ROAD_WIDTH / 2 + 2.0),  (INTER_HALF - 3)],
    [ (ROAD_WIDTH / 2 + 2.0),  (INTER_HALF - 3)],
  ];
  for (const [cx, cz] of corners) {
    buildTrafficPole(cx, cz, g, lightRefs);
  }

  g.userData.lightRefs  = lightRefs;
  g.userData.lightState = 0;        // 0=red, 1=green, 2=yellow
  g.userData.lightTimer = Math.random() * 10; // stagger phase between intersections

  scene.add(g);
  intersectionGrps.push({ group: g, baseZ: zPos });
}

// ── Skyline ────────────────────────────────────────────────────────────────────

function createSkyline() {
  const sg = new THREE.Group();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 14; i++) {
      const w = 8 + Math.random() * 16;
      const h = 25 + Math.random() * 65;
      const b = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, 8 + Math.random() * 10),
        new THREE.MeshLambertMaterial({
          color: new THREE.Color().setHSL(0.62, 0.2, 0.06 + Math.random() * 0.06)
        })
      );
      b.position.set(
        side * (100 + Math.random() * 120),
        h / 2,
        -ROAD_LOOP / 2 + Math.random() * ROAD_LOOP
      );
      sg.add(b);

      // A few lit windows on skyline buildings
      if (Math.random() > 0.5) {
        const winGlow = new THREE.Mesh(
          new THREE.PlaneGeometry(w * 0.5, h * 0.5),
          new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? 0xffcc88 : 0x88aaff,
            opacity: 0.12 + Math.random() * 0.1,
            transparent: true,
            side: THREE.DoubleSide
          })
        );
        winGlow.position.copy(b.position);
        winGlow.position.x -= side * (w / 2 - 0.1);
        sg.add(winGlow);
      }
    }
  }
  scene.add(sg);
  window.__skylineGroup = sg;
}

// ── Stars ─────────────────────────────────────────────────────────────────────

function createStars() {
  const pos = new Float32Array(4000 * 3);
  for (let i = 0; i < pos.length; i += 3) {
    pos[i]   = (Math.random() - 0.5) * 700;
    pos[i+1] = 35 + Math.random() * 110;
    pos[i+2] = (Math.random() - 0.5) * 700;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, opacity: 0.65, transparent: true })));
}

// ── GNX player car ────────────────────────────────────────────────────────────

function createGNXCar() {
  const g = new THREE.Group();

  const black  = new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.18, metalness: 0.82 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.05, metalness: 0.95 });
  const glass  = new THREE.MeshStandardMaterial({ color: 0x0a1825, roughness: 0.05, metalness: 0.1, opacity: 0.7, transparent: true });

  // Body layers
  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.52, 4.0), black);
  lower.position.y = 0.26; lower.castShadow = true;
  g.add(lower);

  const upper = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.42, 3.6), black);
  upper.position.y = 0.69; upper.castShadow = true;
  g.add(upper);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.5, 2.1), black);
  cabin.position.set(0, 1.09, 0.15); cabin.castShadow = true;
  g.add(cabin);

  // Glass
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.44, 0.07), glass);
  windshield.position.set(0, 1.07, -0.94); windshield.rotation.x = 0.22;
  g.add(windshield);

  const rearWin = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.4, 0.07), glass);
  rearWin.position.set(0, 1.06, 1.28); rearWin.rotation.x = -0.22;
  g.add(rearWin);

  for (const side of [-1, 1]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 1.75), glass);
    sw.position.set(side * 0.77, 1.08, 0.15);
    g.add(sw);
  }

  // Hood scoop
  const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.75), black);
  scoop.position.set(0, 0.97, -1.2);
  g.add(scoop);

  // Spoiler
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.06, 0.13), chrome);
  spoiler.position.set(0, 1.27, 1.92); g.add(spoiler);
  for (const sx of [-0.78, 0.78]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.2, 0.28), black);
    fin.position.set(sx, 1.18, 1.92); g.add(fin);
  }

  // Bumpers
  const fb = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.26, 0.1), chrome);
  fb.position.set(0, 0.21, -2.04); g.add(fb);
  const rb = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.26, 0.1), chrome);
  rb.position.set(0, 0.21, 2.04); g.add(rb);

  // Exhaust
  for (const ex of [-0.54, 0.54]) {
    const exh = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.2, 8), chrome);
    exh.rotation.x = Math.PI / 2;
    exh.position.set(ex, 0.17, 2.14); g.add(exh);
  }

  // Headlights
  const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
  for (const hx of [-0.7, 0.7]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.17, 0.06), hlMat);
    hl.position.set(hx, 0.43, -2.03); g.add(hl);
    const spot = new THREE.SpotLight(0xfff5cc, 6, 38, Math.PI / 9, 0.25, 1.5);
    spot.position.set(hx, 0.43, -2.1);
    spot.target.position.set(hx * 0.6, 0, -25);
    g.add(spot, spot.target);
  }

  // Full-width tail strip (GNX signature)
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.11, 0.05), new THREE.MeshBasicMaterial({ color: 0xff1100 }));
  tail.position.set(0, 0.54, 2.03); g.add(tail);
  for (const tx of [-0.58, 0.58]) {
    const tl = new THREE.PointLight(0xff2200, 1.5, 5);
    tl.position.set(tx, 0.54, 2.1); g.add(tl);
  }

  // Wheels
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.95 });
  const rimMat  = new THREE.MeshStandardMaterial({ color: 0x909090, roughness: 0.2, metalness: 0.85 });
  for (const [wx, wz] of [[-1.0,-1.45],[1.0,-1.45],[-0.97,1.45],[0.97,1.45]]) {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.3, 14), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(wx, 0.33, wz); g.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.31, 10), rimMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.copy(tire.position); g.add(rim);
  }

  return g;
}

// ── Camera FX ─────────────────────────────────────────────────────────────────

export function shakeCamera(intensity) { shakeMagnitude = intensity; }
export function leanCamera(direction)  { cameraLean = direction * 0.06; }

// ── Update ────────────────────────────────────────────────────────────────────

export function update(dt, speed) {
  const moveZ = speed * dt;

  for (const seg of roadSegments) {
    seg.position.z += moveZ;
    if (seg.position.z > ROAD_SEGMENT_LENGTH) seg.position.z -= ROAD_LOOP;
  }

  for (const bg of buildingGroups) {
    bg.group.position.z += moveZ;
    if (bg.group.position.z > 60) bg.group.position.z -= ROAD_LOOP;
  }

  // ── Intersections: scroll + recycle + animate lights ──
  for (const ig of intersectionGrps) {
    ig.group.position.z += moveZ;
    if (ig.group.position.z > 60) ig.group.position.z -= ROAD_LOOP;

    // Traffic light cycle: red 5s → green 4s → yellow 1s (10s total)
    ig.group.userData.lightTimer += dt;
    const cycle = ig.group.userData.lightTimer % 10;
    const newState = cycle < 5 ? 0 : cycle < 9 ? 1 : 2; // 0=red,1=green,2=yellow
    if (newState !== ig.group.userData.lightState) {
      ig.group.userData.lightState = newState;
      for (const bulbs of ig.group.userData.lightRefs) {
        bulbs[0].opacity = newState === 0 ? 1.0 : 0.10; // red
        bulbs[1].opacity = newState === 2 ? 1.0 : 0.10; // yellow
        bulbs[2].opacity = newState === 1 ? 1.0 : 0.10; // green
        bulbs[0].needsUpdate = true;
        bulbs[1].needsUpdate = true;
        bulbs[2].needsUpdate = true;
      }
    }
  }

  if (window.__skylineGroup) window.__skylineGroup.position.z += moveZ * 0.1;

  // ── Rain animation ──
  if (rainPosArray && rainGeo) {
    const camZ = camera.position.z;
    for (let i = 0; i < rainPosArray.length; i += 3) {
      rainPosArray[i+1] -= 28 * dt;              // fall
      rainPosArray[i+2] += speed * dt * 0.18;    // drift with road
      rainPosArray[i]   -= 1.5 * dt;             // slight diagonal
      if (rainPosArray[i+1] < -1 || rainPosArray[i+2] > camZ + 12) {
        rainPosArray[i]   = (Math.random() - 0.5) * 130;
        rainPosArray[i+1] = 65 + Math.random() * 15;
        rainPosArray[i+2] = camZ - 20 - Math.random() * 200;
      }
    }
    rainGeo.attributes.position.needsUpdate = true;
  }

  camera.position.x += (playerCar.position.x * 0.3 - camera.position.x) * 0.05;

  camera.rotation.z += (cameraLean - camera.rotation.z) * 0.08;
  cameraLean *= 0.95;

  if (shakeMagnitude > 0.01) {
    camera.position.x += (Math.random() - 0.5) * shakeMagnitude;
    camera.position.y += (Math.random() - 0.5) * shakeMagnitude * 0.5;
    shakeMagnitude *= 0.75;
  } else {
    shakeMagnitude = 0;
  }

  if (composer) composer.render(); else renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}
