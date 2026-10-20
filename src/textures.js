import * as THREE from 'three';

// Procedural canvas textures. Everything is generated at start-up with a seeded
// random generator, so the room looks identical on every visit.

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let maxAniso = 4;
export function setMaxAnisotropy(v) { maxAniso = v; }

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

// tile: how many meters one texture repeat covers (UVs are in meters), or null for 0..1 UVs.
function toTexture(c, { tile = null, srgb = true, aniso = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (tile) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const [tx, ty] = Array.isArray(tile) ? tile : [tile, tile];
    t.repeat.set(1 / tx, 1 / ty);
  }
  if (aniso) t.anisotropy = maxAniso;
  return t;
}

const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

// Soft blotchy plaster, like the decorative plaster on the real walls.
export function plaster(base = '#efd9cf', seed = 1, tile = 1.6) {
  const [c, g] = canvas(512, 512);
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) {
    const x = r() * 512, y = r() * 512, rad = 6 + r() * 40;
    const light = r() > 0.5;
    g.fillStyle = light ? 'rgba(255,255,255,0.018)' : 'rgba(90,40,60,0.014)';
    for (const dx of [-512, 0, 512]) for (const dy of [-512, 0, 512]) {
      g.beginPath(); g.arc(x + dx, y + dy, rad, 0, Math.PI * 2); g.fill();
    }
  }
  return toTexture(c, { tile });
}

