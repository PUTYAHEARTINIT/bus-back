// cinematic.js — Temple Run-style intro: character runs to car + gets in

import * as THREE from 'three';
import { scene, camera, renderer } from './engine.js';
import { renderFrame } from './engine.js';

// ── Build a low-poly humanoid runner ─────────────────────────────────────────

function buildRunner(skinHex, outfitHex) {
  const g = new THREE.Group();

  const skin   = new THREE.MeshLambertMaterial({ color: skinHex });
  const outfit = new THREE.MeshLambertMaterial({ color: outfitHex });
  const pants  = new THREE.MeshLambertMaterial({ color: 0x111122 });
  const shoe   = new THREE.MeshLambertMaterial({ color: 0x0d0d0d });

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.40, 0.36), skin);
  head.position.y = 1.72; head.castShadow = true;
  g.add(head);

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.50, 0.65, 0.26), outfit);
  torso.position.y = 1.08; torso.castShadow = true;
  g.add(torso);

  // Arms — pivoted at shoulder so rotation looks natural
  const makeArm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.35, 1.35, 0);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.52, 6), outfit);
    arm.position.y = -0.26;
    pivot.add(arm);
    g.add(pivot);
    return pivot;
  };
  const lArmPivot = makeArm(-1);
  const rArmPivot = makeArm( 1);

  // Legs — pivoted at hip
  const makeLeg = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.15, 0.76, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.09, 0.42, 6), pants);
    upper.position.y = -0.21;
    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.38, 6), pants);
    lower.position.y = -0.59;
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.10, 0.28), shoe);
    sh.position.set(0, -0.78, 0.05);
    pivot.add(upper, lower, sh);
    g.add(pivot);
    return pivot;
  };
  const lLegPivot = makeLeg(-1);
  const rLegPivot = makeLeg( 1);

  // Store pivots for animation
  g.userData = { lArmPivot, rArmPivot, lLegPivot, rLegPivot };

  return g;
}

// ── Cinematic text overlay ────────────────────────────────────────────────────

function buildCinematicUI(char) {
  const el = document.createElement('div');
  el.id = 'cinematic-ui';
  el.style.cssText = `
    position: fixed; inset: 0; pointer-events: none; z-index: 100;
    font-family: 'Courier New', monospace;
  `;

  // Vignette
  el.innerHTML += `
    <div style="position:absolute;inset:0;
      background:radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%);
      pointer-events:none;"></div>
  `;

  // Character name — center top
  el.innerHTML += `
    <div id="cin-name" style="
      position:absolute; top: 13%; left: 50%; transform: translateX(-50%);
      font-size: clamp(26px, 6.5vw, 50px); font-weight: 900; color: #fff;
      letter-spacing: 8px; text-shadow: 2px 2px 0 rgba(0,0,0,0.8), 0 0 30px rgba(255,255,255,0.2);
      opacity: 0; transition: opacity 0.55s ease; white-space: nowrap;
    ">${char.name.toUpperCase()}</div>
  `;

  // Nickname
  el.innerHTML += `
    <div id="cin-nick" style="
      position: absolute; top: 13%; left: 50%;
      transform: translate(-50%, clamp(44px, 9vw, 68px));
      font-size: clamp(13px, 2.8vw, 20px); font-weight: 700;
      color: ${char.accentColor}; letter-spacing: 5px;
      text-shadow: 0 0 16px ${char.accentColor}88;
      opacity: 0; transition: opacity 0.55s ease;
    ">${char.nickname}</div>
  `;

  // Origin
  el.innerHTML += `
    <div id="cin-origin" style="
      position: absolute; top: 13%; left: 50%;
      transform: translate(-50%, clamp(64px, 13vw, 102px));
      font-size: clamp(9px, 1.8vw, 13px); color: rgba(255,255,255,0.45);
      letter-spacing: 4px;
      opacity: 0; transition: opacity 0.4s ease;
    ">ORIGIN: ${char.origin.toUpperCase()}</div>
  `;

  // Chased by — bottom
  el.innerHTML += `
    <div id="cin-chased" style="
      position: absolute; bottom: 16%; left: 50%; transform: translateX(-50%);
      font-size: clamp(10px, 2.2vw, 15px); font-weight: 900;
      color: #ff3300; letter-spacing: 4px;
      text-shadow: 0 0 12px rgba(255,50,0,0.6);
      opacity: 0; transition: opacity 0.4s ease;
    ">CHASED BY: ${char.chasedBy}</div>
  `;

  // Progress bar
  el.innerHTML += `
    <div style="position:absolute;bottom:0;left:0;width:100%;height:3px;background:rgba(255,255,255,0.06);">
      <div id="cin-bar" style="height:100%;width:0%;background:${char.accentColor};
        box-shadow: 0 0 8px ${char.accentColor};
        transition: width 3.8s linear;"></div>
    </div>
  `;

  return el;
}

