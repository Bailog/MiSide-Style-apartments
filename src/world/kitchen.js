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
  const x1 = K.counterX1;
  B.box(0, 0.1, front, x1, K.counterTop - 0.04, L.z1, M.cherry);
  B.box(0, 0, front + 0.06, x1, 0.1, L.z1, M.blackPlastic, { cast: false });
  B.box(0, K.counterTop - 0.04, L.z1 - K.counterDepth, x1, K.counterTop, L.z1, M.countertop);
  // fronts: [x0, x1, kind]
  const fronts = [[0, 0.55, 'door'], [0.55, 1.15, 'oven'], [1.15, 1.75, 'doorL'], [1.75, 2.35, 'door'],
    [2.35, 2.95, 'doorL'], [2.95, 3.55, 'door'], [3.55, 4.15, 'doorL'], [4.15, x1, 'door']];
  for (const [a, b, kind] of fronts) {
    const mat = kind === 'oven' ? M.oven : kind === 'doorL' ? M.cabinetDoorL : M.cabinetDoor;
    B.add(boxGeo(b - a - 0.006, 0.66, 0.02, 'unit'), faces(M.cherry, { nz: mat }),
      [(a + b) / 2, 0.12 + 0.33, front - 0.01]);
  }
  colliders.push({ type: 'box', x0: 0, z0: L.z1 - K.counterDepth, x1, z1: L.z1 });
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
  // sink and faucet
  const sx = K.sinkX, sz = zb - 0.3;
  B.cyl(sx, sz, top, top + 0.006, 0.22, M.steel, 20);
  B.cyl(sx, sz, top + 0.006, top + 0.008, 0.18, M.darkSteel, 20, { cast: false });
  B.cyl(sx, zb - 0.07, top, top + 0.3, 0.018, M.chrome, 8);
  B.rod([sx, top + 0.3, zb - 0.07], [sx, top + 0.33, zb - 0.16], 0.015, M.chrome);
  B.rod([sx, top + 0.33, zb - 0.16], [sx, top + 0.24, zb - 0.24], 0.015, M.chrome);
}

function upperCabinets(B, M) {
  const z0 = L.z1 - K.upperDepth, y0 = K.upperY0, y1 = K.upperY1;
  const runs = [[0, K.hob.x0 - 0.05], [K.hob.x1 + 0.05, 3.05]];
  for (const [a, b] of runs) {
    B.box(a, y0, z0, b, y1, L.z1, M.cherry);
    B.box(a - 0.01, y1, z0 - 0.04, b + 0.01, y1 + 0.07, L.z1, M.cherry);   // crown
    // warm LED strip under the cabinets
    B.box(a + 0.02, y0 - 0.008, z0 + 0.03, b - 0.02, y0, z0 + 0.05, M.ledStrip, { cast: false });
  }
  const doors = [[0, K.hob.x0 - 0.05, M.upperDoor], [K.hob.x1 + 0.05, 1.65, M.upperDoor], [1.65, 2.1, M.upperGlass],
    [2.1, 2.55, M.upperGlass], [2.55, 3.05, M.upperDoor]];
  for (const [a, b, mat] of doors) {
    B.add(boxGeo(b - a - 0.006, y1 - y0 - 0.01, 0.02, 'unit'), faces(M.cherry, { nz: mat }),
      [(a + b) / 2, (y0 + y1) / 2, z0 - 0.01]);
  }
  // mosaic backsplash between the counter and the cabinets
  const yb0 = K.counterTop, yb1 = y0, xb1 = 3.9, z = L.z1 - 0.002;
  B.add(quadGeo([xb1, yb0, z], [0, yb0, z], [0, yb1, z], [xb1, yb1, z], [[xb1, 0], [0, 0], [0, yb1 - yb0], [xb1, yb1 - yb0]]),
    M.mosaic, [0, 0, 0], [0, 0, 0], { cast: false });
}