// Star wallpaper data: R = glow, G = twinkle phase, B = twinkle speed.
// Stars are drawn with wrap-around so the texture tiles seamlessly.
export function starField(seed = 7, size = 1024, tile = 2.4) {
  const r = rng(seed);
  const R = new Float32Array(size * size);
  const GB = new Uint8Array(size * size * 2);
  const pxPerM = size / tile;
  const stars = [];
  const counts = [[150, 'dot'], [36, 'spark'], [9, 'big']];
  for (const [n, kind] of counts) {
    for (let i = 0; i < n; i++) {
      stars.push({ kind, x: r() * size, y: r() * size, phase: r(), speed: r(), b: 0.55 + r() * 0.45 });
    }
  }
  for (const s of stars) {
    // radius in meters -> px
    const rad = (s.kind === 'dot' ? 0.006 + r() * 0.006 : s.kind === 'spark' ? 0.03 + r() * 0.02 : 0.055 + r() * 0.03) * pxPerM;
    const ext = Math.ceil(rad * (s.kind === 'dot' ? 3 : 1.2));
    for (let oy = -ext; oy <= ext; oy++) {
      for (let ox = -ext; ox <= ext; ox++) {
        const px = Math.floor(s.x + ox), py = Math.floor(s.y + oy);
        const dx = px + 0.5 - s.x, dy = py + 0.5 - s.y;
        let v;
        if (s.kind === 'dot') {
          v = Math.exp(-(dx * dx + dy * dy) / (rad * rad));
        } else {
          // four-pointed sparkle: thin arms plus a round core
          const ax = Math.abs(dx) / rad, ay = Math.abs(dy) / rad;
          const arms = Math.max(Math.exp(-ay * 14) * Math.max(0, 1 - ax), Math.exp(-ax * 14) * Math.max(0, 1 - ay));
          const core = Math.exp(-(dx * dx + dy * dy) / (rad * rad * 0.02));
          v = Math.max(arms, core);
        }
        v *= s.b;
        if (v < 0.01) continue;
        const ix = ((px % size) + size) % size, iy = ((py % size) + size) % size;
        const k = iy * size + ix;
        if (v > R[k]) {
          R[k] = v;
          GB[k * 2] = Math.floor(s.phase * 255);
          GB[k * 2 + 1] = Math.floor(s.speed * 255);
        }
      }
    }
  }
  const data = new Uint8Array(size * size * 4);
  for (let k = 0; k < size * size; k++) {
    data[k * 4] = Math.min(255, Math.round(R[k] * 255));
    data[k * 4 + 1] = GB[k * 2];
    data[k * 4 + 2] = GB[k * 2 + 1];
    data[k * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tile, 1 / tile);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = maxAniso;
  t.needsUpdate = true;
  return t;
}

// Warm laminate floor: staggered planks with simple grain.
export function laminate(seed = 3) {
  const S = 1024, tile = 2.4, ppm = S / tile;
  const [c, g] = canvas(S, S);
  const r = rng(seed);
  const pw = Math.round(0.192 * ppm), pl = Math.round(1.2 * ppm);
  const rows = Math.ceil(S / pw);
  for (let row = 0; row < rows; row++) {
    const y = row * pw;
    const off = Math.floor(r() * pl);
    for (let x = -off; x < S; x += pl) {
      const hue = 24 + r() * 8, sat = 55 + r() * 15, lig = 52 + r() * 12;
      g.fillStyle = hsl(hue, sat, lig);
      g.fillRect(x, y, pl, pw);
      // grain
      for (let k = 0; k < 9; k++) {
        const gy = y + r() * pw, amp = 1 + r() * 3, freq = 0.01 + r() * 0.02, ph = r() * 6;
        g.strokeStyle = hsl(hue - 4, sat + 5, lig - 10 - r() * 8, 0.35);
        g.lineWidth = 1 + r() * 1.5;
        g.beginPath();
        for (let xx = 0; xx <= pl; xx += 8) {
          const yy = gy + Math.sin(xx * freq + ph) * amp;
          xx === 0 ? g.moveTo(x + xx, yy) : g.lineTo(x + xx, yy);
        }
        g.stroke();
      }
      // knot-like spots
      if (r() > 0.6) {
        g.fillStyle = hsl(hue - 6, sat, lig - 18, 0.35);
        g.beginPath(); g.ellipse(x + r() * pl, y + pw / 2, 10 + r() * 14, 3 + r() * 3, 0, 0, 7); g.fill();
      }
      // seams + bevel highlight
      g.fillStyle = 'rgba(60,25,10,0.55)';
      g.fillRect(x, y, 3, pw);
      g.fillStyle = 'rgba(255,230,200,0.18)';
      g.fillRect(x + 3, y + 2, pl - 3, 2);
    }
    g.fillStyle = 'rgba(60,25,10,0.6)';
    g.fillRect(0, y, S, 2);
  }
  return toTexture(c, { tile });
}

// Generic wood grain for furniture surfaces.
export function woodGrain(base = [20, 55, 30], seed = 5, tile = 1.0, contrast = 1) {
  const [c, g] = canvas(512, 512);
  const r = rng(seed);
  const [h, s, l] = base;
  g.fillStyle = hsl(h, s, l);
  g.fillRect(0, 0, 512, 512);
  for (let k = 0; k < 70; k++) {
    const y0 = r() * 512, amp = 2 + r() * 6, waves = 1 + Math.floor(r() * 3), ph = r() * 6;
    g.strokeStyle = hsl(h, s, l - (4 + r() * 8) * contrast, 0.5);
    g.lineWidth = 1 + r() * 2.5;
    for (const dy of [-512, 0, 512]) {
      g.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const y = y0 + dy + Math.sin((x / 512) * Math.PI * 2 * waves + ph) * amp;
        x === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
  }
  return toTexture(c, { tile });
}

// Cabinet / drawer front with a raised panel (0..1 UVs).
export function cabinetFront({ base = [14, 55, 26], w = 256, h = 384, arch = false, glass = false, knob = 'right' } = {}) {
  const [c, g] = canvas(w, h);
  const [hh, s, l] = base;
  g.fillStyle = hsl(hh, s, l); g.fillRect(0, 0, w, h);
  const m = Math.round(w * 0.12);
  // frame bevel
  g.fillStyle = hsl(hh, s, l + 8); g.fillRect(0, 0, w, 4); g.fillRect(0, 0, 4, h);
  g.fillStyle = hsl(hh, s, l - 10); g.fillRect(0, h - 4, w, 4); g.fillRect(w - 4, 0, 4, h);
  const px0 = m, py0 = m, px1 = w - m, py1 = h - m;
  const panel = () => {
    g.beginPath();
    if (arch) {
      g.moveTo(px0, py1); g.lineTo(px0, py0 + m);
      g.quadraticCurveTo((px0 + px1) / 2, py0 - m * 0.6, px1, py0 + m);
      g.lineTo(px1, py1); g.closePath();
    } else g.rect(px0, py0, px1 - px0, py1 - py0);
  };
  g.save();
  g.lineWidth = 6; g.strokeStyle = hsl(hh, s, l - 12); panel(); g.stroke();
  g.lineWidth = 2; g.strokeStyle = hsl(hh, s, l + 12); g.translate(3, 3); panel(); g.stroke();
  g.restore();
  if (glass) {
    g.fillStyle = 'rgba(25,20,35,0.9)'; panel(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.beginPath(); g.moveTo(px0 + 10, py1 - 10); g.lineTo(px0 + 40, py0 + 20); g.lineTo(px0 + 60, py0 + 20); g.lineTo(px0 + 30, py1 - 10); g.fill();
  } else {
    const grd = g.createLinearGradient(px0, py0, px1, py1);
    grd.addColorStop(0, hsl(hh, s, l + 5)); grd.addColorStop(1, hsl(hh, s, l - 4));
    g.fillStyle = grd; panel(); g.fill();
  }
  if (knob) {
    const kx = knob === 'right' ? w - m * 0.55 : knob === 'left' ? m * 0.55 : w / 2;
    const ky = knob === 'top' ? m * 0.55 : h / 2;
    g.fillStyle = '#c9a25a'; g.beginPath(); g.arc(kx, ky, Math.max(5, w * 0.03), 0, 7); g.fill();
    g.fillStyle = '#fff2c8'; g.beginPath(); g.arc(kx - 2, ky - 2, Math.max(2, w * 0.01), 0, 7); g.fill();
  }
  return toTexture(c);
}

// Small mosaic tiles of the kitchen backsplash.
export function mosaic(seed = 11) {
  const S = 512, tile = 0.6, n = 30, cell = S / n;
  const [c, g] = canvas(S, S);
  const r = rng(seed);
  g.fillStyle = '#d8d6c8'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const k = r();
    let col;
    if (k < 0.07) col = '#1d1d22';
    else if (k < 0.45) col = hsl(85 + r() * 40, 18 + r() * 15, 62 + r() * 15);
    else if (k < 0.75) col = hsl(40 + r() * 15, 20, 75 + r() * 12);
    else col = hsl(150 + r() * 30, 12, 55 + r() * 15);
    g.fillStyle = col;
    g.fillRect(i * cell + 1.5, j * cell + 1.5, cell - 3, cell - 3);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.fillRect(i * cell + 2, j * cell + 2, cell - 6, 2);
  }
  return toTexture(c, { tile });
}

export function speckle(base = '#e4dccf', dots = ['#b9ab98', '#8d8073', '#f6f1e8'], seed = 13, tile = 0.8) {
  const [c, g] = canvas(256, 256);
  const r = rng(seed);
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = dots[Math.floor(r() * dots.length)];
    g.globalAlpha = 0.25 + r() * 0.5;
    g.fillRect(r() * 256, r() * 256, 1 + r() * 2.5, 1 + r() * 2.5);
  }
  g.globalAlpha = 1;
  return toTexture(c, { tile });
}

export function velvet(base = [172, 38, 30], seed = 17, tile = 0.5) {
  const [c, g] = canvas(256, 256);
  const r = rng(seed);
  const [h, s, l] = base;
  g.fillStyle = hsl(h, s, l); g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = hsl(h, s, l + (r() - 0.5) * 10, 0.5);
    g.fillRect(r() * 256, r() * 256, 2, 2 + r() * 6);
  }
  return toTexture(c, { tile });
}

