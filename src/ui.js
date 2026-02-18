// ui.js — Game screens: start, game over

let startScreen = null;
let gameOverScreen = null;

function injectBaseStyles() {
  if (document.getElementById('ui-base-style')) return;
  const style = document.createElement('style');
  style.id = 'ui-base-style';
  style.textContent = `
    @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
    @keyframes tapBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

export function showStartScreen(onStart) {
  removeScreens();
  injectBaseStyles();

  startScreen = document.createElement('div');
  startScreen.id = 'start-screen';
  startScreen.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(5,5,10,0.94);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    z-index: 200; font-family: 'Courier New', monospace;
    animation: fadeIn 0.5s ease;
    cursor: pointer;
  `;

  startScreen.innerHTML = `
    <div style="
      font-size: clamp(52px, 13vw, 100px);
      font-weight: 900; letter-spacing: 8px;
      color: #ffffff;
      text-shadow: 0 0 40px rgba(255,50,50,0.8), 0 4px 0 rgba(180,0,0,0.6);
      margin-bottom: 10px; text-align: center; line-height: 1;
    ">BUS BACK</div>

    <div style="
      font-size: clamp(11px, 2.8vw, 17px);
      color: rgba(255,255,255,0.45);
      letter-spacing: 7px; margin-bottom: 64px;
      text-transform: uppercase;
    ">Don't Get Caught</div>

    <div style="
      font-size: clamp(13px, 3vw, 17px);
      color: rgba(255,255,255,0.7); letter-spacing: 3px;
      animation: tapBlink 1.2s infinite;
    ">TAP TO START</div>

    <div style="
      position: absolute; bottom: 36px;
      font-size: clamp(10px, 1.8vw, 12px);
      color: rgba(255,255,255,0.22);
      letter-spacing: 2px; text-align: center; line-height: 1.8;
    ">← → LANES &nbsp;|&nbsp; ↑ JUMP &nbsp;|&nbsp; ↓ DUCK<br>SWIPE ON MOBILE</div>
  `;

  startScreen.addEventListener('click', () => {
    startScreen.style.opacity = '0';
    startScreen.style.transition = 'opacity 0.3s';
    setTimeout(() => { removeScreens(); onStart(); }, 300);
  });
  startScreen.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startScreen.click();
  }, { passive: false });

  document.body.appendChild(startScreen);
}

export function showGameOver(score, distanceKm, highScore, onRestart) {
  removeScreens();
  injectBaseStyles();

  gameOverScreen = document.createElement('div');
  gameOverScreen.id = 'gameover-screen';
  gameOverScreen.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(5,5,10,0.94);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    z-index: 200; font-family: 'Courier New', monospace;
    animation: fadeIn 0.5s ease;
  `;

  gameOverScreen.innerHTML = `
    <div style="
      font-size: clamp(38px, 9vw, 68px);
      font-weight: 900; letter-spacing: 6px;
      color: #ff3333;
      text-shadow: 0 0 30px rgba(255,50,50,0.7);
      margin-bottom: 6px;
    ">BUSTED</div>

    <div style="
      color: rgba(255,255,255,0.35); letter-spacing: 3px;
      font-size: clamp(11px, 2vw, 13px); margin-bottom: 44px;
    ">THEY CAUGHT YOU</div>

    <div style="
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px; padding: 28px 48px;
      text-align: center; margin-bottom: 40px;
      animation: slideUp 0.4s ease 0.15s both;
    ">
      <div style="color:rgba(255,255,255,0.45);font-size:11px;letter-spacing:3px;margin-bottom:6px;">DISTANCE</div>
      <div style="color:#fff;font-size:clamp(28px,6vw,44px);font-weight:700;letter-spacing:2px;">
        ${distanceKm.toFixed(2)} KM
      </div>
      <div style="color:rgba(255,255,255,0.45);font-size:11px;letter-spacing:3px;margin-top:18px;margin-bottom:6px;">SCORE</div>
      <div style="color:#ffcc00;font-size:clamp(22px,5vw,36px);font-weight:700;letter-spacing:2px;">
        ${Math.floor(score).toLocaleString()}
      </div>
      <div style="color:rgba(255,255,255,0.45);font-size:11px;letter-spacing:3px;margin-top:18px;margin-bottom:6px;">BEST</div>
      <div style="color:${Math.floor(score) >= highScore && highScore > 0 ? '#00ffaa' : 'rgba(255,255,255,0.6)'};font-size:clamp(16px,3.5vw,26px);font-weight:700;letter-spacing:2px;">
        ${highScore.toLocaleString()}${Math.floor(score) >= highScore && highScore > 0 ? ' ★ NEW BEST' : ''}
      </div>
    </div>

    <button id="restart-btn" style="
      background: rgba(255,50,50,0.1);
      border: 2px solid #ff3333; color: #ff3333;
      font-family: 'Courier New', monospace;
      font-size: 14px; font-weight: 900;
      letter-spacing: 4px; padding: 16px 44px;
      border-radius: 8px; cursor: pointer;
      text-transform: uppercase; transition: all 0.2s;
    ">PLAY AGAIN</button>
  `;

  const btn = gameOverScreen.querySelector('#restart-btn');
  btn.addEventListener('mouseover', () => btn.style.background = 'rgba(255,50,50,0.22)');
  btn.addEventListener('mouseout',  () => btn.style.background = 'rgba(255,50,50,0.1)');
  btn.addEventListener('click', () => {
    gameOverScreen.style.opacity = '0';
    gameOverScreen.style.transition = 'opacity 0.3s';
    setTimeout(() => { removeScreens(); onRestart(); }, 300);
  });

  document.body.appendChild(gameOverScreen);
}

function removeScreens() {
  [startScreen, gameOverScreen].forEach(s => {
    if (s && s.parentNode) s.parentNode.removeChild(s);
  });
  startScreen = null;
  gameOverScreen = null;
}
