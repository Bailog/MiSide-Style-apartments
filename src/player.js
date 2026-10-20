import * as C from './config.js';

// First-person walking: Pointer Lock mouse look (with drag-to-look fallback),
// WASD / arrows by physical key position, so it works with any keyboard layout.

const KEYMAP = {
  KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b',
  KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r',
};

export class Player {
  constructor(camera, dom, collision, start) {
    this.camera = camera;
    this.dom = dom;
    this.collision = collision;
    this.pos = { x: start.x, z: start.z };
    this.yaw = start.yaw;
    this.pitch = start.pitch;
    this.vel = { x: 0, z: 0 };
    this.keys = new Set();
    this.locked = false;
    this.active = false;          // keyboard input allowed (after the user pressed start)
    this.sensitivity = 0.0022;
    this.stepPhase = 0;
    this.bob = 0;
    this.skipMouse = 0;
    camera.rotation.order = 'YXZ';

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
      this.skipMouse = 2;         // Firefox may report a large jump right after locking
      this.onLockChange?.(this.locked);
    });
    document.addEventListener('mousemove', (e) => {
      if (this.locked) {
        if (this.skipMouse > 0) { this.skipMouse--; return; }
        this.look(e.movementX, e.movementY);
      } else if (this.dragging) {
        this.look(e.clientX - this.dragging.x, e.clientY - this.dragging.y);
        this.dragging = { x: e.clientX, y: e.clientY };
      }
    });
    dom.addEventListener('mousedown', (e) => {
      if (!this.locked && this.active) this.dragging = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => { this.dragging = null; });
    window.addEventListener('keydown', (e) => {
      const k = KEYMAP[e.code];
      if (k && this.active) { this.keys.add(k); e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) this.keys.delete(k); });
    window.addEventListener('blur', () => this.keys.clear());
    this.apply();
  }

  lock() {
    const p = this.dom.requestPointerLock?.();
    if (p && p.catch) p.catch(() => {});
  }

  look(dx, dy) {
    // ignore absurd spikes (seen on some Firefox / Linux setups)
    if (Math.abs(dx) > 400 || Math.abs(dy) > 400) return;
    this.yaw -= dx * this.sensitivity;
    this.pitch -= dy * this.sensitivity;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
  }

  update(dt) {
    // integrate in small steps so slow frames neither slow the walk nor tunnel through walls
    dt = Math.min(dt, 0.1);
    const steps = Math.ceil(dt / 0.025);
    for (let i = 0; i < steps; i++) this.step(dt / steps);
    this.apply();
  }

  step(dt) {
    let f = 0, s = 0;
    if (this.keys.has('f')) f += 1;
    if (this.keys.has('b')) f -= 1;
    if (this.keys.has('r')) s += 1;
    if (this.keys.has('l')) s -= 1;
    const len = Math.hypot(f, s) || 1;
    f /= len; s /= len;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    // camera looks along -Z at yaw 0
    const tx = (-sin * f + cos * s) * C.WALK_SPEED;
    const tz = (-cos * f - sin * s) * C.WALK_SPEED;
    const k = 1 - Math.exp(-dt * ((f || s) ? 10 : 12));
    this.vel.x += (tx - this.vel.x) * k;
    this.vel.z += (tz - this.vel.z) * k;
    const before = { x: this.pos.x, z: this.pos.z };
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.collision.resolve(this.pos, C.PLAYER_RADIUS);
    const moved = Math.hypot(this.pos.x - before.x, this.pos.z - before.z);
    // gentle head bob tied to the distance walked
    this.stepPhase += moved * (Math.PI * 2 / 1.3);
    const speed = moved / Math.max(dt, 1e-4);
    const target = Math.min(1, speed / C.WALK_SPEED);
    this.bob += (target - this.bob) * (1 - Math.exp(-dt * 8));
  }

  apply() {
    const cam = this.camera;
    const bobY = Math.sin(this.stepPhase * 2) * 0.018 * this.bob;
    const bobX = Math.cos(this.stepPhase) * 0.012 * this.bob;
    cam.position.set(
      this.pos.x + Math.cos(this.yaw) * bobX,
      C.EYE_HEIGHT + bobY,
      this.pos.z - Math.sin(this.yaw) * bobX,
    );
    cam.rotation.set(this.pitch, this.yaw, 0);
  }
}