// Grey/white zig-zag cushion cover (0..1 UVs).
export function chevron() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#f1ece6'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#8f8d95'; g.lineWidth = 9; g.lineJoin = 'miter';
  for (let y = -32; y < 300; y += 36) {
    g.beginPath();
    for (let x = 0, k = 0; x <= 256; x += 21.33, k++) g.lineTo(x, y + (k % 2 ? 14 : 0));
    g.stroke();
  }
  return toTexture(c);
}

// Colourful cushions (on the sofa and the office chair).
export function patchwork(seed = 19, palette = ['#f2c14e', '#e15a4f', '#3aa5a0', '#f7f0e4', '#6b4fa0', '#ef8fb3']) {
  const [c, g] = canvas(256, 256);
  const r = rng(seed);
  g.fillStyle = palette[3]; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = palette[Math.floor(r() * palette.length)];
    g.beginPath();
    g.ellipse(r() * 256, r() * 256, 18 + r() * 50, 12 + r() * 30, r() * 3, 0, 7);
    g.fill();
  }
  return toTexture(c);
}

// White table cloth with pink roses (photo 4).
export function roses(seed = 23) {
  const [c, g] = canvas(512, 512);
  const r = rng(seed);
  g.fillStyle = '#f3eee8'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9; i++) {
    const x = r() * 512, y = r() * 512, R = 30 + r() * 40;
    g.fillStyle = hsl(140, 20, 60, 0.6);
    for (let k = 0; k < 4; k++) {
      g.beginPath(); g.ellipse(x + Math.cos(k * 1.7) * R * 1.1, y + Math.sin(k * 1.7) * R * 1.1, R * 0.5, R * 0.22, k * 1.7, 0, 7); g.fill();
    }
    for (let k = 6; k > 0; k--) {
      g.strokeStyle = hsl(5 + r() * 15, 60, 50 + k * 5);
      g.lineWidth = 6;
      g.beginPath(); g.arc(x, y, (R * k) / 6, r() * 6, r() * 6 + 4.5); g.stroke();
    }
  }
  return toTexture(c);
}

