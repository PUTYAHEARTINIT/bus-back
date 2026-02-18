// shootout.js — Tap-to-shoot overlay phase

let overlay = null;
let missCount = 0;
let hitCount = 0;
let totalTargets = 0;
let onSuccessCb = null;
let onFailCb = null;
let spawnTimers = [];
let missTimers = [];

export function initShootout(onSuccess, onFail) {
  onSuccessCb = onSuccess;
  onFailCb = onFail;
}

export function startShootout() {
  missCount = 0;
  hitCount = 0;
  totalTargets = 3 + Math.floor(Math.random() * 3); // 3–5 targets

  overlay = document.createElement('div');
  overlay.id = 'shootout-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    z-index: 100; pointer-events: none;
  `;

  const label = document.createElement('div');
  label.textContent = 'TAP THE TARGETS';
  label.style.cssText = `
    position: absolute; top: 15%; left: 50%; transform: translateX(-50%);
    font-family: 'Courier New', monospace;
    font-size: clamp(18px, 4vw, 28px); font-weight: 900;
    color: #ff3333; letter-spacing: 4px;
    text-shadow: 0 0 20px rgba(255,50,50,0.8);
    animation: soTargetPulse 0.5s infinite alternate;
    white-space: nowrap;
  `;
  overlay.appendChild(label);

  if (!document.getElementById('shootout-style')) {
    const style = document.createElement('style');
    style.id = 'shootout-style';
    style.textContent = `
      @keyframes soTargetPulse {
        from { opacity: 1; transform: translateX(-50%) scale(1); }
        to   { opacity: 0.6; transform: translateX(-50%) scale(1.04); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(overlay);

  for (let i = 0; i < totalTargets; i++) {
    const t = setTimeout(() => spawnTarget(), i * 400);
    spawnTimers.push(t);
  }
}

function spawnTarget() {
  if (!overlay) return;
  const size = Math.max(50, Math.min(80, window.innerWidth * 0.1));
  const x = size + Math.random() * (window.innerWidth - size * 2);
  const y = size + Math.random() * (window.innerHeight * 0.55);

  const target = document.createElement('div');
  target.style.cssText = `
    position: absolute;
    left: ${x - size / 2}px; top: ${y - size / 2}px;
    width: ${size}px; height: ${size}px;
    border-radius: 50%;
    border: 4px solid #ff3333;
    background: radial-gradient(circle, rgba(255,50,50,0.25), rgba(255,50,50,0.05));
    cursor: crosshair; pointer-events: all;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Courier New', monospace;
    font-size: ${size * 0.3}px; font-weight: 900; color: #ff3333;
    box-shadow: 0 0 20px rgba(255,50,50,0.5), inset 0 0 20px rgba(255,50,50,0.1);
    transition: transform 0.1s, opacity 0.2s;
    user-select: none;
  `;
  target.textContent = '✕';

  const missTimer = setTimeout(() => {
    if (target.parentNode) {
      target.parentNode.removeChild(target);
      missCount++;
      checkResult();
    }
  }, 2500);
  missTimers.push(missTimer);

  const onHit = () => {
    clearTimeout(missTimer);
    target.style.transform = 'scale(1.4)';
    target.style.opacity = '0';
    setTimeout(() => target.parentNode && target.parentNode.removeChild(target), 200);
    hitCount++;
    checkResult();
  };

  target.addEventListener('click', onHit);
  target.addEventListener('touchstart', (e) => { e.preventDefault(); onHit(); }, { passive: false });

  overlay.appendChild(target);
}

function checkResult() {
  if (hitCount + missCount < totalTargets) return;
  endShootout();
  if (missCount >= 3) {
    if (onFailCb) onFailCb();
  } else {
    if (onSuccessCb) onSuccessCb();
  }
}

export function endShootout() {
  for (const t of spawnTimers) clearTimeout(t);
  for (const t of missTimers)  clearTimeout(t);
  spawnTimers = [];
  missTimers  = [];
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  overlay = null;
}
