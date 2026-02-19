// cinematic.js — Temple Run-style intro: character sprite runs to car + gets in

import * as THREE from 'three';
import { scene, camera, renderFrame } from './engine.js';

// ── Build a sprite billboard from the character's portrait image ──────────────
// The illustration art IS the character — no box model, no mismatched colors.
// A TextureLoader loads the PNG, applied to a plane that always faces the camera.

function buildSpriteRunner(portraitSrc) {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(portraitSrc, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;

      // Portrait images are roughly 3:4 ratio
      const aspect = tex.image ? tex.image.width / tex.image.height : 0.75;
      const height = 2.2;
      const width  = height * aspect;

      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        alphaTest: 0.05,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
      mesh.position.y = height / 2; // sit on ground

      // The sprite always faces the camera — done manually each frame
      mesh.userData.isSprite = true;

      resolve(mesh);
    }, undefined, () => {
      // Fallback if image fails to load: simple colored box
      const mat = new THREE.MeshLambertMaterial({ color: 0xcc1111 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.9, 0.25), mat);
      mesh.position.y = 0.95;
      resolve(mesh);
    });
  });
}

// ── Cinematic text overlay ────────────────────────────────────────────────────

function buildCinematicUI(char) {
  const el = document.createElement('div');
  el.id = 'cinematic-ui';
  el.style.cssText = `
    position: fixed; inset: 0; pointer-events: none; z-index: 100;
    font-family: 'Courier New', monospace;
  `;

  el.innerHTML = `
    <div style="position:absolute;inset:0;
      background:radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.65) 100%);"></div>

    <div id="cin-name" style="
      position:absolute; top:12%; left:50%; transform:translateX(-50%);
      font-size:clamp(24px,6vw,48px); font-weight:900; color:#fff;
      letter-spacing:8px; white-space:nowrap;
      text-shadow:2px 2px 0 rgba(0,0,0,0.9), 0 0 30px rgba(255,255,255,0.15);
      opacity:0; transition:opacity 0.55s ease;
    ">${char.name.toUpperCase()}</div>

    <div id="cin-nick" style="
      position:absolute; top:12%; left:50%;
      transform:translate(-50%, clamp(42px,9vw,66px));
      font-size:clamp(12px,2.6vw,19px); font-weight:700;
      color:${char.accentColor}; letter-spacing:5px;
      text-shadow:0 0 16px ${char.accentColor}99;
      opacity:0; transition:opacity 0.5s ease;
    ">${char.nickname}</div>

    <div id="cin-origin" style="
      position:absolute; top:12%; left:50%;
      transform:translate(-50%, clamp(64px,13vw,98px));
      font-size:clamp(8px,1.7vw,12px); color:rgba(255,255,255,0.4);
      letter-spacing:4px;
      opacity:0; transition:opacity 0.4s ease;
    ">ORIGIN: ${char.origin.toUpperCase()}</div>

    <div id="cin-chased" style="
      position:absolute; bottom:15%; left:50%; transform:translateX(-50%);
      font-size:clamp(10px,2.1vw,15px); font-weight:900;
      color:#ff3300; letter-spacing:4px;
      text-shadow:0 0 12px rgba(255,50,0,0.7);
      opacity:0; transition:opacity 0.4s ease;
    ">CHASED BY: ${char.chasedBy}</div>

    <div style="position:absolute;bottom:0;left:0;width:100%;height:3px;background:rgba(255,255,255,0.05);">
      <div id="cin-bar" style="height:100%;width:0%;background:${char.accentColor};
        box-shadow:0 0 8px ${char.accentColor};transition:width 4.0s linear;"></div>
    </div>
  `;
  return el;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function playIntro(character, onComplete) {
  const DURATION = 4.2;

  // Store original camera
  const origPos = camera.position.clone();

  // Cinematic wide-angle side shot
  camera.position.set(-16, 4.0, 6);
  camera.lookAt(1, 1.0, -1);

  // Load sprite from the character's actual illustration
  const runner = await buildSpriteRunner(character.portrait);
  runner.position.set(18, 0, -1.5);
  scene.add(runner);

  // UI overlay
  const ui = buildCinematicUI(character);
  document.body.appendChild(ui);

  // Stagger text fades
  setTimeout(() => { const e = document.getElementById('cin-name');   if (e) e.style.opacity = '1'; }, 200);
  setTimeout(() => { const e = document.getElementById('cin-nick');   if (e) e.style.opacity = '1'; }, 380);
  setTimeout(() => { const e = document.getElementById('cin-origin'); if (e) e.style.opacity = '1'; }, 560);
  setTimeout(() => { const e = document.getElementById('cin-chased'); if (e) e.style.opacity = '1'; }, 1100);
  setTimeout(() => { const b = document.getElementById('cin-bar');    if (b) b.style.width   = '100%'; }, 30);

  let t = 0;
  let lastTS = null;

  function loop(ts) {
    if (!lastTS) lastTS = ts;
    const dt  = Math.min((ts - lastTS) / 1000, 0.05);
    lastTS = ts;
    t += dt;

    const prog = Math.min(t / DURATION, 1);

    // Always face camera (billboard behavior)
    if (runner.userData.isSprite) {
      runner.lookAt(camera.position);
    }

    if (prog < 0.80) {
      // ── Running phase: sprite slides toward car ──
      const p    = prog / 0.80;
      const ease = 1 - Math.pow(1 - p, 2.2);
      runner.position.x = 18 - ease * 20; // 18 → -2

      // Bob vertically (simulate running rhythm)
      runner.position.y = Math.abs(Math.sin(t * 9 * 0.5)) * 0.18;

      // Slight left-right sway (running energy)
      runner.rotation.z = Math.sin(t * 9) * 0.04;

    } else if (prog < 0.93) {
      // ── Getting in: shrink sprite into car ──
      const p = (prog - 0.80) / 0.13;
      const s = Math.max(1 - p, 0.001);
      runner.scale.setScalar(s);
      runner.position.x = -2;
      runner.position.y = 0.9 * (1 - p);

    } else {
      // ── Camera eases back to gameplay position ──
      const p = (prog - 0.93) / 0.07;
      camera.position.lerpVectors(
        new THREE.Vector3(-16, 4.0, 6),
        origPos,
        p
      );
      camera.lookAt(0, 1.2, -20);
    }

    renderFrame();

    if (prog < 1) {
      requestAnimationFrame(loop);
    } else {
      scene.remove(runner);
      runner.geometry?.dispose();
      runner.material?.dispose();
      if (ui.parentNode) document.body.removeChild(ui);
      camera.position.copy(origPos);
      camera.lookAt(0, 1.2, -20);
      onComplete();
    }
  }

  requestAnimationFrame(loop);
}