// The big colourful desk mat (0..1 UVs).
export function deskMat(seed = 29) {
  const [c, g] = canvas(1024, 400);
  const r = rng(seed);
  const grd = g.createLinearGradient(0, 0, 1024, 400);
  grd.addColorStop(0, '#1a1030'); grd.addColorStop(0.5, '#2a0f3a'); grd.addColorStop(1, '#0d2a26');
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 400);
  const cols = ['#ff3d7f', '#ffd23d', '#3dffb5', '#3db8ff', '#ff7a2f', '#b13dff'];
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = cols[Math.floor(r() * cols.length)];
    g.lineWidth = 3 + r() * 14;
    g.globalAlpha = 0.55 + r() * 0.4;
    g.beginPath();
    let x = r() * 1024, y = r() * 400;
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (r() - 0.5) * 300; y += (r() - 0.5) * 200;
      g.quadraticCurveTo(x + (r() - 0.5) * 150, y + (r() - 0.5) * 150, x, y);
    }
    g.stroke();
  }
  g.globalAlpha = 1;
  g.strokeStyle = '#111'; g.lineWidth = 10; g.strokeRect(0, 0, 1024, 400);
  return toTexture(c);
}

// Keyboard top with rainbow backlight; used as map + emissiveMap.
export function keyboard() {
  const [c, g] = canvas(512, 168);
  g.fillStyle = '#121216'; g.fillRect(0, 0, 512, 168);
  const rows = 6, cols = 18;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = 8 + i * 27.6, y = 8 + j * 26.5;
    const hue = (i / cols) * 300 + j * 8;
    g.fillStyle = hsl(hue, 100, 60);
    g.fillRect(x, y, 24, 23);
    g.fillStyle = '#26262c';
    g.fillRect(x + 2, y + 2, 20, 18);
    g.fillStyle = hsl(hue, 100, 75, 0.9);
    g.fillRect(x + 8, y + 7, 7, 3);
  }
  return toTexture(c);
}

