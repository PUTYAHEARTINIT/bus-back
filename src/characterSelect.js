// characterSelect.js — Character selection overlay

import { CHARACTERS, getUnlockedIds, checkUnlocks, getSelectedCharacter, setSelectedCharacter } from './characters.js';

export function showCharacterSelect(onConfirm) {
  checkUnlocks();
  const unlockedIds = getUnlockedIds();
  let selectedId = getSelectedCharacter().id;
  // Ensure selected character is actually unlocked
  if (!unlockedIds.includes(selectedId)) selectedId = 'byron';

  const overlay = document.createElement('div');
  overlay.id = 'char-select';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(2,3,10,0.96); z-index: 200;
    display: flex; flex-direction: column;
    align-items: center; justify-content: flex-start;
    font-family: 'Courier New', monospace;
    overflow-y: auto; padding: 28px 12px 28px;
    -webkit-overflow-scrolling: touch;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    text-align: center; margin-bottom: 6px;
  `;
  header.innerHTML = `
    <div style="font-size: clamp(10px,2vw,13px); letter-spacing: 5px; color: #ff3300; font-weight: 900; margin-bottom: 6px;">BUS BACK</div>
    <div style="font-size: clamp(18px,4.5vw,30px); font-weight: 900; color: #fff; letter-spacing: 7px; text-shadow: 0 0 24px rgba(255,50,0,0.4);">SELECT RUNNER</div>
  `;
  overlay.appendChild(header);

  // Cards grid
  const grid = document.createElement('div');
  grid.style.cssText = `
    display: flex; flex-wrap: wrap; justify-content: center;
    gap: 12px; max-width: 860px; padding: 18px 0 10px;
  `;

  function refreshCards() {
    grid.querySelectorAll('[data-id]').forEach(card => {
      const ch = CHARACTERS.find(c => c.id === card.dataset.id);
      const isSelected = card.dataset.id === selectedId;
      const isUnlocked = unlockedIds.includes(card.dataset.id);
      card.style.borderColor = isSelected
        ? ch.accentColor
        : (isUnlocked ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)');
      card.style.boxShadow = isSelected ? `0 0 20px ${ch.accentColor}55` : 'none';
    });
    // Update bio
    const bio = overlay.querySelector('#char-bio');
    if (bio) bio.textContent = CHARACTERS.find(c => c.id === selectedId)?.bio || '';
  }

  for (const char of CHARACTERS) {
    const isUnlocked = unlockedIds.includes(char.id);
    const isSelected = char.id === selectedId;

    const card = document.createElement('div');
    card.dataset.id = char.id;
    card.style.cssText = `
      width: clamp(135px, 26vw, 158px);
      background: rgba(8,10,22,0.98);
      border: 2px solid ${isSelected ? char.accentColor : (isUnlocked ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)')};
      border-radius: 10px;
      padding: 14px 10px 12px;
      cursor: ${isUnlocked ? 'pointer' : 'default'};
      opacity: ${isUnlocked ? '1' : '0.42'};
      position: relative; text-align: center;
      box-shadow: ${isSelected ? `0 0 20px ${char.accentColor}55` : 'none'};
      -webkit-tap-highlight-color: transparent;
      transition: border-color 0.15s, box-shadow 0.15s;
    `;

    // Character silhouette icon
    const iconWrap = document.createElement('div');
    iconWrap.style.cssText = `
      width: 60px; height: 76px; margin: 0 auto 10px;
      border-radius: 6px; overflow: hidden; position: relative;
      background: linear-gradient(160deg, ${char.accentColor}22, ${char.accentColor}66);
      border: 1px solid ${char.accentColor}44;
    `;
    // Simple CSS person silhouette
    iconWrap.innerHTML = `
      <div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);
        width:22px;height:22px;background:${char.skinColor ? '#' + char.skinColor.toString(16).padStart(6,'0') : '#5c3520'};
        border-radius:50%;border:1.5px solid rgba(255,255,255,0.15);"></div>
      <div style="position:absolute;top:30px;left:50%;transform:translateX(-50%);
        width:30px;height:26px;background:${'#' + char.outfitColor.toString(16).padStart(6,'0')};
        border-radius:3px 3px 0 0;"></div>
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);
        width:34px;height:22px;background:${'#' + char.outfitColor.toString(16).padStart(6,'0')};
        opacity:0.7;display:flex;gap:4px;align-items:flex-start;padding-top:2px;">
        <div style="width:13px;height:20px;background:#111122;border-radius:2px;"></div>
        <div style="width:13px;height:20px;background:#111122;border-radius:2px;"></div>
      </div>
      <div style="position:absolute;top:28px;left:3px;width:10px;height:18px;
        background:${'#' + char.outfitColor.toString(16).padStart(6,'0')};border-radius:2px;"></div>
      <div style="position:absolute;top:28px;right:3px;width:10px;height:18px;
        background:${'#' + char.outfitColor.toString(16).padStart(6,'0')};border-radius:2px;"></div>
    `;
    card.appendChild(iconWrap);

    // Name
    const nameEl = document.createElement('div');
    nameEl.textContent = char.name;
    nameEl.style.cssText = `font-size: 10px; font-weight: 900; color: #fff; letter-spacing: 1px; margin-bottom: 2px;`;
    card.appendChild(nameEl);

    // Nickname
    const nickEl = document.createElement('div');
    nickEl.textContent = char.nickname;
    nickEl.style.cssText = `font-size: 9px; color: ${char.accentColor}; letter-spacing: 1px; margin-bottom: 9px;`;
    card.appendChild(nickEl);

    // Stat bars
    const statsWrap = document.createElement('div');
    statsWrap.style.cssText = `display:flex;flex-direction:column;gap:4px;margin-bottom:9px;`;
    for (const [label, val] of [['SPD', char.stats.speed], ['DEF', char.stats.defense], ['LCK', char.stats.luck]]) {
      const row = document.createElement('div');
      row.style.cssText = `display:flex;align-items:center;gap:5px;`;
      row.innerHTML = `
        <span style="font-size:8px;color:rgba(255,255,255,0.4);width:22px;">${label}</span>
        <div style="flex:1;height:3px;background:rgba(255,255,255,0.08);border-radius:2px;overflow:hidden;">
          <div style="height:100%;width:${val * 20}%;background:${char.accentColor};border-radius:2px;"></div>
        </div>
      `;
      statsWrap.appendChild(row);
    }
    card.appendChild(statsWrap);

    // Status line
    const statusEl = document.createElement('div');
    if (isUnlocked) {
      statusEl.textContent = `► ${char.chasedBy}`;
      statusEl.style.cssText = `font-size: 8px; color: ${char.accentColor}; letter-spacing: 1px; font-weight: 700;`;
    } else {
      statusEl.textContent = `🔒 ${char.unlockDesc}`;
      statusEl.style.cssText = `font-size: 8px; color: #ff4444; letter-spacing: 1px; line-height: 1.4;`;
    }
    card.appendChild(statusEl);

    // Lock overlay
    if (!isUnlocked) {
      const lockEl = document.createElement('div');
      lockEl.style.cssText = `
        position:absolute;inset:0;border-radius:9px;
        background:rgba(0,0,0,0.3);
        display:flex;align-items:center;justify-content:center;
        font-size:26px;
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
    font-size: clamp(10px,2vw,12px); color: rgba(255,255,255,0.42);
    letter-spacing: 1px; text-align: center; max-width: 480px;
    padding: 0 20px; min-height: 36px; margin-bottom: 18px;
    line-height: 1.5;
  `;
  overlay.appendChild(bio);

  // Run It button
  const playBtn = document.createElement('button');
  playBtn.textContent = 'RUN IT →';
  playBtn.style.cssText = `
    padding: 15px 52px; font-size: 15px; font-weight: 900;
    letter-spacing: 5px; font-family: 'Courier New', monospace;
    background: #cc2200; border: none; color: #fff;
    border-radius: 8px; cursor: pointer;
    box-shadow: 0 0 28px rgba(200,30,0,0.45);
    -webkit-tap-highlight-color: transparent;
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
