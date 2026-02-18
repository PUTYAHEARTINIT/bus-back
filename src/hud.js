// hud.js — CSS HUD overlay (score, distance, pursuit meter, pause, mute)

let hudEl = null;
let scoreEl = null;
let distanceEl = null;
let meterFillEl = null;
let meterLabelEl = null;
let pauseBtnEl = null;
let muteBtnEl = null;
let pauseOverlayEl = null;

let onPauseCb = null;
let onResumeCb = null;
let onRestartCb = null;
let onMuteCb = null;

export function initHUD(onPause, onResume, onRestart, onMute) {
  onPauseCb   = onPause;
  onResumeCb  = onResume;
  onRestartCb = onRestart;
  onMuteCb    = onMute;
  hudEl = document.createElement('div');
  hudEl.id = 'hud';
  hudEl.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 50;
    font-family: 'Courier New', monospace;
  `;

  // Score + Distance (top left)
  const topLeft = document.createElement('div');
  topLeft.style.cssText = `
    position: absolute; top: 20px; left: 20px;
    display: flex; flex-direction: column; gap: 4px;
  `;

  scoreEl = document.createElement('div');
  scoreEl.style.cssText = `
    font-size: clamp(14px, 3vw, 20px); font-weight: 700;
    color: #ffffff; letter-spacing: 2px;
    text-shadow: 0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.2);
  `;
  scoreEl.textContent = 'SCORE: 0';

  distanceEl = document.createElement('div');
  distanceEl.style.cssText = `
    font-size: clamp(12px, 2.5vw, 17px); font-weight: 600;
    color: rgba(255,255,255,0.7); letter-spacing: 1px;
    text-shadow: 0 2px 6px rgba(0,0,0,0.8);
  `;
  distanceEl.textContent = '0.0 KM';

  topLeft.appendChild(scoreEl);
  topLeft.appendChild(distanceEl);
  hudEl.appendChild(topLeft);

  // Pursuit meter (top right)
  const meterContainer = document.createElement('div');
  meterContainer.style.cssText = `
    position: absolute; top: 20px; right: 20px;
    display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
    min-width: clamp(100px, 20vw, 160px);
  `;

  meterLabelEl = document.createElement('div');
  meterLabelEl.style.cssText = `
    font-size: clamp(10px, 2vw, 13px); font-weight: 900;
    color: #ff4444; letter-spacing: 3px;
    text-shadow: 0 0 10px rgba(255,50,50,0.6);
  `;
  meterLabelEl.textContent = 'PURSUIT';

  const meterTrack = document.createElement('div');
  meterTrack.style.cssText = `
    width: 100%; height: 10px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,50,50,0.3);
    border-radius: 5px; overflow: hidden;
  `;

  meterFillEl = document.createElement('div');
  meterFillEl.style.cssText = `
    height: 100%; width: 0%;
    background: linear-gradient(90deg, #22cc44, #ffcc00, #ff4400);
    border-radius: 5px;
    transition: width 0.1s ease;
  `;

  meterTrack.appendChild(meterFillEl);
  meterContainer.appendChild(meterLabelEl);
  meterContainer.appendChild(meterTrack);
  hudEl.appendChild(meterContainer);

  if (!document.getElementById('hud-style')) {
    const style = document.createElement('style');
    style.id = 'hud-style';
    style.textContent = `
      @keyframes meterPulse {
        0%   { box-shadow: 0 0 8px rgba(255,50,50,0.6); }
        100% { box-shadow: 0 0 20px rgba(255,50,50,1); }
      }
      @keyframes labelPulse {
        0%,100% { opacity: 1; }
        50%     { opacity: 0.4; }
      }
      @keyframes pulse {
        0%   { opacity: 1; transform: translateX(-50%) scale(1); }
        100% { opacity: 0.6; transform: translateX(-50%) scale(1.05); }
      }
    `;
    document.head.appendChild(style);
  }

  // ── Pause button (top center) ──
  pauseBtnEl = document.createElement('div');
  pauseBtnEl.style.cssText = `
    position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
    width: 44px; height: 44px; border-radius: 50%;
    background: rgba(0,0,0,0.5); border: 2px solid rgba(255,255,255,0.3);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; pointer-events: all; font-size: 18px;
    -webkit-tap-highlight-color: transparent;
  `;
  pauseBtnEl.textContent = '⏸';
  pauseBtnEl.addEventListener('click', () => {
    if (onPauseCb) onPauseCb();
    showPauseOverlay();
  });
  hudEl.appendChild(pauseBtnEl);

  // ── Sound toggle (bottom right) ──
  muteBtnEl = document.createElement('div');
  muteBtnEl.style.cssText = `
    position: absolute; bottom: 24px; right: 20px;
    width: 44px; height: 44px; border-radius: 50%;
    background: rgba(0,0,0,0.5); border: 2px solid rgba(255,255,255,0.3);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; pointer-events: all; font-size: 20px;
    -webkit-tap-highlight-color: transparent;
  `;
  muteBtnEl.textContent = '🔊';
  muteBtnEl.addEventListener('click', () => {
    const nowMuted = onMuteCb ? onMuteCb() : false;
    muteBtnEl.textContent = nowMuted ? '🔇' : '🔊';
  });
  hudEl.appendChild(muteBtnEl);

  document.body.appendChild(hudEl);
}

function showPauseOverlay() {
  if (pauseOverlayEl) return;
  pauseOverlayEl = document.createElement('div');
  pauseOverlayEl.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.75); z-index: 150;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 20px;
    font-family: 'Courier New', monospace;
  `;

  const title = document.createElement('div');
  title.textContent = 'PAUSED';
  title.style.cssText = `color:#fff;font-size:clamp(36px,8vw,60px);font-weight:900;letter-spacing:8px;`;
  pauseOverlayEl.appendChild(title);

  const btnStyle = `
    padding: 16px 44px; border-radius: 8px; font-size: 15px; font-weight: 900;
    letter-spacing: 3px; cursor: pointer; font-family: 'Courier New', monospace;
    -webkit-tap-highlight-color: transparent;
  `;

  const resumeBtn = document.createElement('button');
  resumeBtn.textContent = 'RESUME';
  resumeBtn.style.cssText = btnStyle + `background:rgba(255,255,255,0.1);border:2px solid #fff;color:#fff;`;
  resumeBtn.addEventListener('click', () => {
    hidePauseOverlay();
    if (onResumeCb) onResumeCb();
    if (pauseBtnEl) pauseBtnEl.textContent = '⏸';
  });
  pauseOverlayEl.appendChild(resumeBtn);

  const restartBtn = document.createElement('button');
  restartBtn.textContent = 'RESTART';
  restartBtn.style.cssText = btnStyle + `background:rgba(255,50,50,0.15);border:2px solid #ff3333;color:#ff3333;`;
  restartBtn.addEventListener('click', () => {
    hidePauseOverlay();
    if (onRestartCb) onRestartCb();
    if (pauseBtnEl) pauseBtnEl.textContent = '⏸';
  });
  pauseOverlayEl.appendChild(restartBtn);

  document.body.appendChild(pauseOverlayEl);
}

export function hidePauseOverlay() {
  if (pauseOverlayEl && pauseOverlayEl.parentNode) {
    pauseOverlayEl.parentNode.removeChild(pauseOverlayEl);
  }
  pauseOverlayEl = null;
}

export function updateHUD(score, distanceKm, pursuitPct) {
  if (!hudEl) return;
  if (scoreEl)    scoreEl.textContent    = `SCORE: ${Math.floor(score).toLocaleString()}`;
  if (distanceEl) distanceEl.textContent = `${distanceKm.toFixed(1)} KM`;
  if (meterFillEl) {
    meterFillEl.style.width = `${pursuitPct}%`;
    if (pursuitPct > 80) {
      meterFillEl.style.animation = 'meterPulse 0.4s infinite alternate';
      if (meterLabelEl) meterLabelEl.style.animation = 'labelPulse 0.4s infinite';
    } else {
      meterFillEl.style.animation = 'none';
      if (meterLabelEl) meterLabelEl.style.animation = 'none';
    }
  }
}

export function showHUD() { if (hudEl) hudEl.style.display = 'block'; }
export function hideHUD() { if (hudEl) hudEl.style.display = 'none';  }
