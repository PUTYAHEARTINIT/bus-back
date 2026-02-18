// audio.js — Web Audio API synthesized sounds (zero audio files needed)

let ctx = null;
let engineOsc = null;
let engineGain = null;
let sirenOsc = null;
let sirenGain = null;
let sirenActive = false;
let sirenSweepId = null;
let muted = false;

export function toggleMute() {
  muted = !muted;
  if (engineGain) engineGain.gain.value = muted ? 0 : 0.04;
  if (sirenGain)  sirenGain.gain.value  = muted ? 0 : 0.06;
  return muted;
}
export function isMuted() { return muted; }

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function resumeContext() {
  const ac = getCtx();
  if (ac.state === 'suspended') ac.resume();
}

export function startEngine() {
  const ac = getCtx();
  if (engineOsc) return;

  engineGain = ac.createGain();
  engineGain.gain.value = 0.04;
  engineGain.connect(ac.destination);

  // Waveshaper distortion for rumble
  const distortion = ac.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 256 - 1;
    curve[i] = (Math.PI + 200) * x / (Math.PI + 200 * Math.abs(x));
  }
  distortion.curve = curve;
  distortion.connect(engineGain);

  engineOsc = ac.createOscillator();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 55;
  engineOsc.connect(distortion);
  engineOsc.start();
}

export function setEngineSpeed(normalizedSpeed) {
  if (!engineOsc || !engineGain) return;
  const ac = getCtx();
  const freq = 55 + normalizedSpeed * 80;
  const vol  = 0.03 + normalizedSpeed * 0.04;
  engineOsc.frequency.setTargetAtTime(freq, ac.currentTime, 0.1);
  engineGain.gain.setTargetAtTime(vol,  ac.currentTime, 0.1);
}

export function stopEngine() {
  if (engineOsc)  { try { engineOsc.stop(); } catch(e) {} engineOsc = null; }
  if (engineGain) { engineGain.disconnect(); engineGain = null; }
}

export function playHit() {
  if (muted) return;
  const ac = getCtx();
  const duration = 0.15;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * duration), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  g.gain.value = 0.4;
  src.connect(g);
  g.connect(ac.destination);
  src.start();
}

export function playTargetHit() {
  if (muted) return;
  const ac = getCtx();
  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = 880;
  g.gain.setValueAtTime(0.3, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.3);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.3);
}

export function startSiren() {
  if (sirenActive) return;
  sirenActive = true;
  const ac = getCtx();

  sirenGain = ac.createGain();
  sirenGain.gain.value = 0.06;
  sirenGain.connect(ac.destination);

  sirenOsc = ac.createOscillator();
  sirenOsc.type = 'sawtooth';
  sirenOsc.connect(sirenGain);
  sirenOsc.start();

  function sweep(t) {
    if (!sirenActive || !sirenOsc) return;
    sirenOsc.frequency.setValueAtTime(440, t);
    sirenOsc.frequency.linearRampToValueAtTime(880, t + 0.5);
    sirenOsc.frequency.linearRampToValueAtTime(440, t + 1.0);
    sirenSweepId = setTimeout(() => sweep(ac.currentTime), 1000);
  }
  sweep(ac.currentTime);
}

export function stopSiren() {
  sirenActive = false;
  if (sirenSweepId) { clearTimeout(sirenSweepId); sirenSweepId = null; }
  if (sirenOsc)  { try { sirenOsc.stop(); } catch(e) {} sirenOsc = null; }
  if (sirenGain) { sirenGain.disconnect(); sirenGain = null; }
}

export function playJump() {
  if (muted) return;
  const ac = getCtx();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(440, ac.currentTime + 0.15);
  g.gain.setValueAtTime(0.18, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.25);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.25);
}

export function playLand() {
  if (muted) return;
  const ac = getCtx();
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.08), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = ac.createBufferSource();
  src.buffer = buf;
  const g = ac.createGain();
  g.gain.value = 0.22;
  src.connect(g);
  g.connect(ac.destination);
  src.start();
}

export function playGameOver() {
  if (muted) return;
  const ac = getCtx();
  [440, 370, 311, 220].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const t = ac.currentTime + i * 0.18;
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.35);
  });
}
