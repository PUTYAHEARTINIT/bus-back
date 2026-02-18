// player.js — Player car controls, lane switching, jump, duck

import { leanCamera } from './engine.js';

export const LANES = [-3.5, 0, 3.5];
export let currentLane = 1;
export let targetLaneX = 0;
export let isJumping = false;
export let isDucking = false;
export let jumpProgress = 0;
export let playerY = 0.6;

const JUMP_DURATION = 1.2;
const JUMP_HEIGHT = 3;
const DUCK_DURATION = 0.8;
const LANE_LERP = 0.15;

let duckTimer = 0;
let playerCarRef = null;
let gameStateRef = null;
let onLaneSwitchCb = null;

export function initPlayer(playerCar, getGameState, onLaneSwitch, onJumpSound, onLandSound) {
  playerCarRef = playerCar;
  gameStateRef = getGameState;
  onLaneSwitchCb = onLaneSwitch;
  window.__jumpSound = onJumpSound || null;
  window.__landSound = onLandSound || null;
  currentLane = 1;
  targetLaneX = LANES[1];
  playerCarRef.position.x = targetLaneX;
  playerCarRef.position.y = playerY;

  window.addEventListener('keydown', onKey);

  // Device tilt (mobile gyroscope) for lane switching
  let tiltBaseline = null;
  let tiltCooldown = false;
  window.addEventListener('deviceorientation', (e) => {
    if (!gameStateRef || gameStateRef() !== 'playing') return;
    if (tiltCooldown) return;
    const gamma = e.gamma || 0;
    if (tiltBaseline === null) { tiltBaseline = gamma; return; }
    const tilt = gamma - tiltBaseline;
    if (tilt > 18) {
      switchLane(1);
      tiltCooldown = true;
      setTimeout(() => { tiltCooldown = false; tiltBaseline = gamma; }, 350);
    } else if (tilt < -18) {
      switchLane(-1);
      tiltCooldown = true;
      setTimeout(() => { tiltCooldown = false; tiltBaseline = gamma; }, 350);
    }
  });

  // iOS 13+ requires explicit permission for DeviceOrientation
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    document.addEventListener('click', () => {
      DeviceOrientationEvent.requestPermission().catch(() => {});
    }, { once: true });
  }

  if (window.Hammer) {
    const mc = new window.Hammer(document.body);
    mc.get('swipe').set({ direction: window.Hammer.DIRECTION_ALL, threshold: 10, velocity: 0.3 });
    mc.on('swipeleft',  () => switchLane(-1));
    mc.on('swiperight', () => switchLane(1));
    mc.on('swipeup',    () => jump());
    mc.on('swipedown',  () => duck());
  }
}

function onKey(e) {
  if (!gameStateRef || gameStateRef() !== 'playing') return;
  switch (e.code) {
    case 'ArrowLeft':  switchLane(-1); break;
    case 'ArrowRight': switchLane(1);  break;
    case 'ArrowUp':    jump();         break;
    case 'ArrowDown':  duck();         break;
  }
}

export function switchLane(dir) {
  if (!gameStateRef || gameStateRef() !== 'playing') return;
  const newLane = Math.max(0, Math.min(2, currentLane + dir));
  if (newLane !== currentLane) {
    currentLane = newLane;
    targetLaneX = LANES[currentLane];
    leanCamera(dir);
    if (onLaneSwitchCb) onLaneSwitchCb(currentLane);
  }
}

export function jump() {
  if (!gameStateRef || gameStateRef() !== 'playing') return;
  if (!isJumping && !isDucking) {
    isJumping = true;
    jumpProgress = 0;
    if (window.__jumpSound) window.__jumpSound();
  }
}

export function duck() {
  if (!gameStateRef || gameStateRef() !== 'playing') return;
  if (!isJumping && !isDucking) {
    isDucking = true;
    duckTimer = 0;
    if (playerCarRef) {
      playerCarRef.scale.y = 0.5;
      playerCarRef.position.y = 0.3;
    }
  }
}

export function getHitbox() {
  const x = playerCarRef ? playerCarRef.position.x : 0;
  const y = playerCarRef ? playerCarRef.position.y : 0.6;
  return {
    x, y, z: 0,
    w: 1.8,
    h: isDucking ? 0.6 : 1.2,
    d: 3.5
  };
}

export function updatePlayer(dt) {
  if (!playerCarRef) return;

  // Smooth lane transition
  playerCarRef.position.x += (targetLaneX - playerCarRef.position.x) * LANE_LERP;

  // Jump arc
  if (isJumping) {
    jumpProgress += dt / JUMP_DURATION;
    if (jumpProgress >= 1) {
      jumpProgress = 1;
      isJumping = false;
      playerCarRef.position.y = playerY;
      if (window.__landSound) window.__landSound();
    } else {
      const arc = Math.sin(jumpProgress * Math.PI);
      playerCarRef.position.y = playerY + arc * JUMP_HEIGHT;
    }
  }

  // Duck timer
  if (isDucking) {
    duckTimer += dt;
    if (duckTimer >= DUCK_DURATION) {
      isDucking = false;
      playerCarRef.scale.y = 1;
      playerCarRef.position.y = playerY;
    }
  }
}

export function resetPlayer() {
  currentLane = 1;
  targetLaneX = LANES[1];
  isJumping = false;
  isDucking = false;
  jumpProgress = 0;
  duckTimer = 0;
  if (playerCarRef) {
    playerCarRef.position.set(0, playerY, 0);
    playerCarRef.scale.y = 1;
  }
}
