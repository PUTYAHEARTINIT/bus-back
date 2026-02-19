// characters.js — Character roster, unlock logic, persistence

export const CHARACTERS = [
  {
    id: 'byron',
    name: 'Byron Grant',
    nickname: '"Big B"',
    origin: 'Eastside Projects',
    chasedBy: 'RIVAL GANG',
    portrait: 'assets/characters/byron.png',
    carColor: 0x8B0000,
    skinColor: 0x3d2314,
    outfitColor: 0xcc1111,
    accentColor: '#cc2200',
    locked: false,
    unlockDesc: 'STARTER',
    bio: "Ex-con. Big heart, short temper. He don't run — he drives like the block owes him rent.",
    stats: { speed: 3, defense: 5, luck: 2 },
  },
  {
    id: 'maria',
    name: 'Maria Mendoza',
    nickname: '"La Reina"',
    origin: 'Boyle Heights',
    chasedBy: 'OBSESSIVE EX',
    portrait: 'assets/characters/maria.png',
    carColor: 0x8B2200,
    skinColor: 0xc07840,
    outfitColor: 0xaa2200,
    accentColor: '#ff6622',
    locked: false,
    unlockDesc: 'STARTER',
    bio: "Rides lowrider with style. Always riding in, never riding out without respect.",
    stats: { speed: 4, defense: 3, luck: 5 },
  },
  {
    id: 'crissie',
    name: 'Crissie',
    nickname: '"Lil Luxe"',
    origin: 'Uptown Heights',
    chasedBy: 'JEALOUS RIVALS',
    portrait: 'assets/characters/crissie.png',
    carColor: 0x003366,
    skinColor: 0x5c3520,
    outfitColor: 0x0055aa,
    accentColor: '#ffcc00',
    locked: true,
    unlockType: 'score',
    unlockScore: 5000,
    unlockDesc: 'SCORE 5,000 PTS',
    bio: "Style, speed, savage comebacks. The block watches — she lets them.",
    stats: { speed: 4, defense: 3, luck: 4 },
  },
  {
    id: 'luis',
    name: 'Luis',
    nickname: '"Street King"',
    origin: 'South Side',
    chasedBy: 'RIVAL CREW',
    portrait: 'assets/characters/luis.png',
    carColor: 0x2a1a08,
    skinColor: 0x8B5E3C,
    outfitColor: 0x445533,
    accentColor: '#ff8800',
    locked: true,
    unlockType: 'shootout',
    unlockCount: 3,
    unlockDesc: 'SURVIVE 3 SHOOTOUTS',
    bio: "Custom lowrider, lightning reflexes. Slipping away is what he does best.",
    stats: { speed: 5, defense: 3, luck: 3 },
  },
  {
    id: 'mack',
    name: 'Mack',
    nickname: '"Mack-Attack"',
    origin: 'Uptown Dog Park District',
    chasedBy: 'ALLEY CATS',
    portrait: 'assets/characters/mack.png',
    carColor: 0xcc8800,
    skinColor: 0xcc8800,
    outfitColor: 0xcc6600,
    accentColor: '#ffaa00',
    locked: true,
    unlockType: 'distance',
    unlockKm: 10,
    unlockDesc: 'DRIVE 10KM TOTAL',
    bio: "Runs on paw power. Loyal heart, fearless energy, biting back when cornered.",
    stats: { speed: 5, defense: 2, luck: 5 },
  },
];

// ── Persistence helpers ───────────────────────────────────────────────────────

export function getUnlockedIds() {
  return JSON.parse(localStorage.getItem('bb_unlocked') || '["byron","maria"]');
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