// Peninsula bar with a rounded end, chrome pole up to a wooden canopy (photo 3, 4).
function bar(B, M, colliders) {
  const b = K.bar, r = (b.x1 - b.x0) / 2, cx = (b.x0 + b.x1) / 2;
  const zEdge = L.z1 - K.counterDepth;
  const s = new THREE.Shape();
  s.moveTo(b.x0, -zEdge); s.lineTo(b.x1, -zEdge); s.lineTo(b.x1, -(b.z0 + r));
  s.absarc(cx, -(b.z0 + r), r, 0, Math.PI, false);
  s.closePath();
  const g = extrudeGeo(s, 0.04, { curveSegments: 12 });
  g.rotateX(-Math.PI / 2);
  B.add(g, M.countertop, [0, K.counterTop, 0]);
  const [px, pz] = K.pole;
  B.cyl(px, pz, 0, 2.38, 0.025, M.chrome, 10);
  B.cyl(px, pz, 0, 0.012, 0.09, M.chrome, 14);
  B.box(3.05, 2.38, b.z0, 3.75, 2.45, L.z1 - K.upperDepth - 0.04, M.cherry);
  // small glass rack hanging under the canopy
  B.box(px - 0.18, 2.3, pz + 0.1, px + 0.18, 2.31, pz + 0.12, M.chrome, { cast: false });
  B.box(px - 0.18, 2.3, pz + 0.3, px + 0.18, 2.31, pz + 0.32, M.chrome, { cast: false });
  colliders.push({ type: 'box', x0: b.x0, z0: b.z0, x1: b.x1, z1: zEdge });
  colliders.push({ type: 'circle', x: px, z: pz, r: 0.04 });
}

// Small black TV standing on the end of the counter, facing the dining table (photo 4).
function tv(B, M) {
  const x = 4.4, zc = 5.92, top = K.counterTop;
  B.box(x - 0.08, top, zc - 0.1, x + 0.08, top + 0.015, zc + 0.1, M.blackPlastic);
  B.box(x - 0.01, top + 0.015, zc - 0.02, x + 0.02, top + 0.1, zc + 0.02, M.blackPlastic);
  B.add(boxGeo(0.035, 0.34, 0.54, 'unit'), faces(M.blackPlastic, { nx: M.tvScreen }), [x, top + 0.27, zc]);
}

function fridge(B, M, colliders) {
  const x0 = 0.02, x1 = 0.66, z0 = L.z0 + 0.04, z1 = 3.98, h = 1.72;
  B.add(roundedBoxGeo(x1 - x0, h, z1 - z0, 0.03), M.fridgeBody, [(x0 + x1) / 2, h / 2 + 0.01, (z0 + z1) / 2]);
  B.add(boxGeo(0.025, h - 0.06, z1 - z0 - 0.04, 'unit'), faces(M.fridgeBody, { px: M.fridgeDoor }),
    [x1 + 0.012, h / 2 + 0.01, (z0 + z1) / 2]);
  colliders.push({ type: 'box', x0, z0, x1: x1 + 0.03, z1 });
  blob(B, M, x0, z0, x1, z1);
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

function dining(B, M, colliders) {
  const x0 = 0.85, x1 = 1.55, z0 = L.z0 + 0.04, z1 = 4.0, top = 0.75;
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
  B.at(1.86, 0, 3.68, Math.PI / 2 + 0.1, () => classicChair(B, M));
  B.at(1.18, 0, 4.3, 0.12, () => classicChair(B, M));
  colliders.push({ type: 'circle', x: 1.86, z: 3.68, r: 0.27 });
  colliders.push({ type: 'circle', x: 1.18, z: 4.3, r: 0.27 });
  blob(B, M, 1.65, 3.47, 2.07, 3.89);
  blob(B, M, 0.97, 4.09, 1.39, 4.51);
}

function rug(B, M) {
  const x0 = 0.55, x1 = 2.95, z0 = 4.98, z1 = L.z1 - K.counterDepth - 0.04;
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
  tv(B, M);
  fridge(B, M, colliders);
  dining(B, M, colliders);
  rug(B, M);
  airConditioner(B, M);
  return {
    underCabinet: [1.9, 1.38, L.z1 - 0.25],
    tvPos: [4.37, K.counterTop + 0.27, 5.92],
  };
}
