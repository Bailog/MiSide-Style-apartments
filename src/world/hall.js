import * as THREE from 'three';
import * as C from '../config.js';
import { boxGeo, roundedBoxGeo } from '../util/builder.js';
import { quadGeo } from '../util/geo.js';
import { blob } from './common.js';

const faces = (base, o) => ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map((k) => o[k] ?? base);
const N = C.NICHE;

// Dark wooden desk filling the computer niche, drawers on the right (photo 1, 5).
function desk(B, M, colliders) {
  const x0 = N.x0 + 0.02, x1 = N.x1 - 0.02, z0 = 0.02, z1 = 0.72, top = 0.75;
  B.box(x0, top - 0.04, z0, x1, top, z1, M.deskWood);
  B.box(x0, 0, z0 + 0.02, x0 + 0.04, top - 0.04, z1 - 0.02, M.deskWood);
  const px0 = x1 - 0.52;
  B.box(px0, 0, z0 + 0.02, x1, top - 0.04, z1 - 0.02, M.deskWood);
  for (const [y0, y1] of [[0.04, 0.24], [0.26, 0.46], [0.48, 0.68]]) {
    B.add(boxGeo(0.48, y1 - y0, 0.02, 'unit'), faces(M.deskWood, { pz: M.drawer }), [(px0 + x1) / 2, (y0 + y1) / 2, z1 - 0.01]);
  }
  B.add(boxGeo(px0 - x0 - 0.1, 0.08, 0.02, 'unit'), faces(M.deskWood, { pz: M.drawer }), [(x0 + px0) / 2 + 0.02, top - 0.09, z1 - 0.03]);
  B.box(x0 + 0.04, 0.3, z0 + 0.02, px0, top - 0.04, z0 + 0.05, M.deskWood);
  colliders.push({ type: 'box', x0: N.x0, z0: 0, x1: N.x1, z1 });
  blob(B, M, x0, z0, x1, z1);
  return top;
}

function computer(B, M, top) {
  // PC case on the left end, glass front with RGB fans and a blue LED strip
  const cx0 = N.x0 + 0.07, cx1 = cx0 + 0.24, cz0 = 0.12, cz1 = 0.58;
  B.add(boxGeo(cx1 - cx0, 0.52, cz1 - cz0, 'unit'), faces(M.pcBody, { pz: M.pcFront }), [(cx0 + cx1) / 2, top + 0.26, (cz0 + cz1) / 2]);
  B.rod([cx1 - 0.04, top + 0.52, 0.2], [cx1 - 0.04, top + 0.66, 0.2], 0.006, M.blackPlastic);
  // monitor
  const mx = 4.05, mz = 0.24;
  B.box(mx - 0.13, top, mz - 0.09, mx + 0.13, top + 0.012, mz + 0.09, M.blackPlastic);
  B.box(mx - 0.025, top, mz - 0.03, mx + 0.025, top + 0.34, mz, M.blackPlastic);
  B.box(mx - 0.32, top + 0.2, mz, mx + 0.32, top + 0.585, mz + 0.03, M.blackPlastic);
  const sw = 0.30, sh = 0.18, sy = top + 0.3925, szf = mz + 0.0305;
  B.add(quadGeo([mx - sw, sy - sh, szf], [mx + sw, sy - sh, szf], [mx + sw, sy + sh, szf], [mx - sw, sy + sh, szf]),
    M.monitorScreen, [0, 0, 0], [0, 0, 0], { cast: false });
  // speakers
  for (const sx of [3.66, 4.47]) {
    B.box(sx - 0.06, top, 0.13, sx + 0.06, top + 0.2, 0.28, M.blackPlastic);
    const cone = new THREE.CylinderGeometry(0.035, 0.035, 0.004, 14);
    cone.rotateX(Math.PI / 2);
    B.add(cone, M.darkSteel, [sx, top + 0.08, 0.282], [0, 0, 0], { cast: false });
  }
  // desk mat, keyboard and mouse
  B.add(boxGeo(1.05, 0.004, 0.4, 'unit'), faces(M.blackPlastic, { py: M.deskMat }), [4.12, top + 0.002, 0.5], [0, 0, 0], { cast: false });
  B.add(boxGeo(0.44, 0.024, 0.14, 'unit'), faces(M.blackPlastic, { py: M.keyboard }), [3.98, top + 0.016, 0.52], [0, 0.03, 0]);
  B.add(roundedBoxGeo(0.065, 0.035, 0.11, 0.02), M.blackPlastic, [4.38, top + 0.022, 0.53]);
  B.box(4.372, top + 0.03, 0.49, 4.388, top + 0.041, 0.505, M.ledStripCool, { cast: false });
  // microphone on a boom arm
  const bx = N.x1 - 0.12;
  B.box(bx - 0.03, top, 0.05, bx + 0.03, top + 0.05, 0.11, M.blackPlastic);
  B.rod([bx, top + 0.05, 0.08], [bx, top + 0.42, 0.1], 0.011, M.blackPlastic);
  B.rod([bx, top + 0.42, 0.1], [bx - 0.26, top + 0.56, 0.22], 0.011, M.blackPlastic);
  B.rod([bx - 0.26, top + 0.56, 0.22], [bx - 0.4, top + 0.46, 0.3], 0.011, M.blackPlastic);
  B.rod([bx - 0.4, top + 0.46, 0.3], [bx - 0.47, top + 0.41, 0.35], 0.022, M.blackPlastic);
  return { monitor: [mx, sy, szf + 0.25], pc: [cx1 + 0.05, top + 0.25, cz1 + 0.05] };
}

