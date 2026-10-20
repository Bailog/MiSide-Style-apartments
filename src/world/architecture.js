import * as THREE from 'three';
import * as C from '../config.js';
import { boxGeo, extrudeGeo } from '../util/builder.js';
import { slabPlacement, profilePlacement, along, quadGeo, pleatedGeo } from '../util/geo.js';

const { CEILING: H } = C;

// Wall definitions: inner face from a to b; `inside` is any point in the room it faces.
// ext0/ext1 extend the slab past convex corners so no light leaks through the seams.
function wallList() {
  const L = C.LIVING, HL = C.HALL, O = C.OPENINGS;
  const liv = [2.3, 4.8], hall = [5.0, 1.8];
  const door = (p0, p1) => ({ p0, p1, y0: 0, y1: C.DOOR.height - C.DOOR.casing, kind: 'door' });
  return [
    { a: [L.x0, L.z0], b: [L.x0, L.z1], inside: liv, t: C.WALL_THICKNESS.outer, ext0: 0.3, ext1: 0.3,
      openings: [{ p0: [0, O.window.z0], p1: [0, O.window.z1], y0: O.window.y0, y1: O.window.y1, kind: 'window' }] },
    { a: [L.x0, L.z1], b: [L.x1, L.z1], inside: liv, t: 0.25, ext0: 0.3, ext1: 0.3 },
    { a: [L.x1, L.z1], b: [L.x1, L.z0], inside: liv, t: C.WALL_THICKNESS.inner, ext0: 0.3, ext1: 0 },
    { a: [L.x1, HL.z1], b: [HL.x1, HL.z1], inside: hall, t: C.WALL_THICKNESS.inner, ext0: 0, ext1: 0.3,
      openings: [door([O.hallSouthDoor.x0, HL.z1], [O.hallSouthDoor.x1, HL.z1])] },
    { a: [HL.x1, HL.z1], b: [HL.x1, C.ARCH.wallZ - C.ARCH.thickness], inside: hall, t: 0.25, ext0: 0.3, ext1: 0 },
    { a: [C.NICHE.x0, 0], b: [C.NICHE.x1, 0], inside: hall, t: 0.25, ext0: 0.3, ext1: 0.2 },
    { a: [HL.x0, C.DIAGONAL.b[1]], b: [HL.x0, 0], inside: hall, t: C.WALL_THICKNESS.inner, ext0: 0, ext1: 0.3,
      openings: [
        door([HL.x0, O.hallWestDoor.z0], [HL.x0, O.hallWestDoor.z1]),
        { p0: [HL.x0, O.glassPanel.z0], p1: [HL.x0, O.glassPanel.z1], y0: O.glassPanel.y0, y1: O.glassPanel.y1, kind: 'glass' },
      ] },
    { a: C.DIAGONAL.a, b: C.DIAGONAL.b, inside: [3.2, 3.3], t: C.WALL_THICKNESS.inner, ext0: 0, ext1: 0 },
    { a: [L.x0, L.z0], b: C.DIAGONAL.a, inside: liv, t: C.WALL_THICKNESS.inner, ext0: 0.3, ext1: 0 },
  ];
}

// Extruded wall slab with rectangular openings. Inner face carries the star wallpaper,
// reveals and edges get plain plaster.
function buildWall(B, M, w) {
  const pl = slabPlacement(w.a, w.b, w.inside, 0);
  const startExt = pl.start === w.a ? w.ext0 : w.ext1;
  const endExt = pl.start === w.a ? w.ext1 : w.ext0;
  const holes = (w.openings ?? []).map((o) => {
    let t0 = along(pl, o.p0), t1 = along(pl, o.p1);
    if (t0 > t1) [t0, t1] = [t1, t0];
    return { ...o, t0, t1 };
  }).sort((p, q) => p.t0 - q.t0);
  // outline runs along the floor and steps up around door openings
  const shape = new THREE.Shape();
  shape.moveTo(-startExt, 0);
  for (const o of holes.filter((h) => h.kind === 'door')) {
    shape.lineTo(o.t0, 0); shape.lineTo(o.t0, o.y1); shape.lineTo(o.t1, o.y1); shape.lineTo(o.t1, 0);
  }
  shape.lineTo(pl.L + endExt, 0);
  shape.lineTo(pl.L + endExt, H);
  shape.lineTo(-startExt, H);
  shape.closePath();
  for (const o of holes.filter((h) => h.kind !== 'door')) {
    const hole = new THREE.Path();
    hole.moveTo(o.t0, o.y0); hole.lineTo(o.t0, o.y1); hole.lineTo(o.t1, o.y1); hole.lineTo(o.t1, o.y0); hole.closePath();
    shape.holes.push(hole);
  }
  const geo = extrudeGeo(shape, w.t);
  geo.applyMatrix4(pl.matrix);
  B.add(geo, [M.wall, M.wallPlain]);
  return { pl, holes };
}

