import * as THREE from 'three';
import * as C from '../config.js';
import { boxGeo, roundedBoxGeo, extrudeGeo } from '../util/builder.js';
import { quadGeo } from '../util/geo.js';
import { blob } from './common.js';

const K = C.KITCHEN, L = C.LIVING;

// Box faces order: +x, -x, +y, -y, +z, -z
const faces = (base, overrides) => {
  const order = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
  return order.map((k) => overrides[k] ?? base);
};

function lowerCabinets(B, M, colliders) {
  const front = L.z1 - K.counterDepth + 0.02;        // cabinet front face
  const x1 = K.counterX1, top = K.counterTop;
  const sinkL = K.sinkX - 0.3, sinkR = K.sinkX + 0.3;
  // carcass; lower under the sink so the bowl has room
  B.box(0, 0.1, front, sinkL, top - 0.04, L.z1, M.cherry);
  B.box(sinkL, 0.1, front, sinkR, 0.55, L.z1, M.cherry);
  B.box(sinkR, 0.1, front, x1, top - 0.04, L.z1, M.cherry);
  B.box(0, 0, front + 0.06, x1, 0.1, L.z1, M.blackPlastic, { cast: false });
  // worktop with a round cut-out for the sink
  const zf = L.z1 - K.counterDepth;
  const s = new THREE.Shape();
  s.moveTo(0, -L.z1); s.lineTo(x1, -L.z1); s.lineTo(x1, -zf); s.lineTo(0, -zf); s.closePath();
  const hole = new THREE.Path();
  hole.absarc(K.sinkX, -(L.z1 - 0.3), 0.215, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const wt = extrudeGeo(s, 0.04, { curveSegments: 24 });
  wt.rotateX(-Math.PI / 2);
  B.add(wt, M.countertop, [0, top - 0.04, 0]);
  // fronts: [x0, x1, kind]
  const fronts = [[0, 0.55, 'door'], [0.55, 1.15, 'oven'], [1.15, 1.72, 'doorL'], [1.72, 2.3, 'door'],
    [2.3, 2.8, 'doorL'], [2.8, 3.3, 'door'], [3.3, x1, 'doorL']];
  for (const [a, b, kind] of fronts) {
    const mat = kind === 'oven' ? M.oven : kind === 'doorL' ? M.cabinetDoorL : M.cabinetDoor;
    B.add(boxGeo(b - a - 0.006, 0.66, 0.02, 'unit'), faces(M.cherry, { nz: mat }),
      [(a + b) / 2, 0.12 + 0.33, front - 0.01]);
  }
  colliders.push({ type: 'box', x0: 0, z0: zf, x1, z1: L.z1 });
  blob(B, M, 0, front, x1, L.z1);
}

function cooking(B, M) {
  const top = K.counterTop, zb = L.z1;
  B.add(boxGeo(K.hob.x1 - K.hob.x0, 0.006, 0.44, 'unit'), faces(M.blackPlastic, { py: M.hob }),
    [(K.hob.x0 + K.hob.x1) / 2, top + 0.003, zb - 0.3]);
  // canopy hood in dark wood with a tapered chimney
  const hx = (K.hob.x0 + K.hob.x1) / 2;
  B.add(roundedBoxGeo(0.72, 0.16, 0.44, 0.02), M.cherry, [hx, 1.72, zb - 0.22]);
  const ch = new THREE.CylinderGeometry(0.3, 0.46, 0.6, 4, 1);
  ch.rotateY(Math.PI / 4);
  ch.scale(0.62 / 0.65, 1, 0.38 / 0.65);
  B.add(ch, M.cherry, [hx, 2.1, zb - 0.19]);
  B.box(hx - 0.2, 2.4, zb - 0.26, hx + 0.2, C.CEILING, zb, M.cherry);
  // recessed round sink with a steel rim, and the faucet
  const sx = K.sinkX, sz = zb - 0.3;
  const bowl = [[0.215, 0], [0.208, -0.03], [0.198, -0.14], [0.16, -0.175], [0, -0.18]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  B.add(new THREE.LatheGeometry(bowl, 24), M.steelInside, [sx, top, sz], [0, 0, 0], { cast: false });
  const rim = new THREE.RingGeometry(0.212, 0.24, 28);
  rim.rotateX(-Math.PI / 2);
  B.add(rim, M.steel, [sx, top + 0.002, sz], [0, 0, 0], { cast: false });
  B.cyl(sx, sz, top - 0.18, top - 0.176, 0.03, M.darkSteel, 12, { cast: false });
  B.cyl(sx, zb - 0.07, top, top + 0.3, 0.018, M.chrome, 8);
  B.rod([sx, top + 0.3, zb - 0.07], [sx, top + 0.33, zb - 0.16], 0.015, M.chrome);
  B.rod([sx, top + 0.33, zb - 0.16], [sx, top + 0.24, zb - 0.24], 0.015, M.chrome);
}

function upperCabinets(B, M) {
  const z0 = L.z1 - K.upperDepth, y0 = K.upperY0, y1 = K.upperY1, x1 = K.counterX1;
  const runs = [[0, K.hob.x0 - 0.05], [K.hob.x1 + 0.05, x1]];
  for (const [a, b] of runs) {
    B.box(a, y0, z0, b, y1, L.z1, M.cherry);
    B.box(a - 0.01, y1, z0 - 0.04, b + 0.01, y1 + 0.07, L.z1, M.cherry);   // crown
  }
  // the last one, above the sink at the end of the run, has leaded glass (photo 2.4)
  const doors = [[0, K.hob.x0 - 0.05, M.upperDoor], [K.hob.x1 + 0.05, 1.65, M.upperDoor], [1.65, 2.1, M.upperGlass],
    [2.1, 2.55, M.upperGlass], [2.55, 2.95, M.upperDoor], [2.95, 3.35, M.upperDoor], [3.35, x1, M.upperLeaded]];
  for (const [a, b, mat] of doors) {
    B.add(boxGeo(b - a - 0.006, y1 - y0 - 0.01, 0.02, 'unit'), faces(M.cherry, { nz: mat }),
      [(a + b) / 2, (y0 + y1) / 2, z0 - 0.01]);
  }
  // mosaic backsplash between the counter and the cabinets
  const yb0 = K.counterTop, yb1 = y0, z = L.z1 - 0.002;
  B.add(quadGeo([x1, yb0, z], [0, yb0, z], [0, yb1, z], [x1, yb1, z], [[x1, 0], [0, 0], [0, yb1 - yb0], [x1, yb1 - yb0]]),
    M.mosaic, [0, 0, 0], [0, 0, 0], { cast: false });
}

// Peninsula bar flush with the worktop, with a chrome pole up to a wooden canopy
// that runs back to the wall over the cabinets (photo 3, 4).
function bar(B, M, colliders) {
  const b = K.bar, r = (b.x1 - b.x0) / 2, cx = (b.x0 + b.x1) / 2;
  const zEdge = L.z1 - K.counterDepth;
  const s = new THREE.Shape();
  s.moveTo(b.x0, -zEdge); s.lineTo(b.x1, -zEdge); s.lineTo(b.x1, -(b.z0 + r));
  s.absarc(cx, -(b.z0 + r), r, 0, Math.PI, false);
  s.closePath();
  const g = extrudeGeo(s, 0.04, { curveSegments: 12 });
  g.rotateX(-Math.PI / 2);
  B.add(g, M.countertop, [0, K.counterTop - 0.04, 0]);
  const [px, pz] = K.pole;
  const canopyY = K.upperY1 + 0.07;
  B.cyl(px, pz, 0, canopyY, 0.025, M.chrome, 10);
  B.cyl(px, pz, 0, 0.012, 0.09, M.chrome, 14);
  B.box(b.x0 - 0.1, canopyY, b.z0, b.x1 + 0.1, canopyY + 0.07, L.z1, M.cherry);
  // small glass rack hanging under the canopy
  B.box(px - 0.18, canopyY - 0.08, pz + 0.1, px + 0.18, canopyY - 0.07, pz + 0.12, M.chrome, { cast: false });
  B.box(px - 0.18, canopyY - 0.08, pz + 0.3, px + 0.18, canopyY - 0.07, pz + 0.32, M.chrome, { cast: false });
  colliders.push({ type: 'box', x0: b.x0, z0: b.z0, x1: b.x1, z1: zEdge });
  colliders.push({ type: 'circle', x: px, z: pz, r: 0.04 });
}

// 37" TV on a black glass stand with chrome legs, facing the sofa (photo 2.2).
function tv(B, M, colliders) {
  const T = K.tvStand, z1 = L.z1 - 0.03, z0 = z1 - T.depth, h = T.height;
  const xc = (T.x0 + T.x1) / 2, zc = (z0 + z1) / 2;
  for (const y of [0.06, 0.27, h - 0.02]) {
    B.add(boxGeo(T.x1 - T.x0, 0.012, T.depth, 'unit'), M.darkGlass, [xc, y + 0.006, zc]);
  }
  for (const [lx, lz] of [[T.x0 + 0.04, z0 + 0.04], [T.x1 - 0.04, z0 + 0.04], [T.x0 + 0.04, z1 - 0.04], [T.x1 - 0.04, z1 - 0.04]]) {
    B.cyl(lx, lz, 0, h, 0.02, M.chrome, 10);
  }
  // the TV itself, screen towards -Z
  const base = h + 0.004, tz = zc + 0.05;
  B.box(xc - 0.16, base, tz - 0.1, xc + 0.16, base + 0.02, tz + 0.1, M.blackPlastic);
  B.box(xc - 0.03, base + 0.02, tz - 0.015, xc + 0.03, base + 0.08, tz + 0.015, M.blackPlastic);
  const tw = 0.86, th = 0.53, ty = base + 0.07 + th / 2;
  B.add(roundedBoxGeo(tw, th, 0.06, 0.012), M.blackPlastic, [xc, ty, tz]);
  const sw = 0.4, sh = 0.235, sz = tz - 0.031;
  B.add(quadGeo([xc + sw, ty - sh, sz], [xc - sw, ty - sh, sz], [xc - sw, ty + sh, sz], [xc + sw, ty + sh, sz]),
    M.tvScreen, [0, 0, 0], [0, 0, 0], { cast: false });
  colliders.push({ type: 'box', x0: T.x0, z0, x1: T.x1, z1: L.z1 });
  blob(B, M, T.x0, z0, T.x1, z1);
  return [xc, ty, sz - 0.35];
}

// Fridge in the corner by the window: door to the south, magnets on the side facing
// the table, microwave on top (photo 2.1).
function fridge(B, M, colliders) {
  const F = C.FRIDGE, w = F.x1 - F.x0, d = F.z1 - F.z0, xc = (F.x0 + F.x1) / 2;
  B.add(boxGeo(w, F.h - 0.02, d - 0.03, 'unit'), faces(M.fridgeBody, { px: M.fridgeSide }),
    [xc, (F.h - 0.02) / 2 + 0.02, F.z0 + (d - 0.03) / 2]);
  B.add(boxGeo(w - 0.01, F.h - 0.05, 0.03, 'unit'), faces(M.fridgeBody, { pz: M.fridgeDoor }),
    [xc, (F.h - 0.05) / 2 + 0.03, F.z1 - 0.015]);
  B.add(boxGeo(0.48, 0.28, 0.36, 'unit'), faces(M.microBody, { pz: M.microFront }), [xc + 0.02, F.h + 0.14, F.z0 + 0.24]);
  colliders.push({ type: 'box', x0: F.x0, z0: F.z0, x1: F.x1, z1: F.z1 });
  blob(B, M, F.x0, F.z0, F.x1, F.z1);
}

// Classic wooden chair with an upholstered seat; built facing -Z in local space.
export function classicChair(B, M) {
  const seatY = 0.46, w = 0.42, d = 0.42;
  B.add(roundedBoxGeo(w, 0.06, d, 0.02), M.chairFabric, [0, seatY, 0]);
  B.box(-w / 2, seatY - 0.06, -d / 2, w / 2, seatY - 0.03, d / 2, M.tableWood);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const top = lz > 0 ? 0.98 : seatY - 0.03;
    B.box(lx * (w / 2 - 0.035) - 0.02, 0, lz * (d / 2 - 0.035) - 0.02, lx * (w / 2 - 0.035) + 0.02, top, lz * (d / 2 - 0.035) + 0.02, M.tableWood);
  }
  B.add(roundedBoxGeo(w - 0.1, 0.36, 0.035, 0.012), M.chairFabric, [0, 0.74, d / 2 - 0.035], [-0.08, 0, 0]);
  B.box(-w / 2 + 0.02, 0.94, d / 2 - 0.06, w / 2 - 0.02, 0.99, d / 2 - 0.01, M.tableWood);
}

// Small table right next to the fridge, against the north wall, with two chairs (photo 2.1).
function dining(B, M, colliders) {
  const x0 = C.FRIDGE.x1 + 0.02, x1 = x0 + 0.7, z0 = L.z0 + 0.02, z1 = L.z0 + 0.68, top = 0.75;
  B.add(boxGeo(x1 - x0, 0.035, z1 - z0, 'unit'), faces(M.tableWood, { py: M.tablecloth }),
    [(x0 + x1) / 2, top - 0.0175, (z0 + z1) / 2]);
  B.box(x0 + 0.05, top - 0.12, z0 + 0.05, x1 - 0.05, top - 0.035, z1 - 0.05, M.tableWood);
  const prof = [[0, 0], [0.028, 0], [0.022, 0.1], [0.035, 0.18], [0.02, 0.3], [0.024, 0.6], [0.03, 0.64], [0, 0.64]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  for (const [lx, lz] of [[x0 + 0.06, z0 + 0.06], [x1 - 0.06, z0 + 0.06], [x0 + 0.06, z1 - 0.06], [x1 - 0.06, z1 - 0.06]]) {
    B.add(new THREE.LatheGeometry(prof, 8), M.tableWood, [lx, 0, lz]);
  }
  colliders.push({ type: 'box', x0, z0, x1, z1 });
  blob(B, M, x0, z0, x1, z1);
  // chairs: one at the open end facing west, one in front facing the wall
  const chairs = [[x1 + 0.28, (z0 + z1) / 2, Math.PI / 2 + 0.1], [(x0 + x1) / 2 - 0.05, z1 + 0.3, 0.12]];
  for (const [cx, cz, rot] of chairs) {
    B.at(cx, 0, cz, rot, () => classicChair(B, M));
    colliders.push({ type: 'circle', x: cx, z: cz, r: 0.27 });
    blob(B, M, cx - 0.21, cz - 0.21, cx + 0.21, cz + 0.21);
  }
}

// Dark green runner in front of the counter, west of the bar.
function rug(B, M) {
  const x0 = 0.55, x1 = K.bar.x0 - 0.1, z1 = L.z1 - K.counterDepth - 0.04, z0 = z1 - 0.56;
  B.add(boxGeo(x1 - x0, 0.008, z1 - z0, 'unit'), faces(M.rug, {}), [(x0 + x1) / 2, 0.007, (z0 + z1) / 2], [0, 0, 0], { cast: false });
}

function airConditioner(B, M) {
  B.add(roundedBoxGeo(0.82, 0.29, 0.21, 0.05), M.acBody, [0.72, 2.6, L.z0 + 0.11]);
  B.box(0.36, 2.47, L.z0 + 0.2, 1.08, 2.49, L.z0 + 0.215, M.darkSteel, { cast: false });
}

export function buildKitchen(B, M, colliders) {
  lowerCabinets(B, M, colliders);
  cooking(B, M);
  upperCabinets(B, M);
  bar(B, M, colliders);
  const tvGlow = tv(B, M, colliders);
  fridge(B, M, colliders);
  dining(B, M, colliders);
  rug(B, M);
  airConditioner(B, M);
  return { tvGlow };
}