// ── Main export ───────────────────────────────────────────────────────────────

export function playIntro(character, onComplete) {
  const DURATION = 4.0; // seconds total

  // ── Cinematic camera (side-angle wide shot) ──
  const origPos = camera.position.clone();
  camera.position.set(-16, 4.2, 6);
  camera.lookAt(1, 0.8, -2);

  // ── Runner ──
  const runner = buildRunner(character.skinColor, character.outfitColor);
  runner.position.set(18, 0, -1.8);
  runner.rotation.y = -Math.PI / 2; // face toward -x (left, toward car)
  scene.add(runner);

  // ── UI overlay ──
  const ui = buildCinematicUI(character);
  document.body.appendChild(ui);

  // Stagger text fade-ins
  setTimeout(() => { const el = document.getElementById('cin-name'); if (el) el.style.opacity = '1'; }, 250);
  setTimeout(() => { const el = document.getElementById('cin-nick'); if (el) el.style.opacity = '1'; }, 450);
  setTimeout(() => { const el = document.getElementById('cin-origin'); if (el) el.style.opacity = '1'; }, 650);
  setTimeout(() => { const el = document.getElementById('cin-chased'); if (el) el.style.opacity = '1'; }, 1200);
  // Progress bar
  setTimeout(() => { const b = document.getElementById('cin-bar'); if (b) b.style.width = '100%'; }, 30);

  let t = 0;
  let lastTS = null;

  function loop(ts) {
    if (!lastTS) lastTS = ts;
    const dt = Math.min((ts - lastTS) / 1000, 0.05);
    lastTS = ts;
    t += dt;

    const prog = Math.min(t / DURATION, 1);
    const { lArmPivot, rArmPivot, lLegPivot, rLegPivot } = runner.userData;

    if (prog < 0.80) {
      // ── Running phase ──
      const p = prog / 0.80;
      const ease = 1 - Math.pow(1 - p, 2.2); // ease-in quad
      runner.position.x = 18 - ease * 20; // 18 → -2

      const freq = 9;
      const amp  = 0.75;
      const cyc  = Math.sin(t * freq);
      lArmPivot.rotation.x =  cyc * amp;
      rArmPivot.rotation.x = -cyc * amp;
      lLegPivot.rotation.x = -cyc * amp * 0.85;
      rLegPivot.rotation.x =  cyc * amp * 0.85;

      // Vertical run bob
      runner.position.y = Math.max(0, Math.abs(Math.sin(t * freq * 0.5)) * 0.14);

    } else if (prog < 0.92) {
      // ── Getting in — shrink into car ──
      const p = (prog - 0.80) / 0.12;
      const s = Math.max(1 - p, 0.001);
      runner.scale.setScalar(s);
      runner.position.x = -2;
      runner.position.y = 0.6 * (1 - p);

    } else {
      // ── Camera eases back to gameplay position ──
      const p = (prog - 0.92) / 0.08;
      camera.position.lerpVectors(
        new THREE.Vector3(-16, 4.2, 6),
        origPos,
        p
      );
      camera.lookAt(0, 1.2, -20);
    }

    renderFrame();

    if (prog < 1) {
      requestAnimationFrame(loop);
    } else {
      // ── Clean up ──
      scene.remove(runner);
      runner.traverse(obj => {
        if (obj.isMesh) { obj.geometry.dispose(); obj.material.dispose(); }
      });
      if (ui.parentNode) document.body.removeChild(ui);

      camera.position.copy(origPos);
      camera.lookAt(0, 1.2, -20);

      onComplete();
    }
  }

  requestAnimationFrame(loop);
}