// Floor polygon of the hall + kitchen-living room (plan coordinates).
function floorOutline() {
  const L = C.LIVING, HL = C.HALL, P = C.PILLAR, A = C.ARCH;
  return [
    [L.x0, L.z0], C.DIAGONAL.a, C.DIAGONAL.b, [HL.x0, 0], [P.x1, 0], [P.x1, A.wallZ - A.thickness],
    [HL.x1, A.wallZ - A.thickness], [HL.x1, HL.z1], [L.x1, HL.z1], [L.x1, L.z1], [L.x0, L.z1],
  ];
}

function buildFloorCeiling(B, M) {
  const pts = floorOutline();
  // floor: shape (x, -z) rotated onto XZ facing up
  const fs = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const fg = new THREE.ShapeGeometry(fs);
  fg.rotateX(-Math.PI / 2);
  B.add(fg, M.floor, [0, 0, 0], [0, 0, 0], { cast: false });
  // ceiling: shape (x, z) rotated to face down
  const cs = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)).reverse());
  const cg = new THREE.ShapeGeometry(cs);
  cg.rotateX(Math.PI / 2);
  B.add(cg, M.ceiling, [0, H, 0], [0, 0, 0], { cast: false });
}

// Lowered-ceiling boxes (0.5 m) over the computer niche and over the kitchen opening.
function buildSoffits(B, M) {
  const top = H, bot = C.SOFFIT_BOTTOM;
  const mats = [M.wallPlain, M.wallPlain, M.ceiling, M.ceiling, M.wallPlain, M.wallPlain];
  const N = C.NICHE, S = C.SOFFIT_BAND;
  B.box(N.x0, bot, N.z0, N.x1, top, N.z1, mats);
  B.box(S.x0, bot, S.z0, S.x1, top, S.z1, mats);
  // small cornice under the soffit edges
  B.box(N.x0, bot - 0.03, N.z1 - 0.05, N.x1, bot, N.z1, M.cornice);
  B.box(S.x0, bot - 0.03, S.z0, S.x1, bot, S.z0 + 0.05, M.cornice);
  B.box(S.x0, bot - 0.03, S.z1 - 0.05, S.x1, bot, S.z1, M.cornice);
}

