// characterSelect.js — Character selection overlay with real portrait art

import { CHARACTERS, getUnlockedIds, checkUnlocks, getSelectedCharacter, setSelectedCharacter } from './characters.js';

export function showCharacterSelect(onConfirm) {
  checkUnlocks();
  const unlockedIds = getUnlockedIds();
  let selectedId = getSelectedCharacter().id;
  if (!unlockedIds.includes(selectedId)) selectedId = 'byron';

  const overlay = document.createElement('div');
  overlay.id = 'char-select';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(2,2,6,0.97); z-index: 200;
    display: flex; flex-direction: column;
    align-items: center; justify-content: flex-start;
    font-family: 'Courier New', monospace;
    overflow-y: auto; padding: 22px 12px 28px;
    -webkit-overflow-scrolling: touch;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `text-align:center; margin-bottom:4px;`;
  header.innerHTML = `
    <div style="font-size:clamp(9px,1.8vw,12px);letter-spacing:6px;color:#cc2200;font-weight:900;margin-bottom:5px;">BUS BACK — THE GAME</div>
    <div style="font-size:clamp(20px,5vw,32px);font-weight:900;color:#fff;letter-spacing:6px;
      text-shadow:0 0 28px rgba(255,40,0,0.5);">SELECT RUNNER</div>
  `;
  overlay.appendChild(header);

  // Cards grid
  const grid = document.createElement('div');
  grid.style.cssText = `
    display:flex; flex-wrap:wrap; justify-content:center;
    gap:14px; max-width:920px; padding:16px 0 8px;
  `;

  function refreshCards() {
    grid.querySelectorAll('[data-id]').forEach(card => {
      const ch = CHARACTERS.find(c => c.id === card.dataset.id);
      const isSel = card.dataset.id === selectedId;
      card.style.borderColor = isSel ? ch.accentColor : 'rgba(255,255,255,0.08)';
      card.style.boxShadow   = isSel ? `0 0 24px ${ch.accentColor}66, 0 0 6px ${ch.accentColor}33` : 'none';
      card.style.transform   = isSel ? 'scale(1.04)' : 'scale(1)';
    });
    const bio = overlay.querySelector('#char-bio');
    const ch  = CHARACTERS.find(c => c.id === selectedId);
    if (bio && ch) bio.textContent = ch.bio;
  }

  for (const char of CHARACTERS) {
    const isUnlocked = unlockedIds.includes(char.id);
    const isSelected = char.id === selectedId;

    const card = document.createElement('div');
    card.dataset.id = char.id;
    card.style.cssText = `
      width: clamp(140px, 27vw, 168px);
      border: 2px solid ${isSelected ? char.accentColor : 'rgba(255,255,255,0.08)'};
      border-radius: 10px; overflow: hidden;
      cursor: ${isUnlocked ? 'pointer' : 'default'};
      opacity: ${isUnlocked ? '1' : '0.38'};
      position: relative;
      box-shadow: ${isSelected ? `0 0 24px ${char.accentColor}66` : 'none'};
      transform: ${isSelected ? 'scale(1.04)' : 'scale(1)'};
      transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
      -webkit-tap-highlight-color: transparent;
      background: #050508;
    `;

    // Portrait image — fills card top ~70%
    const portrait = document.createElement('div');
    portrait.style.cssText = `
      width: 100%; padding-top: 133%;
      position: relative; overflow: hidden;
      background: #0a0a14;
    `;
    const img = document.createElement('img');
    img.src = char.portrait;
    img.alt = char.name;
    img.style.cssText = `
      position: absolute; top: 0; left: 0;
      width: 100%; height: 100%;
      object-fit: cover; object-position: top center;
      display: block;
    `;
    portrait.appendChild(img);
    card.appendChild(portrait);

    // Info strip at bottom
    const info = document.createElement('div');
    info.style.cssText = `
      padding: 8px 9px 9px;
      background: linear-gradient(180deg, rgba(0,0,0,0.92) 0%, rgba(5,5,15,0.99) 100%);
      border-top: 1px solid ${char.accentColor}44;
    `;

    // Name row
    info.innerHTML += `
      <div style="font-size:10px;font-weight:900;color:#fff;letter-spacing:1.5px;line-height:1.2;">${char.name}</div>
      <div style="font-size:9px;color:${char.accentColor};letter-spacing:1px;margin-bottom:7px;">${char.nickname}</div>
    `;

    // Stat bars
    const statsHtml = [['SPD', char.stats.speed], ['DEF', char.stats.defense], ['LCK', char.stats.luck]].map(([lbl, val]) => `
      <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px;">
        <span style="font-size:7px;color:rgba(255,255,255,0.35);width:20px;">${lbl}</span>
        <div style="flex:1;height:3px;background:rgba(255,255,255,0.07);border-radius:2px;overflow:hidden;">
          <div style="height:100%;width:${val * 20}%;background:${char.accentColor};border-radius:2px;"></div>
        </div>
      </div>
    `).join('');
    info.innerHTML += statsHtml;

    // Status
    info.innerHTML += `
      <div style="font-size:8px;font-weight:700;margin-top:5px;
        color:${isUnlocked ? char.accentColor : '#ff4444'};letter-spacing:1px;line-height:1.3;">
        ${isUnlocked ? `► CHASED BY: ${char.chasedBy}` : `🔒 ${char.unlockDesc}`}
      </div>
    `;

    card.appendChild(info);

    // Lock overlay
    if (!isUnlocked) {
      const lockEl = document.createElement('div');
      lockEl.style.cssText = `
        position:absolute;inset:0;border-radius:9px;
        background:rgba(0,0,0,0.55);
        display:flex;align-items:center;justify-content:center;
        font-size:36px;
      `;
      lockEl.textContent = '🔒';
      card.appendChild(lockEl);
    } else {
      card.addEventListener('click', () => {
        selectedId = char.id;
        refreshCards();
      });
    }

    grid.appendChild(card);
  }
  overlay.appendChild(grid);

  // Bio line
  const bio = document.createElement('div');
  bio.id = 'char-bio';
  bio.textContent = CHARACTERS.find(c => c.id === selectedId)?.bio || '';
  bio.style.cssText = `
    font-size: clamp(10px,2vw,12px); color: rgba(255,255,255,0.4);
    letter-spacing: 1px; text-align: center; max-width: 500px;
    padding: 0 20px; min-height: 34px; margin: 10px 0 16px;
    line-height: 1.55;
  `;
  overlay.appendChild(bio);

  // Play button
  const playBtn = document.createElement('button');
  playBtn.textContent = 'RUN IT →';
  playBtn.style.cssText = `
    padding: 15px 52px; font-size: 15px; font-weight: 900;
    letter-spacing: 5px; font-family: 'Courier New', monospace;
    background: #cc2200; border: none; color: #fff;
    border-radius: 8px; cursor: pointer;
    box-shadow: 0 0 28px rgba(200,30,0,0.45);
    -webkit-tap-highlight-color: transparent;
    margin-bottom: 20px;
  `;
  playBtn.addEventListener('click', () => {
    const char = CHARACTERS.find(c => c.id === selectedId) || CHARACTERS[0];
    setSelectedCharacter(char.id);
    document.body.removeChild(overlay);
    onConfirm(char);
  });
  overlay.appendChild(playBtn);

  document.body.appendChild(overlay);
}