// Monitor wallpaper: a cozy anime-style night scene.
export function monitorScreen() {
  const [c, g] = canvas(1024, 576);
  const grd = g.createLinearGradient(0, 0, 0, 576);
  grd.addColorStop(0, '#2b1d6b'); grd.addColorStop(0.6, '#8a4fb8'); grd.addColorStop(1, '#f59ac2');
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 576);
  const r = rng(31);
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(255,255,240,${0.3 + r() * 0.7})`;
    const s = r() * 2.5 + 0.5;
    g.fillRect(r() * 1024, r() * 330, s, s);
  }
  // crescent moon
  g.fillStyle = '#fff4c2';
  g.beginPath(); g.arc(760, 140, 70, 0, 7); g.fill();
  g.fillStyle = '#3a2580';
  g.beginPath(); g.arc(790, 118, 64, 0, 7); g.fill();
  // hills + town
  g.fillStyle = '#2c1650';
  g.beginPath(); g.moveTo(0, 470);
  for (let x = 0; x <= 1024; x += 32) g.lineTo(x, 430 + Math.sin(x * 0.01) * 30);
  g.lineTo(1024, 576); g.lineTo(0, 576); g.fill();
  for (let i = 0; i < 26; i++) {
    const x = 40 + i * 38, h = 40 + r() * 80;
    g.fillStyle = '#21103d'; g.fillRect(x, 470 - h, 30, h + 110);
    for (let k = 0; k < 5; k++) if (r() > 0.5) {
      g.fillStyle = '#ffd27a'; g.fillRect(x + 6 + (k % 2) * 12, 480 - h + k * 14, 6, 6);
    }
  }
  // taskbar + a window
  g.fillStyle = 'rgba(20,10,40,0.85)'; g.fillRect(0, 548, 1024, 28);
  for (let i = 0; i < 6; i++) { g.fillStyle = ['#ff7eb6', '#7ee0ff', '#ffd27a', '#b48cff', '#7effa8', '#ffffff'][i]; g.fillRect(14 + i * 34, 554, 18, 16); }
  g.fillStyle = 'rgba(255,255,255,0.88)'; g.fillRect(80, 90, 330, 230);
  g.fillStyle = '#ff7eb6'; g.fillRect(80, 90, 330, 22);
  g.fillStyle = '#c8b6e6'; for (let i = 0; i < 6; i++) g.fillRect(100, 130 + i * 28, 140 + (i * 53) % 150, 12);
  return toTexture(c);
}

// Interior door with a 3x6 grid of dark sparkling glass and an arched top (0..1 UVs).
export function doorFront(seed = 37) {
  const W = 256, H = 680;
  const [c, g] = canvas(W, H);
  const r = rng(seed);
  const wood = g.createLinearGradient(0, 0, W, 0);
  wood.addColorStop(0, '#9a5a2c'); wood.addColorStop(0.5, '#b26d38'); wood.addColorStop(1, '#965428');
  g.fillStyle = wood; g.fillRect(0, 0, W, H);
  for (let k = 0; k < 40; k++) {
    g.strokeStyle = `rgba(110,45,10,${0.15 + r() * 0.2})`; g.lineWidth = 1 + r() * 2;
    const x = r() * W;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, H * 0.3, x - 8, H * 0.6, x + 4, H); g.stroke();
  }
  const gx0 = 38, gx1 = W - 38, gy0 = 70, gy1 = 480;
  // glass with an arched top
  g.beginPath();
  g.moveTo(gx0, gy1); g.lineTo(gx0, gy0 + 20);
  g.quadraticCurveTo(W / 2, gy0 - 30, gx1, gy0 + 20);
  g.lineTo(gx1, gy1); g.closePath();
  g.save(); g.clip();
  g.fillStyle = '#0d1410'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 700; i++) {
    g.fillStyle = r() > 0.5 ? `rgba(160,190,120,${r() * 0.5})` : `rgba(230,220,170,${r() * 0.6})`;
    g.fillRect(gx0 + r() * (gx1 - gx0), gy0 - 30 + r() * (gy1 - gy0 + 30), 1.5 + r() * 2, 1.5 + r() * 2);
  }
  g.restore();
  // muntins
  g.strokeStyle = '#a8673a'; g.lineWidth = 6;
  for (let i = 1; i < 3; i++) { const x = gx0 + ((gx1 - gx0) * i) / 3; g.beginPath(); g.moveTo(x, gy0 - 8); g.lineTo(x, gy1); g.stroke(); }
  for (let j = 1; j < 6; j++) { const y = gy0 + ((gy1 - gy0) * j) / 6; g.beginPath(); g.moveTo(gx0, y); g.lineTo(gx1, y); g.stroke(); }
  g.lineWidth = 8; g.strokeStyle = '#80461f';
  g.beginPath(); g.moveTo(gx0, gy1); g.lineTo(gx0, gy0 + 20); g.quadraticCurveTo(W / 2, gy0 - 30, gx1, gy0 + 20); g.lineTo(gx1, gy1); g.closePath(); g.stroke();
  // lower raised panel
  g.lineWidth = 5; g.strokeStyle = '#8e4517'; g.strokeRect(40, 530, W - 80, 110);
  g.lineWidth = 2; g.strokeStyle = '#d9894a'; g.strokeRect(44, 534, W - 88, 102);
  return toTexture(c);
}

// The tall stained-glass panel next to the door (0..1 UVs).
export function glassPanel(seed = 41) {
  const [c, g] = canvas(128, 384);
  const r = rng(seed);
  g.fillStyle = '#f2ece6'; g.fillRect(0, 0, 128, 384);
  g.fillStyle = '#0c120f'; g.fillRect(12, 12, 104, 360);
  for (let i = 0; i < 500; i++) {
    g.fillStyle = r() > 0.5 ? `rgba(150,190,120,${r() * 0.55})` : `rgba(235,225,175,${r() * 0.6})`;
    g.fillRect(12 + r() * 104, 12 + r() * 360, 1 + r() * 2, 1 + r() * 2);
  }
  return toTexture(c);
}

// Front of the PC case: tempered glass with three RGB fans (0..1 UVs, also emissive).
export function pcFront() {
  const [c, g] = canvas(256, 512);
  g.fillStyle = '#0c0d14'; g.fillRect(0, 0, 256, 512);
  const fans = [[118, 110, '#ff3df0'], [118, 255, '#3dc5ff'], [118, 400, '#a03dff']];
  for (const [x, y, col] of fans) {
    g.strokeStyle = col; g.lineWidth = 10;
    g.beginPath(); g.arc(x, y, 58, 0, 7); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 3;
    for (let k = 0; k < 7; k++) { const a = (k / 7) * 6.28; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 0.6) * 30, y + Math.sin(a + 0.6) * 30, x + Math.cos(a) * 50, y + Math.sin(a) * 50); g.stroke(); }
  }
  g.fillStyle = '#3dc5ff'; g.fillRect(232, 0, 14, 512);   // vertical LED strip
  return toTexture(c);
}

export function fridgeFront(seed = 43) {
  const [c, g] = canvas(256, 640);
  const r = rng(seed);
  g.fillStyle = '#f1ece0'; g.fillRect(0, 0, 256, 640);
  g.fillStyle = '#d9d2c2'; g.fillRect(0, 196, 256, 6);
  const cols = ['#e05a4f', '#4fa3e0', '#f2c14e', '#7fc77a', '#b07ad9', '#ffffff'];
  for (let i = 0; i < 14; i++) {
    g.fillStyle = cols[Math.floor(r() * cols.length)];
    const x = 40 + r() * 150, y = 220 + r() * 150;
    g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 0.4);
    g.fillRect(-10, -12, 18 + r() * 14, 20 + r() * 12);
    g.restore();
  }
  g.fillStyle = '#b6ad9b'; g.fillRect(226, 230, 10, 120); g.fillRect(226, 60, 10, 90);
  return toTexture(c);
}

export function hobTop() {
  const [c, g] = canvas(256, 192);
  g.fillStyle = '#0b0b0e'; g.fillRect(0, 0, 256, 192);
  g.strokeStyle = 'rgba(200,200,220,0.35)'; g.lineWidth = 3;
  for (const [x, y, R] of [[64, 52, 34], [190, 52, 26], [64, 140, 26], [190, 140, 36]]) {
    g.beginPath(); g.arc(x, y, R, 0, 7); g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(0, 0, 256, 60);
  return toTexture(c);
}

export function ovenFront() {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#16161a'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#9a9aa2'; g.fillRect(0, 0, 256, 44);
  g.fillStyle = '#0a0a0c'; g.fillRect(96, 12, 64, 20);
  g.fillStyle = '#39ff6a'; g.fillRect(104, 16, 30, 12);
  g.fillStyle = '#2a2a33'; g.fillRect(24, 64, 208, 170);
  g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(24, 64, 208, 20);
  g.fillStyle = '#b5b5bd'; g.fillRect(40, 52, 176, 6);
  return toTexture(c);
}

// Night sky behind the window.
export function nightSky(seed = 47) {
  const [c, g] = canvas(1024, 512);
  const r = rng(seed);
  const grd = g.createLinearGradient(0, 0, 0, 512);
  grd.addColorStop(0, '#0a0d33'); grd.addColorStop(0.55, '#24206a'); grd.addColorStop(1, '#5a3f8f');
  g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(255,255,255,${r() * 0.9})`;
    const s = r() * 2 + 0.6; g.fillRect(r() * 1024, r() * 360, s, s);
  }
  g.fillStyle = '#fff7d6';
  g.beginPath(); g.arc(420, 120, 46, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,247,214,0.18)';
  g.beginPath(); g.arc(420, 120, 80, 0, 7); g.fill();
  // distant houses
  for (let i = 0; i < 18; i++) {
    const x = i * 60 + r() * 20, h = 60 + r() * 120;
    g.fillStyle = '#120f2e'; g.fillRect(x, 512 - h, 52, h);
    for (let k = 0; k < 10; k++) if (r() > 0.72) { g.fillStyle = '#ffcf7a'; g.fillRect(x + 6 + (k % 3) * 15, 512 - h + 10 + Math.floor(k / 3) * 22, 8, 10); }
  }
  return toTexture(c);
}