// White cantilever office chair with a colourful cushion; built facing -Z.
function officeChair(B, M) {
  const W = M.officeWhite, r = 0.014;
  for (const sx of [-0.22, 0.22]) {
    B.rod([sx, 0.02, -0.26], [sx, 0.02, 0.28], r, W);
    B.rod([sx, 0.02, -0.26], [sx * 0.9, 0.44, -0.16], r, W);
    B.rod([sx, 0.02, 0.28], [sx * 0.9, 0.44, 0.17], r, W);      // rear legs up to the seat
    B.rod([sx * 0.95, 0.46, 0.12], [sx * 1.05, 0.66, 0.08], r, W);
    B.rod([sx * 1.05, 0.66, 0.08], [sx * 1.05, 0.66, -0.16], r, W);
    B.add(roundedBoxGeo(0.05, 0.03, 0.24, 0.012), W, [sx * 1.05, 0.675, -0.04]);
  }
  B.rod([-0.22, 0.02, 0.28], [0.22, 0.02, 0.28], r, W);
  B.rod([-0.2, 0.43, 0.17], [0.2, 0.43, 0.17], r, W);
  B.add(roundedBoxGeo(0.48, 0.07, 0.46, 0.03), W, [0, 0.45, 0]);
  B.add(roundedBoxGeo(0.44, 0.045, 0.42, 0.02, 2), M.cushion, [0, 0.5, -0.01], [0.04, 0.05, 0.02]);
  B.add(roundedBoxGeo(0.46, 0.56, 0.06, 0.04), W, [0, 0.82, 0.25], [-0.14, 0, 0]);
  B.add(roundedBoxGeo(0.38, 0.44, 0.02, 0.01), M.officeMesh, [0, 0.83, 0.215], [-0.14, 0, 0]);
  B.rod([0, 0.48, 0.2], [0, 0.6, 0.24], 0.02, W);
}

