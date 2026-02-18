// pursuit.js — Pursuit cars, flashing lightbar, pursuit meter
//
// Coordinate system: camera at z=8, player car at z=0, road moves in +z.
// "Behind the player" = positive z (between player and camera, z = 2–7).
// Pursuit cars lerp toward player (z=0) as pursuitMeter fills.

import * as THREE from 'three';
import { LANES } from './player.js';

export let pursuitMeter = 0;
let pursuitCars = [];
let sceneRef = null;
let onShootoutCb = null;
let lightbarTimers = [];
let shootoutTriggered = false;

// Player is at z=0. Visible behind-player zone is z = 2–7.
const FORMATION_FAR  = 7;   // z at 0% pursuit  (far behind)
const FORMATION_NEAR = 1.5; // z at 100% pursuit (nearly caught)

export function initPursuit(scene, onShootout) {
  sceneRef = scene;
  onShootoutCb = onShootout;
  pursuitMeter = 0;
  pursuitCars = [];
  lightbarTimers = [];
  shootoutTriggered = false;

  for (let i = 0; i < 3; i++) {
    const car = createPursuitCar();
    // Start in formation behind player — each car offset slightly
    car.position.set(LANES[i], 0.6, FORMATION_FAR + i * 1.8);
    scene.add(car);
    pursuitCars.push(car);
    lightbarTimers.push(0);
  }
}

function createPursuitCar() {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.BoxGeometry(1.8, 0.7, 3.5);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x111133 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.35;
  body.castShadow = true;
  group.add(body);

  // Roof
  const roofGeo = new THREE.BoxGeometry(1.4, 0.5, 2);
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x0a0a22 });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, 0.95, 0.2);
  group.add(roof);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 12);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  for (const pos of [[-0.95, 0, 1.2], [0.95, 0, 1.2], [-0.95, 0, -1.2], [0.95, 0, -1.2]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(...pos);
    group.add(wheel);
  }

  // Lightbar base
  const barGeo = new THREE.BoxGeometry(1.2, 0.12, 0.4);
  const barMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
  const lightbar = new THREE.Mesh(barGeo, barMat);
  lightbar.position.set(0, 1.26, 0.2);
  group.add(lightbar);

  // Red light
  const redGeo  = new THREE.BoxGeometry(0.4, 0.12, 0.35);
  const redMat  = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  const redLight = new THREE.Mesh(redGeo, redMat);
  redLight.position.set(-0.35, 1.26, 0.2);
  group.add(redLight);
  const redPt = new THREE.PointLight(0xff0000, 2, 6);
  redPt.position.copy(redLight.position);
  group.add(redPt);

  // Blue light
  const blueGeo  = new THREE.BoxGeometry(0.4, 0.12, 0.35);
  const blueMat  = new THREE.MeshBasicMaterial({ color: 0x0044ff });
  const blueLight = new THREE.Mesh(blueGeo, blueMat);
  blueLight.position.set(0.35, 1.26, 0.2);
  group.add(blueLight);
  const bluePt = new THREE.PointLight(0x0044ff, 2, 6);
  bluePt.position.copy(blueLight.position);
  group.add(bluePt);

  group.userData.redLight   = redLight;
  group.userData.redPt      = redPt;
  group.userData.blueLight  = blueLight;
  group.userData.bluePt     = bluePt;
  group.userData.flashState = false;

  return group;
}

export function increasePursuit(amount) {
  pursuitMeter = Math.min(100, pursuitMeter + amount);
}

export function decreasePursuit(amount) {
  pursuitMeter = Math.max(0, pursuitMeter - amount);
}

export function updatePursuit(dt) {
  // Check BEFORE draining — drain would knock it below 100 and the check would never fire
  if (pursuitMeter >= 100 && !shootoutTriggered) {
    shootoutTriggered = true;
    if (onShootoutCb) onShootoutCb();
    return;
  }

  // Slowly drain meter when not hitting obstacles
  decreasePursuit(0.5 * dt);

  const pct = pursuitMeter / 100;

  for (let i = 0; i < pursuitCars.length; i++) {
    const car = pursuitCars[i];

    // Target z: far behind at low pursuit, close behind at high pursuit
    const targetZ = FORMATION_NEAR + (1 - pct) * (FORMATION_FAR - FORMATION_NEAR) + i * 1.5;

    // Smooth lerp toward target — faster approach when meter is high
    const lerpRate = 0.02 + pct * 0.06;
    car.position.z += (targetZ - car.position.z) * Math.min(1, lerpRate * 60 * dt);

    // Lanes — each car holds its lane
    car.position.x += (LANES[i] - car.position.x) * 0.05;

    // Lightbar flash (alternating red/blue every 0.3s)
    lightbarTimers[i] += dt;
    if (lightbarTimers[i] > 0.3) {
      lightbarTimers[i] = 0;
      car.userData.flashState = !car.userData.flashState;
      const f = car.userData.flashState;
      car.userData.redLight.visible  = f;
      car.userData.redPt.intensity   = f ? 2 : 0;
      car.userData.blueLight.visible = !f;
      car.userData.bluePt.intensity  = !f ? 2 : 0;
    }
  }

}

export function resetPursuit(meterValue = 20) {
  pursuitMeter = meterValue;
  shootoutTriggered = false;
  for (let i = 0; i < pursuitCars.length; i++) {
    pursuitCars[i].position.z = FORMATION_FAR + i * 1.8;
  }
}
