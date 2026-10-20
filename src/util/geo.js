import * as THREE from 'three';

// Helpers for things that run along a wall line given in plan coordinates (x, z).

// Returns the unit direction a->b, its length and the unit normal pointing to `inside`.
export function wallFrame(a, b, inside) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const L = Math.hypot(dx, dz);
  const d = [dx / L, dz / L];
  let n = [-d[1], d[0]];
  const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
  if ((inside[0] - mx) * n[0] + (inside[1] - mz) * n[1] < 0) n = [-n[0], -n[1]];
  return { L, d, n };
}

// Matrix whose local axes are X, Y, Z (vectors given as [x, y, z]) and origin at `o`.
// If the basis is left-handed, the caller must use the mirrored variant instead.
export function basis(X, Y, Z, o) {
  return new THREE.Matrix4().makeBasis(
    new THREE.Vector3(...X), new THREE.Vector3(...Y), new THREE.Vector3(...Z),
  ).setPosition(o[0], o[1], o[2]);
}

// Builds a right-handed placement for a slab whose local X runs along the wall,
// Y is up and Z points outward (away from `inside`). Returns { matrix, L, start, d, n, flip }.
export function slabPlacement(a, b, inside, y0 = 0) {
  const f = wallFrame(a, b, inside);
  const out = [-f.n[0], -f.n[1]];
  // d x up = (-dz, 0, dx); it must equal the outward normal for a right-handed basis.
  const ok = Math.abs(-f.d[1] - out[0]) < 1e-6 && Math.abs(f.d[0] - out[1]) < 1e-6;
  const start = ok ? a : b;
  const d = ok ? f.d : [-f.d[0], -f.d[1]];
  const m = basis([d[0], 0, d[1]], [0, 1, 0], [out[0], 0, out[1]], [start[0], y0, start[1]]);
  return { matrix: m, L: f.L, start, d, n: f.n };
}

// Position along a slab (local X) of a world point on the wall line.
export function along(pl, p) {
  return (p[0] - pl.start[0]) * pl.d[0] + (p[1] - pl.start[1]) * pl.d[1];
}

// Placement for a profile extruded along the wall: local X = inward normal, Y = up, Z = along wall.
export function profilePlacement(a, b, inside, y0 = 0) {
  const f = wallFrame(a, b, inside);
  const want = [-f.n[1], f.n[0]];           // n x up
  const ok = Math.abs(want[0] - f.d[0]) < 1e-6 && Math.abs(want[1] - f.d[1]) < 1e-6;
  const start = ok ? a : b;
  const m = basis([f.n[0], 0, f.n[1]], [0, 1, 0], [want[0], 0, want[1]], [start[0], y0, start[1]]);
  return { matrix: m, L: f.L, start, d: want, n: f.n };
}

// A single quad from four corner points (counter-clockwise seen from the front).
export function quadGeo(p0, p1, p2, p3, uv = [[0, 0], [1, 0], [1, 1], [0, 1]]) {
  const pos = [p0, p1, p2, p0, p2, p3].flat();
  const uvs = [uv[0], uv[1], uv[2], uv[0], uv[2], uv[3]].flat();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

// Plane with a wavy (pleated) surface along its width, for curtains.
export function pleatedGeo(w, h, pleats, depth, segs = 48) {
  const g = new THREE.PlaneGeometry(w, h, segs, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = (p.getX(i) + w / 2) / w;
    p.setZ(i, Math.sin(u * Math.PI * 2 * pleats) * depth);
  }
  g.computeVertexNormals();
  return g;
}