// Wall bars (0.70 wide) with a pull-up module on the east wall (photo 1, 2, 4).
function swedishWall(B, M, colliders) {
  const x = C.HALL.x1, H = 2.42;
  const z0 = C.WALL_BARS.z0 + 0.03, z1 = C.WALL_BARS.z1 - 0.03;     // post centres
  for (const z of [z0, z1]) {
    B.box(x - 0.14, 0, z - 0.03, x - 0.08, H, z + 0.03, M.swedishWhite);
    for (const y of [0.25, 1.2, 2.2]) B.box(x - 0.08, y, z - 0.025, x, y + 0.06, z + 0.025, M.swedishWhite);
  }
  for (let y = 0.15; y < H - 0.1; y += 0.25) B.rod([x - 0.11, y, z0], [x - 0.11, y, z1], 0.016, M.swedishRung);
  // pull-up module
  for (const z of [z0, z1]) {
    B.box(x - 0.62, H - 0.08, z - 0.02, x - 0.08, H - 0.02, z + 0.02, M.swedishWhite);
    B.rod([x - 0.12, H - 0.5, z], [x - 0.4, H - 0.08, z], 0.014, M.swedishWhite);
  }
  B.rod([x - 0.6, H - 0.05, z0 - 0.15], [x - 0.6, H - 0.05, z1 + 0.15], 0.016, M.swedishRung);
  B.box(x - 0.62, H - 0.02, z0 - 0.03, x - 0.56, H + 0.02, z1 + 0.03, M.swedishWhite);
  // two resistance bands hanging from a rung
  const zm = (z0 + z1) / 2;
  for (const [z, mat] of [[zm - 0.08, M.swedishRung], [zm + 0.07, M.bandPurple]]) {
    B.box(x - 0.13, 0.95, z - 0.015, x - 0.12, 1.43, z + 0.015, mat, { cast: false });
    B.box(x - 0.16, 0.95, z - 0.015, x - 0.15, 1.43, z + 0.015, mat, { cast: false });
  }
  colliders.push({ type: 'box', x0: x - 0.16, z0: C.WALL_BARS.z0, x1: x, z1: C.WALL_BARS.z1 });
  blob(B, M, x - 0.16, C.WALL_BARS.z0, x, C.WALL_BARS.z1);
}

// Rolled two-layer yoga mat standing on its end: dark outside, orange inside (photo 2).
function yogaMat(B, M, colliders) {
  const x = C.HALL.x1 - 0.22, z = C.WALL_BARS.z1 + 0.32, h = 0.93, R = 0.15;
  B.cyl(x, z, 0, h, R, M.bin, 20);
  const rings = [[R, 0.13, M.bin], [0.13, 0.112, M.binInside], [0.112, 0.094, M.bin], [0.094, 0.078, M.binInside]];
  for (const [r0, r1, mat] of rings) {
    const g = new THREE.RingGeometry(r1, r0, 24);
    g.rotateX(-Math.PI / 2);
    B.add(g, mat, [x, h + 0.001, z], [0, 0, 0], { cast: false });
  }
  B.cyl(x, z, h - 0.25, h + 0.0005, 0.078, M.blackPlastic, 16, { cast: false });
  colliders.push({ type: 'circle', x, z, r: R + 0.02 });
  blob(B, M, x - R, z - R, x + R, z + R);
}

export function buildHall(B, M, colliders) {
  const top = desk(B, M, colliders);
  const fx = computer(B, M, top);
  // Klimt print above the desk
  B.add(boxGeo(0.4, 0.56, 0.022, 'unit'), faces(M.canvasSide, { pz: M.paintingKlimt }), [4.25, 1.84, 0.012]);
  const chair = { x: 4.02, z: 1.12, rot: 0.18 };
  B.at(chair.x, 0, chair.z, chair.rot, () => officeChair(B, M));
  colliders.push({ type: 'circle', x: chair.x, z: chair.z, r: 0.3 });
  blob(B, M, chair.x - 0.26, chair.z - 0.26, chair.x + 0.26, chair.z + 0.3);
  swedishWall(B, M, colliders);
  yogaMat(B, M, colliders);
  return fx;
}
