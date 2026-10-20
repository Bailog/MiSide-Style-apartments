import { quadGeo, wallFrame } from '../util/geo.js';

// Soft contact shadow on the floor under a footprint (x0..x1, z0..z1).
export function blob(B, M, x0, z0, x1, z1, y = 0.004) {
  // the soft-rect texture has its solid core in the middle 62.5 %
  const ex = (x1 - x0) * 0.3, ez = (z1 - z0) * 0.3;
  const a = x0 - ex, b = x1 + ex, c = z0 - ez, d = z1 + ez;
  B.add(quadGeo([a, y, d], [b, y, d], [b, y, c], [a, y, c]), M.blobShadow, [0, 0, 0], [0, 0, 0],
    { cast: false, receive: false, layer: 1 });
}

// Placement on a wall: returns {x, z, rotY} for the point `t` meters along a->b,
// with local +Z pointing into the room (so objects built facing +Z face the room).
export function onWall(a, b, inside, t) {
  const f = wallFrame(a, b, inside);
  let d = f.d, start = a;
  if (Math.abs(-d[1] - f.n[0]) > 1e-6 || Math.abs(d[0] - f.n[1]) > 1e-6) { d = [-d[0], -d[1]]; start = b; t = f.L - t; }
  return { x: start[0] + d[0] * t, z: start[1] + d[1] * t, rotY: Math.atan2(-d[1], d[0]), L: f.L };
}
