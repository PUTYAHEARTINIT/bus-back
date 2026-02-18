// obstacles.js — Obstacle spawning, pooling, and collision

import * as THREE from 'three';
import { LANES } from './player.js';

export const OBSTACLE_TYPES = {
  POTHOLE: 'pothole',
  TRASH:   'trash',
  CAR:     'car',
  CONE:    'cone',
  BARRIER: 'barrier'
};

const POOL_SIZE = 20;
const SPAWN_Z = -280;
const RECYCLE_Z = 20;
const MIN_GAP = 65;

const obstaclePool = [];
let sceneRef = null;
let lastSpawnDist = 0;

const COLORS = {
  pothole: 0x1a0a00,  // near-black brown — cracked road
  trash:   0x2d5a1b,  // dark green garbage bags
  car:     0xb8860b,  // dark gold amber — abandoned vehicle
  cone:    0xff4400,  // bright orange-red — high visibility
  barrier: 0xe8e8e8   // bright concrete grey
};

const SIZES = {
  pothole: [2.5, 0.08, 2.5],
  trash:   [0.9,  0.9,  0.9],
  car:     [1.6,  1.2,  3.2],
  cone:    [0.4,  0.8,  0.4],
  barrier: [3.2,  1.0,  0.6]
};

function createObstacleMesh(type) {
  const [w, h, d] = SIZES[type];
  let geo;

  if (type === 'pothole') {
    geo = new THREE.CylinderGeometry(w / 2, w / 2, h, 16);
  } else if (type === 'cone') {
    geo = new THREE.ConeGeometry(0.2, h, 8);
  } else {
    geo = new THREE.BoxGeometry(w, h, d);
  }

  const mat = new THREE.MeshLambertMaterial({ color: COLORS[type] });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;

  if (type === 'car') {
    const roofGeo = new THREE.BoxGeometry(w * 0.7, 0.5, d * 0.55);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x1a3388 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 0.85;
    mesh.add(roof);
  }

  mesh.visible = false;
  mesh.userData = { type, active: false, lane: 0 };
  mesh.position.y = h / 2;
  return mesh;
}

export function initObstacles(scene) {
  sceneRef = scene;
  const types = Object.values(OBSTACLE_TYPES);
  for (let i = 0; i < POOL_SIZE; i++) {
    const type = types[i % types.length];
    const mesh = createObstacleMesh(type);
    scene.add(mesh);
    obstaclePool.push(mesh);
  }
}

function spawnObstacle() {
  const types = Object.values(OBSTACLE_TYPES);
  const type = types[Math.floor(Math.random() * types.length)];
  const mesh = obstaclePool.find(o => !o.userData.active && o.userData.type === type)
            || obstaclePool.find(o => !o.userData.active);
  if (!mesh) return;

  const lane = Math.floor(Math.random() * 3);
  mesh.userData.active = true;
  mesh.userData.lane = lane;
  mesh.visible = true;
  mesh.position.x = LANES[lane];
  mesh.position.z = SPAWN_Z;
  mesh.position.y = SIZES[mesh.userData.type][1] / 2;
}

export function updateObstacles(dt, speed, distanceM) {
  const moveZ = speed * dt;

  if (distanceM - lastSpawnDist > MIN_GAP + Math.random() * 60) {
    spawnObstacle();
    lastSpawnDist = distanceM;
  }

  for (const obs of obstaclePool) {
    if (!obs.userData.active) continue;
    obs.position.z += moveZ;
    if (obs.position.z > RECYCLE_Z) deactivate(obs);
  }
}

export function checkCollisions(playerHitbox) {
  for (const obs of obstaclePool) {
    if (!obs.userData.active) continue;
    const [ow, oh, od] = SIZES[obs.userData.type];
    const overlapX = Math.abs(playerHitbox.x - obs.position.x) < (playerHitbox.w / 2 + ow / 2) * 0.85;
    const overlapY = Math.abs(playerHitbox.y - obs.position.y) < (playerHitbox.h / 2 + oh / 2) * 0.85;
    const overlapZ = Math.abs(playerHitbox.z - obs.position.z) < (playerHitbox.d / 2 + od / 2) * 0.85;
    if (overlapX && overlapY && overlapZ) {
      deactivate(obs);
      return true;
    }
  }
  return false;
}

function deactivate(obs) {
  obs.userData.active = false;
  obs.visible = false;
  obs.position.z = SPAWN_Z - 100;
}

export function resetObstacles() {
  for (const obs of obstaclePool) deactivate(obs);
  lastSpawnDist = 0;
}
