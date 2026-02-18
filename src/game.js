// game.js — State machine + main game loop

import { init as initEngine, update as updateEngine, playerCar, scene, shakeCamera, setPlayerCarColor } from './engine.js';
import { initPlayer, updatePlayer, getHitbox, resetPlayer } from './player.js';
import { initObstacles, updateObstacles, checkCollisions, resetObstacles } from './obstacles.js';
import { initPursuit, updatePursuit, increasePursuit, resetPursuit, pursuitMeter } from './pursuit.js';
import { initShootout, startShootout, endShootout } from './shootout.js';
import { initHUD, updateHUD, showHUD, hideHUD, hidePauseOverlay, setChasedByLabel } from './hud.js';
import { showStartScreen, showGameOver } from './ui.js';
import {
  resumeContext, startEngine, stopEngine,
  setEngineSpeed, playHit, startSiren, stopSiren,
  playJump, playLand, playGameOver, toggleMute
} from './audio.js';
import { showCharacterSelect } from './characterSelect.js';
import { playIntro } from './cinematic.js';
import { getSelectedCharacter, addTotalKm, addShootoutWin } from './characters.js';

// ── State ──
let gameState = 'idle'; // idle | playing | paused | shootout | gameover
let highScore = parseInt(localStorage.getItem('bb_highscore') || '0');
let score       = 0;
let distanceM   = 0;
let speed       = 40;
let lastTime    = null;
let rafId       = null;
let currentChar = null;

const MAX_SPEED   = 160;
const SPEED_ACCEL = 4; // units/s²

export function getGameState() { return gameState; }

export function pauseGame() {
  if (gameState !== 'playing') return;
  gameState = 'paused';
  stopEngine();
  stopSiren();
  cancelAnimationFrame(rafId);
}

export function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing';
  startEngine();
  lastTime = null;
  rafId = requestAnimationFrame(gameLoop);
}

export function restartGame() {
  if (rafId) cancelAnimationFrame(rafId);
  stopEngine();
  stopSiren();
  gameState = 'idle';
  // Go back to character select rather than straight restart
  goToCharacterSelect();
}

// ── Boot ──
export function bootGame(canvas) {
  initEngine(canvas);

  // Init subsystems (scene is now available after initEngine)
  initObstacles(scene);
  initPursuit(scene, onShootoutTriggered);
  initPlayer(playerCar, getGameState, null, playJump, playLand);
  initShootout(onShootoutSuccess, onShootoutFail);
  initHUD(pauseGame, resumeGame, restartGame, toggleMute);

  hideHUD();
  showStartScreen(goToCharacterSelect);
}

// ── Character Select → Cinematic → Game ──
function goToCharacterSelect() {
  showCharacterSelect(onCharacterSelected);
}

function onCharacterSelected(char) {
  currentChar = char;
  resumeContext();
  // Apply character car color
  setPlayerCarColor(char.carColor);
  // Play intro cinematic, then start game
  playIntro(char, startGame);
}

// ── Start / Restart ──
function startGame() {
  resumeContext();
  score     = 0;
  distanceM = 0;
  speed     = 40;
  gameState = 'playing';

  // Apply selected character's "chased by" label in HUD
  if (currentChar) setChasedByLabel(currentChar.chasedBy);

  resetPlayer();
  resetObstacles();
  resetPursuit(0);
  showHUD();
  startEngine();

  lastTime = null;
  rafId = requestAnimationFrame(gameLoop);
}

// ── Main Loop ──
function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap delta at 50ms
  lastTime = timestamp;

  if (gameState === 'playing') {
    speed     = Math.min(MAX_SPEED, speed + SPEED_ACCEL * dt);
    distanceM += speed * dt;
    score     += speed * dt * 0.1; // distance-based scoring

    updateEngine(dt, speed);
    updatePlayer(dt);
    updateObstacles(dt, speed, distanceM);
    updatePursuit(dt);

    // Collision
    if (checkCollisions(getHitbox())) {
      playHit();
      increasePursuit(15);
      shakeCamera(0.4);
    }

    // Siren
    if (pursuitMeter > 60) startSiren(); else stopSiren();

    // Engine pitch
    setEngineSpeed((speed - 40) / (MAX_SPEED - 40));
    if (window.setSpeedLinesIntensity) {
      window.setSpeedLinesIntensity((speed - 40) / (MAX_SPEED - 40));
    }

    // HUD
    updateHUD(score, distanceM / 1000, pursuitMeter);
  } else if (gameState === 'shootout') {
    // Keep rendering the scene but don't advance game
    updateEngine(dt, 0);
  }

  if (gameState !== 'gameover') {
    rafId = requestAnimationFrame(gameLoop);
  }
}

// ── Shootout Callbacks ──
function onShootoutTriggered() {
  gameState = 'shootout';
  stopSiren();
  startShootout();
}

function onShootoutSuccess() {
  addShootoutWin(); // track for Zack unlock
  resetPursuit(20);
  gameState = 'playing';
  lastTime  = null;
  rafId = requestAnimationFrame(gameLoop);
}

function onShootoutFail() {
  triggerGameOver();
}

// ── Game Over ──
function triggerGameOver() {
  gameState = 'gameover';
  hidePauseOverlay();
  stopEngine();
  stopSiren();
  playGameOver();

  // Persist stats for unlock tracking
  addTotalKm(distanceM / 1000);

  if (Math.floor(score) > highScore) {
    highScore = Math.floor(score);
    localStorage.setItem('bb_highscore', highScore);
  }
  endShootout();
  hideHUD();
  cancelAnimationFrame(rafId);
  setTimeout(() => showGameOver(score, distanceM / 1000, highScore, goToCharacterSelect), 600);
}