// Grey-scale masks below are used as alphaMaps (which read the green channel).
export function radialBlob() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128);
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, '#fff'); grd.addColorStop(0.55, '#8c8c8c'); grd.addColorStop(1, '#000');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return toTexture(c, { srgb: false, aniso: false });
}

// Rounded-rectangle soft shadow for furniture footprints.
export function softRect() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128);
  g.filter = 'blur(10px)';
  g.fillStyle = '#fff';
  g.fillRect(24, 24, 80, 80);
  g.filter = 'none';
  return toTexture(c, { srgb: false, aniso: false });
}

export function linearFade() {
  const [c, g] = canvas(4, 128);
  const grd = g.createLinearGradient(0, 0, 0, 128);
  grd.addColorStop(0, '#fff'); grd.addColorStop(0.35, '#737373'); grd.addColorStop(1, '#000');
  g.fillStyle = grd; g.fillRect(0, 0, 4, 128);
  const t = toTexture(c, { srgb: false, aniso: false });
  return t;
}

export function sparkSprite() {
  const [c, g] = canvas(64, 64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.25, 'rgba(255,255,255,0.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return toTexture(c, { srgb: false, aniso: false });
}

// Light shaft gradient: bright near the window, fading along its length and at the sides.
export function shaftTexture() {
  const [c, g] = canvas(128, 256);
  const img = g.createImageData(128, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 128; x++) {
    const u = x / 127, v = y / 255;
    const side = Math.pow(Math.sin(u * Math.PI), 1.5);
    const along = Math.pow(1 - v, 1.4);
    const a = side * along;
    const k = (y * 128 + x) * 4;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
    img.data[k + 3] = Math.round(a * 255);
  }
  g.putImageData(img, 0, 0);
  return toTexture(c, { srgb: false, aniso: false });
}

export function curtainFabric(base = [28, 30, 55], seed = 53) {
  const [c, g] = canvas(256, 256);
  const r = rng(seed);
  const [h, s, l] = base;
  g.fillStyle = hsl(h, s, l); g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 4) {
    g.fillStyle = hsl(h, s, l + (r() - 0.5) * 8, 0.6);
    g.fillRect(x, 0, 2, 256);
  }
  for (let i = 0; i < 60; i++) {
    g.strokeStyle = hsl(h + 10, s + 10, l + 12, 0.35); g.lineWidth = 2;
    const x = r() * 256, y = r() * 256;
    g.beginPath(); g.arc(x, y, 8 + r() * 10, 0, 4); g.stroke();
  }
  return toTexture(c, { tile: 0.8 });
}

export function tvScreen() {
  const [c, g] = canvas(256, 160);
  const grd = g.createLinearGradient(0, 0, 256, 160);
  grd.addColorStop(0, '#15151c'); grd.addColorStop(0.45, '#0a0a0f'); grd.addColorStop(0.5, '#1c1c26'); grd.addColorStop(1, '#07070a');
  g.fillStyle = grd; g.fillRect(0, 0, 256, 160);
  return toTexture(c);
}

// Toon shading ramp: soft anime-style bands.
export function toonRamp() {
  const n = 256;
  const data = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    const s = (a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const v = 0.22 + 0.48 * s(0.46, 0.54) + 0.30 * s(0.62, 0.74);
    data[i] = Math.round(v * 255);
  }
  const t = new THREE.DataTexture(data, n, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}
