import * as THREE from 'three';
import * as C from './config.js';
import { setMaxAnisotropy } from './textures.js';
import { createMaterials, shared } from './materials.js';
import { Builder } from './util/builder.js';
import { buildArchitecture } from './world/architecture.js';
import { buildKitchen } from './world/kitchen.js';
import { buildLiving } from './world/living.js';
import { buildHall } from './world/hall.js';
import { buildLighting } from './world/lighting.js';
import { buildEffects } from './world/effects.js';
import { Collision } from './collision.js';
import { Player } from './player.js';
import { PostFX } from './post.js';
import { initLang, setLang, getLang, t, applyTexts, renderDev } from './i18n.js';

const params = new URLSearchParams(location.search);
const QUALITY = ['low', 'medium', 'high'];
const PIXEL_RATIO_CAP = { low: 0.75, medium: 1, high: 1.5 };

function savedQuality() {
  try { return localStorage.getItem('miside.quality'); } catch { return null; }
}
function storeQuality(q) {
  try { localStorage.setItem('miside.quality', q); } catch { /* storage may be blocked */ }
}

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;     // the room is static: render shadow maps once
app.appendChild(renderer.domElement);
setMaxAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

const scene = new THREE.Scene();
scene.background = new THREE.Color('#0c0816');
const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 60);

// --- world ---------------------------------------------------------------
const M = createMaterials();
const B = new Builder(scene);
const colliders = [];
buildArchitecture(B, M);
const kitchenFx = buildKitchen(B, M, colliders);
const livingFx = buildLiving(B, M, colliders);
const hallFx = buildHall(B, M, colliders);
const lights = buildLighting(scene, B, M, { ...kitchenFx, ...livingFx, ...hallFx });
const effects = buildEffects(scene, lights);
B.finalize();

// walkable outline (doors are closed); the arch passage is walkable up to where it turns dark
const collision = new Collision();
const A = C.ARCH;
collision.addPolyline([
  [C.LIVING.x0, C.LIVING.z0], C.DIAGONAL.a, C.DIAGONAL.b, [C.HALL.x0, 0], [C.PILLAR.x1, 0],
  [A.x0, A.walkTo], [A.x1, A.walkTo], [A.x1, A.wallZ], [C.HALL.x1, A.wallZ],
  [C.HALL.x1, C.HALL.z1], [C.LIVING.x1, C.HALL.z1], [C.LIVING.x1, C.LIVING.z1], [C.LIVING.x0, C.LIVING.z1],
]);
collision.add({ type: 'box', x0: C.PILLAR.x0, z0: 0, x1: C.PILLAR.x1, z1: C.PILLAR.z1 });
const Wn = C.OPENINGS.window;
collision.add({ type: 'box', x0: -0.5, z0: Wn.z0, x1: 0.05, z1: Wn.z1 });   // window niche with the sill
colliders.forEach((c) => collision.add(c));

// --- player --------------------------------------------------------------
const view = params.get('view')?.split(',').map(Number);
const start = view && view.length >= 3
  ? { x: view[0], z: view[1], yaw: view[2], pitch: view[3] ?? 0 }
  : C.START;
const player = new Player(camera, renderer.domElement, collision, start);

// --- post-processing & quality -------------------------------------------
const post = new PostFX(renderer, scene, camera);
const chosenQuality = params.get('q') || savedQuality();
let quality = QUALITY.includes(chosenQuality) ? chosenQuality : 'high';
let autoQuality = !QUALITY.includes(chosenQuality);   // no explicit choice yet: adapt to the GPU

function applyQuality(q, { byUser = false } = {}) {
  quality = q;
  const shadows = q !== 'low';
  lights.minor.forEach((l) => { l.visible = q !== 'low'; });
  if (renderer.shadowMap.enabled !== shadows) {
    renderer.shadowMap.enabled = shadows;
    scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
  }
  renderer.shadowMap.needsUpdate = true;
  post.setQuality(q);
  resize();
  document.querySelectorAll('[data-quality]').forEach((b) => b.classList.toggle('on', b.dataset.quality === q));
  if (byUser) {
    autoQuality = false;
    storeQuality(q);
  }
}

const toast = document.getElementById('toast');
let toastTimer = 0;
function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