// Pillar between the niche and the arch, built from boxes so that it can hold
// a shelf niche (facing the desk) and a niche with a pink vase (facing the hall).
function buildPillar(B, M) {
  const P = C.PILLAR;
  const sx = P.x0 + 0.14, shelf = { z0: 0.12, z1: 0.48, y0: 0.55, y1: 2.25 };
  const vz = P.z1 - 0.14, vase = { x0: P.x0 + 0.16, x1: P.x1 - 0.06, y0: 0.95, y1: 1.6 };
  const box = (x0, y0, z0, x1, y1, z1) => B.box(x0, y0, z0, x1, y1, z1, M.wall);
  box(sx, 0, P.z0, P.x1, H, vz);
  box(P.x0, 0, P.z0, sx, H, shelf.z0);
  box(P.x0, 0, shelf.z1, sx, H, P.z1);
  box(P.x0, 0, shelf.z0, sx, shelf.y0, shelf.z1);
  box(P.x0, shelf.y1, shelf.z0, sx, H, shelf.z1);
  box(sx, 0, vz, vase.x0, H, P.z1);
  box(vase.x1, 0, vz, P.x1, H, P.z1);
  box(vase.x0, 0, vz, vase.x1, vase.y0, P.z1);
  box(vase.x0, vase.y1, vz, vase.x1, H, P.z1);
  // glass shelves
  for (let i = 0; i < 6; i++) {
    const y = shelf.y0 + 0.02 + i * ((shelf.y1 - shelf.y0 - 0.04) / 5);
    B.box(P.x0 + 0.005, y, shelf.z0 + 0.005, sx, y + 0.012, shelf.z1 - 0.005, M.shelfGlass, { cast: false, layer: 1 });
  }
  // pink vase on the small niche floor
  const prof = [[0, 0], [0.05, 0], [0.065, 0.08], [0.05, 0.2], [0.03, 0.27], [0.045, 0.34], [0, 0.34]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const vg = new THREE.LatheGeometry(prof, 10);
  B.add(vg, M.pinkVase, [(vase.x0 + vase.x1) / 2, vase.y0, (vz + P.z1) / 2]);
}

// Header with a round arch over the passage to the corridor, plus a dark dead-end corridor.
function buildArch(B, M) {
  const A = C.ARCH, w = A.x1 - A.x0, r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(0, A.spring);
  s.lineTo(0, H); s.lineTo(w, H); s.lineTo(w, A.spring);
  s.absarc(r, A.spring, r, 0, Math.PI, false);
  s.closePath();
  const g = extrudeGeo(s, A.thickness, { curveSegments: 14 });
  g.translate(A.x0, 0, A.wallZ - A.thickness);
  B.add(g, [M.wall, M.wallPlain]);

  // corridor (unlit, just a hint of depth)
  const z0 = A.corridorEnd, z1 = A.wallZ - A.thickness;
  B.box(A.x0 - 0.2, 0, z0 - 0.2, A.x0 + 0.005, H, z1, M.corridorWall, { cast: false, receive: false });
  B.box(A.x1 - 0.005, 0, z0 - 0.2, A.x1 + 0.2, H, z1, M.corridorWall, { cast: false, receive: false });
  B.box(A.x0, 0, z0 - 0.2, A.x1, H, z0, M.corridorWall, { cast: false, receive: false });
  B.box(A.x0, -0.05, z0, A.x1, 0, z1, M.corridorFloor, { cast: false, receive: false });
  B.box(A.x0, H, z0, A.x1, H + 0.05, z1, M.corridorWall, { cast: false, receive: false });
  const dw = 0.8, dx = (A.x0 + A.x1) / 2;
  B.add(boxGeo(dw, 2.05, 0.04, 'unit'), [M.corridorWall, M.corridorWall, M.corridorWall, M.corridorWall, M.corridorDoor, M.corridorDoor],
    [dx, 1.025, z0 + 0.03], [0, 0, 0], { cast: false, receive: false });
}

// Door casing, lining and leaf for a door opening found in a wall.
function buildDoor(B, M, pl, hole, wallT, inside) {
  const cas = C.DOOR.casing, top = hole.y1;
  const toWorld = (t, y, depth) => {
    // depth: 0 = inner face, positive = into the wall (outward)
    const x = pl.start[0] + pl.d[0] * t - pl.n[0] * depth;
    const z = pl.start[1] + pl.d[1] * t - pl.n[1] * depth;
    return [x, y, z];
  };
  const rotY = Math.atan2(-pl.d[1], pl.d[0]);
  const piece = (t0, t1, y0, y1, d0, d1, mat, uv) => {
    const w = t1 - t0, h = y1 - y0, d = d1 - d0;
    const c = toWorld((t0 + t1) / 2, (y0 + y1) / 2, (d0 + d1) / 2);
    B.boxAt(w, h, d, c[0], c[1], c[2], rotY, mat, { uv });
  };
  // casing on both faces of the wall
  for (const [d0, d1] of [[-0.02, 0], [wallT, wallT + 0.02]]) {
    piece(hole.t0 - cas, hole.t0, 0, top + cas, d0, d1, M.doorWood);
    piece(hole.t1, hole.t1 + cas, 0, top + cas, d0, d1, M.doorWood);
    piece(hole.t0 - cas, hole.t1 + cas, top, top + cas, d0, d1, M.doorWood);
  }
  // lining inside the opening
  piece(hole.t0, hole.t0 + 0.025, 0, top, 0, wallT, M.doorWood);
  piece(hole.t1 - 0.025, hole.t1, 0, top, 0, wallT, M.doorWood);
  piece(hole.t0, hole.t1, top - 0.025, top, 0, wallT, M.doorWood);
  // closed leaf in the middle of the wall
  const lw = hole.t1 - hole.t0 - 0.05;
  const c = toWorld((hole.t0 + hole.t1) / 2, (top - 0.03) / 2 + 0.005, wallT / 2);
  B.boxAt(lw, top - 0.035, 0.04, c[0], c[1], c[2], rotY,
    [M.doorWood, M.doorWood, M.doorWood, M.doorWood, M.doorLeaf, M.doorLeaf], { uv: 'unit' });
  // lever handle on the room side
  const hx = hole.t0 + 0.08;
  const hp = toWorld(hx, 1.0, wallT / 2 - 0.05);
  B.boxAt(0.035, 0.035, 0.06, hp[0], hp[1], hp[2], rotY, M.brass);
  const lp = toWorld(hx + 0.05, 1.0, wallT / 2 - 0.085);
  B.boxAt(0.12, 0.02, 0.02, lp[0], lp[1], lp[2], rotY, M.brass);
}

// Tall decorative glass panel with a white frame.
function buildGlassPanel(B, M, pl, hole, wallT) {
  const rotY = Math.atan2(-pl.d[1], pl.d[0]);
  const toWorld = (t, y, depth) => [pl.start[0] + pl.d[0] * t - pl.n[0] * depth, y, pl.start[1] + pl.d[1] * t - pl.n[1] * depth];
  const w = hole.t1 - hole.t0, h = hole.y1 - hole.y0;
  const c = toWorld((hole.t0 + hole.t1) / 2, (hole.y0 + hole.y1) / 2, wallT / 2);
  B.boxAt(w, h, 0.03, c[0], c[1], c[2], rotY,
    [M.whitePaint, M.whitePaint, M.whitePaint, M.whitePaint, M.glassPanel, M.glassPanel], { uv: 'unit' });
  const f = 0.05;
  for (const d of [-0.012, wallT + 0.012]) {
    const p = (t0, t1, y0, y1) => {
      const cc = toWorld((t0 + t1) / 2, (y0 + y1) / 2, d);
      B.boxAt(t1 - t0, y1 - y0, 0.024, cc[0], cc[1], cc[2], rotY, M.whitePaint);
    };
    p(hole.t0 - f, hole.t0, hole.y0 - f, hole.y1 + f);
    p(hole.t1, hole.t1 + f, hole.y0 - f, hole.y1 + f);
    p(hole.t0, hole.t1, hole.y1, hole.y1 + f);
    p(hole.t0, hole.t1, hole.y0 - f, hole.y0);
  }
}

// Window in the thick end wall: PVC frame, glass, sill, radiator, curtains and the sky behind.
function buildWindow(B, M) {
  const W = C.OPENINGS.window, t = C.WALL_THICKNESS.outer;
  const xf = -t * 0.45;             // frame plane
  const z0 = W.z0, z1 = W.z1, y0 = W.y0, y1 = W.y1;
  const fr = 0.06;
  const bar = (za, zb, ya, yb) => B.box(xf - 0.035, ya, za, xf + 0.035, yb, zb, M.windowFrame);
  bar(z0, z0 + fr, y0, y1); bar(z1 - fr, z1, y0, y1);
  bar(z0, z1, y0, y0 + fr); bar(z0, z1, y1 - fr, y1);
  const zm = (z0 + z1) / 2;
  bar(zm - 0.04, zm + 0.04, y0, y1);                    // mullion
  bar(z0, z1, 2.05, 2.11);                               // transom
  // sash handles
  B.box(xf + 0.035, 1.45, zm - 0.09, xf + 0.06, 1.6, zm - 0.07, M.whitePaint);
  B.add(quadGeo([xf, y0, z1], [xf, y0, z0], [xf, y1, z0], [xf, y1, z1]), M.windowGlass, [0, 0, 0], [0, 0, 0], { cast: false, receive: false, layer: 1 });
  // sky backdrop far behind the glass
  const sky = new THREE.PlaneGeometry(8, 4);
  sky.rotateY(Math.PI / 2);
  B.add(sky, M.sky, [-2.6, 1.62, 3.88], [0, 0, 0], { cast: false, receive: false, layer: 1 });
  // wide sill joined to the kitchen counter, radiator below
  const kt = C.KITCHEN.counterTop;
  B.box(xf + 0.04, kt - 0.04, z0 - 0.1, 0.32, kt, C.LIVING.z1 - C.KITCHEN.counterDepth, M.countertop);
  for (let z = z0 + 0.1; z < z1 - 0.12; z += 0.085) {
    B.box(0.05, 0.16, z, 0.17, 0.72, z + 0.07, M.radiator);
  }
  B.box(0.07, 0.2, z0 + 0.1, 0.15, 0.68, z1 - 0.15, M.radiator);
  // curtains: two side drapes and a valance over the top (photo 3)
  const cx = 0.09;
  B.box(cx - 0.01, 2.9, z0 - 0.35, cx + 0.01, 2.92, z1 + 0.35, M.brass);
  const drape = (zc, w) => {
    const g = pleatedGeo(w, 2.0, 5, 0.035);
    g.rotateY(Math.PI / 2);
    B.add(g, M.curtain, [cx + 0.03, 1.9, zc], [0, 0, 0], { receive: true });
  };
  drape(z0 - 0.12, 0.45);
  drape(z1 + 0.12, 0.45);
  const val = pleatedGeo(z1 - z0 + 0.8, 0.9, 11, 0.04);
  val.rotateY(Math.PI / 2);
  B.add(val, M.curtain, [cx + 0.07, 2.45, (z0 + z1) / 2], [0, 0, 0]);
}

// Crown moulding at the ceiling and baseboards at the floor along every wall.
function buildTrims(B, M, walls) {
  const cornice = new THREE.Shape([
    [0, 0], [0, -0.11], [0.015, -0.11], [0.03, -0.075], [0.07, -0.035], [0.11, -0.02], [0.11, 0],
  ].map(([x, y]) => new THREE.Vector2(x, y)));
  const skipCornice = new Set([5]);       // niche back wall sits under the soffit
  walls.forEach((w, i) => {
    const pl = profilePlacement(w.a, w.b, w.inside, 0);
    const segments = [[0, pl.L]];
    if (!skipCornice.has(i)) {
      let [s0, s1] = segments[0];
      if (i === 6) s1 = pl.L - (pl.start === w.a ? C.NICHE.z1 : 0);   // hall west wall: stop at the niche
      if (i === 6 && pl.start !== w.a) s0 = C.NICHE.z1;
      const g = extrudeGeo(cornice, s1 - s0);
      g.translate(0, H, s0);
      g.applyMatrix4(pl.matrix);
      B.add(g, M.cornice, [0, 0, 0], [0, 0, 0], { cast: false });
    }
    // baseboard split around door openings
    const cuts = (w.openings ?? []).filter((o) => o.kind === 'door').map((o) => {
      const t0 = (o.p0[0] - pl.start[0]) * pl.d[0] + (o.p0[1] - pl.start[1]) * pl.d[1];
      const t1 = (o.p1[0] - pl.start[0]) * pl.d[0] + (o.p1[1] - pl.start[1]) * pl.d[1];
      return [Math.min(t0, t1) - C.DOOR.casing, Math.max(t0, t1) + C.DOOR.casing];
    }).sort((a, b) => a[0] - b[0]);
    let s = 0;
    const runs = [];
    for (const [c0, c1] of cuts) { if (c0 > s) runs.push([s, c0]); s = c1; }
    if (s < pl.L) runs.push([s, pl.L]);
    for (const [r0, r1] of runs) {
      const g = boxGeo(0.016, 0.075, r1 - r0);
      g.translate(0.008, 0.0375, (r0 + r1) / 2);
      g.applyMatrix4(pl.matrix);
      B.add(g, M.baseboard, [0, 0, 0], [0, 0, 0], { cast: false });
    }
  });
}

// Soft dark gradients where walls meet the floor and ceiling (cheap ambient occlusion).
function buildAO(B, M, walls) {
  for (const w of walls) {
    const pl = profilePlacement(w.a, w.b, w.inside, 0);
    const n = [pl.n[0], 0, pl.n[1]];
    const P = (t, y, off) => [pl.start[0] + pl.d[0] * t + n[0] * off, y, pl.start[1] + pl.d[1] * t + n[2] * off];
    const L = pl.L;
    // floor strip: alpha 1 at the wall
    B.add(quadGeo(P(0, 0.003, 0), P(L, 0.003, 0), P(L, 0.003, 0.32), P(0, 0.003, 0.32), [[0, 1], [1, 1], [1, 0], [0, 0]]),
      M.aoFloor, [0, 0, 0], [0, 0, 0], { cast: false, receive: false, layer: 1 });
    // wall strip above the floor
    B.add(quadGeo(P(L, 0, 0.004), P(0, 0, 0.004), P(0, 0.4, 0.004), P(L, 0.4, 0.004), [[1, 1], [0, 1], [0, 0], [1, 0]]),
      M.aoWall, [0, 0, 0], [0, 0, 0], { cast: false, receive: false, layer: 1 });
    // ceiling strip
    B.add(quadGeo(P(L, H - 0.003, 0), P(0, H - 0.003, 0), P(0, H - 0.003, 0.35), P(L, H - 0.003, 0.35), [[1, 1], [0, 1], [0, 0], [1, 0]]),
      M.aoCeil, [0, 0, 0], [0, 0, 0], { cast: false, receive: false, layer: 1 });
  }
}

export function buildArchitecture(B, M) {
  const walls = wallList();
  for (const w of walls) {
    const { pl, holes } = buildWall(B, M, w);
    for (const h of holes) {
      if (h.kind === 'door') buildDoor(B, M, pl, h, w.t, w.inside);
      if (h.kind === 'glass') buildGlassPanel(B, M, pl, h, w.t);
    }
  }
  buildFloorCeiling(B, M);
  buildSoffits(B, M);
  buildPillar(B, M);
  buildArch(B, M);
  buildWindow(B, M);
  buildTrims(B, M, walls);
  buildAO(B, M, walls);
  return { walls };
}
