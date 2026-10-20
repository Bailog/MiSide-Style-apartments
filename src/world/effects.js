import * as THREE from 'three';
import * as C from '../config.js';
import * as T from '../textures.js';

// Soft beam of moonlight coming in under the blinds.
function lightShafts(scene, moon) {
  const W = C.OPENINGS.window;
  const dir = moon.target.position.clone().sub(moon.position).normalize();
  const tex = T.shaftTexture();
  const mat = new THREE.MeshBasicMaterial({
    color: '#8aa0ff', map: tex, transparent: true, opacity: 0.24,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  // light enters below the blinds, between the sash frames
  const panes = [[W.z0 + 0.12, W.z1 - 0.12]];
  const len = 3.4;
  const group = new THREE.Group();
  for (const [z0, z1] of panes) {
    const y0 = W.sill + 0.12, y1 = 1.6;
    const x = -C.WALL_THICKNESS.outer + 0.08;
    const c = [[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]].map((p) => new THREE.Vector3(...p));
    const e = c.map((p) => p.clone().addScaledVector(dir, len));
    const pos = [], uv = [];
    // four sides of the swept rectangle; u across the side, v along the beam
    for (let i = 0; i < 4; i++) {
      const a = c[i], b = c[(i + 1) % 4], ea = e[i], eb = e[(i + 1) % 4];
      pos.push(...a.toArray(), ...b.toArray(), ...eb.toArray(), ...a.toArray(), ...eb.toArray(), ...ea.toArray());
      uv.push(0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    const m = new THREE.Mesh(g, mat);
    m.layers.set(1);
    m.renderOrder = 2;
    group.add(m);
  }
  scene.add(group);
  return group;
}

// Floating dust motes, warm near lamps and bluish in the moonlight.
function dust(scene, count = 260) {
  const r = T.rng(99);
  const pos = new Float32Array(count * 3), base = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const areas = [[0.3, 4.6, C.LIVING.z0 + 0.1, C.LIVING.z1 - 0.2], [C.HALL.x0 + 0.2, C.HALL.x1 - 0.2, 0.3, C.HALL.z1 - 0.1]];
  const warm = new THREE.Color('#ffd7a0'), cold = new THREE.Color('#a8bcff');
  for (let i = 0; i < count; i++) {
    const [x0, x1, z0, z1] = areas[i % 2];
    base[i * 3] = x0 + r() * (x1 - x0);
    base[i * 3 + 1] = 0.3 + r() * 2.4;
    base[i * 3 + 2] = z0 + r() * (z1 - z0);
    phase[i] = r() * 100;
    const c = r() > 0.45 ? warm : cold;
    col.set([c.r, c.g, c.b], i * 3);
  }
  pos.set(base);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.022, map: T.sparkSprite(), vertexColors: true, transparent: true, opacity: 0.85,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  const pts = new THREE.Points(g, mat);
  pts.layers.set(1);
  pts.frustumCulled = false;
  scene.add(pts);
  return (t) => {
    for (let i = 0; i < count; i++) {
      const p = phase[i];
      pos[i * 3] = base[i * 3] + Math.sin(t * 0.13 + p) * 0.18;
      pos[i * 3 + 1] = base[i * 3 + 1] + Math.sin(t * 0.09 + p * 1.7) * 0.25;
      pos[i * 3 + 2] = base[i * 3 + 2] + Math.cos(t * 0.11 + p * 0.6) * 0.18;
    }
    g.attributes.position.needsUpdate = true;
  };
}

export function buildEffects(scene, lights) {
  const shafts = lightShafts(scene, lights.moon);
  const updateDust = dust(scene);
  return {
    shafts,
    update(t) { updateDust(t); },
  };
}