// While walking, measure the frame rate for a few seconds; if it is too low, step quality down.
const probe = { t: 0, frames: 0 };
function probeQuality(dt) {
  if (!autoQuality || !player.active || quality === 'low') return;
  probe.t += dt;
  if (probe.t < 1.5) return;                 // let shaders and caches settle first
  probe.frames++;
  if (probe.t < 5.5) return;
  const fps = probe.frames / (probe.t - 1.5);
  probe.t = 0; probe.frames = 0;
  if (fps < 28) {
    applyQuality(QUALITY[QUALITY.indexOf(quality) - 1]);
    showToast(t('qualityAuto', { q: t('qName')[quality] }));
  } else {
    autoQuality = false;
  }
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const pr = Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_CAP[quality]);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h);
  post.setSize(w, h, pr);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// --- UI --------------------------------------------------------------------
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('start');
const fpsEl = document.getElementById('fps');
const dev = document.getElementById('dev');
const devBody = document.getElementById('devBody');
let startState = 'loading';                 // loading -> enter -> continue
function updateTexts() {
  applyTexts();
  startBtn.textContent = t(startState);
  if (!dev.classList.contains('hidden')) renderDev(devBody);
}
initLang();
updateTexts();

function begin() {
  player.active = true;
  overlay.classList.add('hidden');
  fpsEl.classList.remove('hidden');
  player.lock();
}
startBtn.addEventListener('click', begin);
renderer.domElement.addEventListener('click', () => { if (player.active && !player.locked) player.lock(); });
player.onLockChange = (locked) => {
  if (!locked && player.active) {
    overlay.classList.remove('hidden');
    startState = 'continue';
    startBtn.textContent = t(startState);
  }
};
document.querySelectorAll('[data-quality]').forEach((b) => b.addEventListener('click', (e) => {
  e.stopPropagation();
  applyQuality(b.dataset.quality, { byUser: true });
}));
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => {
  setLang(b.dataset.lang);
  updateTexts();
}));

// "Development" window: how the project was put together
function openDev() {
  renderDev(devBody);
  dev.classList.remove('hidden');
  devBody.scrollTop = 0;
}
function closeDev() { dev.classList.add('hidden'); }
document.getElementById('devOpen').addEventListener('click', openDev);
document.getElementById('devClose').addEventListener('click', closeDev);
dev.addEventListener('click', (e) => { if (e.target === dev) closeDev(); });

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && !dev.classList.contains('hidden')) closeDev();
  if (e.code === 'KeyG') {
    applyQuality(QUALITY[(QUALITY.indexOf(quality) + 1) % QUALITY.length], { byUser: true });
    showToast(t('qualityToast', { q: t('qName')[quality] }));
  }
  if (e.code === 'KeyP') console.log(`view=${player.pos.x.toFixed(2)},${player.pos.z.toFixed(2)},${player.yaw.toFixed(2)},${player.pitch.toFixed(2)}`);
});

// fps counter
let frames = 0, fpsT = 0;

// --- loop ------------------------------------------------------------------
applyQuality(quality);
const clock = new THREE.Clock();
let elapsed = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  elapsed += dt;
  shared.time.value = elapsed;
  player.update(dt);
  effects.update(elapsed);
  post.render(elapsed);
  probeQuality(dt);
  frames++; fpsT += dt;
  if (fpsT > 0.5) { fpsEl.textContent = `${Math.round(frames / fpsT)} fps`; frames = 0; fpsT = 0; }
}

// compile shaders up front (in parallel where the browser supports it), then allow entering
renderer.compileAsync(scene, camera).catch(() => {}).then(() => {
  startBtn.disabled = false;
  if (startState === 'loading') startState = 'enter';
  startBtn.textContent = t(startState);
});

if (params.has('still')) {
  // for automated screenshots: render a few frames and signal readiness
  overlay.classList.add('hidden');
  let n = 0;
  const tick = () => { frame(); if (++n < 4) requestAnimationFrame(tick); else window.__ready = true; };
  requestAnimationFrame(tick);
} else {
  renderer.setAnimationLoop(frame);
}
window.__app = { scene, camera, renderer, player, applyQuality, openDev, getLang };
