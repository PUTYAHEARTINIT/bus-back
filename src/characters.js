// characters.js — Character roster, unlock logic, persistence

export const CHARACTERS = [
  {
    id: 'byron',
    name: 'Byron Grant',
    nickname: '"Big B"',
    origin: 'Eastside Projects',
    chasedBy: 'RIVAL GANG',
    carColor: 0x8B0000,
    skinColor: 0x3d2314,
    outfitColor: 0xcc1111,
    accentColor: '#cc2200',
    locked: false,
    unlockDesc: 'STARTER',
    bio: "Just got out. The streets didn't forget his name.",
    stats: { speed: 3, defense: 5, luck: 2 },
  },
  {
    id: 'ray',
    name: 'Old Head Ray',
    nickname: '"The O.G."',
    origin: 'South Side',
    chasedBy: 'CORRUPT COPS',
    carColor: 0x1a3a6a,
    skinColor: 0x2a1a10,
    outfitColor: 0x445566,
    accentColor: '#4488cc',
    locked: false,
    unlockDesc: 'STARTER',
    bio: "Been through it all. Still standing. Wisdom is the ride.",
    stats: { speed: 2, defense: 5, luck: 4 },
  },
  {
    id: 'zack',
    name: 'Zack',
    nickname: '"Ghost"',
    origin: 'Unknown',
    chasedBy: 'FBI DRONES',
    carColor: 0x112244,
    skinColor: 0xd4aa77,
    outfitColor: 0x223322,
    accentColor: '#44ff88',
    locked: true,
    unlockType: 'shootout',
    unlockCount: 3,
    unlockDesc: 'SURVIVE 3 SHOOTOUTS',
    bio: "They've been watching him his whole life. He's done hiding.",
    stats: { speed: 5, defense: 2, luck: 3 },
  },
  {
    id: 'diamond',
    name: 'Diamond',
    nickname: '"The Star"',
    origin: 'Hollywood',
    chasedBy: 'PAPARAZZI',
    carColor: 0xaa8800,
    skinColor: 0x5c3520,
    outfitColor: 0xddaa00,
    accentColor: '#ffcc00',
    locked: true,
    unlockType: 'score',
    unlockScore: 5000,
    unlockDesc: 'SCORE 5,000 PTS',
    bio: "Fame is her weapon. Privacy is the war she never stops winning.",
    stats: { speed: 4, defense: 3, luck: 4 },
  },
  {
    id: 'maria',
    name: 'Maria',
    nickname: '"La Jefa"',
    origin: 'West Side',
    chasedBy: 'OBSESSIVE EX',
    carColor: 0x880033,
    skinColor: 0xc07840,
    outfitColor: 0x5500aa,
    accentColor: '#ff44aa',
    locked: true,
    unlockType: 'distance',
    unlockKm: 10,
    unlockDesc: 'DRIVE 10KM TOTAL',
    bio: "She's done running scared. Now she runs on her own terms.",
    stats: { speed: 4, defense: 3, luck: 5 },
  },
];

// ── Persistence helpers ───────────────────────────────────────────────────────

export function getUnlockedIds() {
  return JSON.parse(localStorage.getItem('bb_unlocked') || '["byron","ray"]');
}

export function checkUnlocks() {
  const highScore      = parseInt(localStorage.getItem('bb_highscore')        || '0');
  const totalKm        = parseFloat(localStorage.getItem('bb_total_km')       || '0');
  const totalShootouts = parseInt(localStorage.getItem('bb_total_shootouts')  || '0');
  const unlocked       = getUnlockedIds();
  let changed = false;

  for (const ch of CHARACTERS) {
    if (unlocked.includes(ch.id)) continue;
    if (ch.unlockType === 'score'    && highScore      >= ch.unlockScore)  { unlocked.push(ch.id); changed = true; }
    if (ch.unlockType === 'distance' && totalKm        >= ch.unlockKm)    { unlocked.push(ch.id); changed = true; }
    if (ch.unlockType === 'shootout' && totalShootouts >= ch.unlockCount) { unlocked.push(ch.id); changed = true; }
  }
  if (changed) localStorage.setItem('bb_unlocked', JSON.stringify(unlocked));
  return unlocked;
}

export function getSelectedCharacter() {
  const id = localStorage.getItem('bb_selected') || 'byron';
  return CHARACTERS.find(c => c.id === id) || CHARACTERS[0];
}

export function setSelectedCharacter(id) {
  localStorage.setItem('bb_selected', id);
}

export function addTotalKm(km) {
  const prev = parseFloat(localStorage.getItem('bb_total_km') || '0');
  localStorage.setItem('bb_total_km', (prev + km).toFixed(3));
}

export function addShootoutWin() {
  const prev = parseInt(localStorage.getItem('bb_total_shootouts') || '0');
  localStorage.setItem('bb_total_shootouts', prev + 1);
}
