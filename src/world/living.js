import * as THREE from 'three';
import * as C from '../config.js';
import { boxGeo, roundedBoxGeo } from '../util/builder.js';
import { blob, onWall } from './common.js';

const faces = (base, o) => ['px', 'nx', 'py', 'ny', 'pz', 'nz'].map((k) => o[k] ?? base);

// Teal velvet sofa with rolled arms against the east wall, 2 x 1 x 1 m (photo 4).
function sofa(B, M, colliders) {
  const S = C.SOFA;
  const back = S.x1, front = S.x0, z0 = S.z0, z1 = S.z1;
  const arm = 0.24, depth = back - front;
  const zc = (z0 + z1) / 2;
  B.add(roundedBoxGeo(depth - 0.04, 0.2, z1 - z0 - 0.04, 0.04), M.sofaDark, [front + depth / 2, 0.2, zc]);
  // seat cushions
  const seatZ0 = z0 + arm, seatZ1 = z1 - arm, half = (seatZ1 - seatZ0) / 2;
  const seatD = depth - 0.3;
  for (let i = 0; i < 2; i++) {
    B.add(roundedBoxGeo(seatD, 0.18, half - 0.01, 0.06, 3), M.sofa,
      [front + seatD / 2 + 0.02, 0.39, seatZ0 + half * i + half / 2]);
  }
  // back rest at the same height as the arms
  const armTop = 0.74;
  B.add(roundedBoxGeo(0.24, armTop - 0.28, z1 - z0 - 0.3, 0.07, 3), M.sofaDark, [back - 0.13, 0.28 + (armTop - 0.28) / 2, zc]);
  // arms with a rolled top
  for (const za of [z0 + arm / 2, z1 - arm / 2]) {
    B.add(roundedBoxGeo(depth - 0.02, 0.5, arm, 0.05, 3), M.sofa, [front + depth / 2, 0.37, za]);
    const roll = new THREE.CylinderGeometry(0.14, 0.14, depth - 0.04, 14);
    roll.rotateZ(Math.PI / 2);
    B.add(roll, M.sofa, [front + depth / 2, 0.6, za]);
  }
  for (const [lx, lz] of [[front + 0.06, z0 + 0.06], [front + 0.06, z1 - 0.06], [back - 0.06, z0 + 0.06], [back - 0.06, z1 - 0.06]]) {
    B.cyl(lx, lz, 0, 0.11, 0.025, M.sofaLeg, 8, { rTop: 0.032 });
  }
  // pillows: two wide zig-zag ones leaning on the back, a colourful one in the corner
  const pillow = (x, y, z, rot, mat, w = 0.44, h = 0.42) => B.add(roundedBoxGeo(0.15, h, w, 0.06, 3), mat, [x, y, z], rot);
  pillow(back - 0.36, 0.66, seatZ0 + half / 2, [0.03, 0.04, -0.28], M.pillowChevron, half - 0.12, 0.46);
  pillow(back - 0.36, 0.66, seatZ0 + half * 1.5, [-0.03, -0.04, -0.26], M.pillowChevron, half - 0.12, 0.46);
  pillow(front + 0.36, 0.64, z0 + 0.4, [0.5, 0.3, -0.6], M.pillowColor);
  colliders.push({ type: 'box', x0: front, z0, x1: back, z1 });
  blob(B, M, front, z0, back, z1);
}

// Framed painting hanging on a wall; built facing +Z in local space, centered at (0, y, 0).
function painting(B, M, w, h, y, mat, frameMat, frame = 0.05, depth = 0.035) {
  B.add(boxGeo(w, h, 0.02, 'unit'), faces(M.canvasSide, { pz: mat }), [0, y, 0.012]);
  if (!frame) return;
  const f = frame, d = depth;
  B.box(-w / 2 - f, y - h / 2 - f, 0, w / 2 + f, y - h / 2, d, frameMat);
  B.box(-w / 2 - f, y + h / 2, 0, w / 2 + f, y + h / 2 + f, d, frameMat);
  B.box(-w / 2 - f, y - h / 2, 0, -w / 2, y + h / 2, d, frameMat);
  B.box(w / 2, y - h / 2, 0, w / 2 + f, y + h / 2, d, frameMat);
}

// Brass picture light: wall bracket and a horizontal tube lamp; local +Z faces the room.
function pictureLamp(B, M, y, width) {
  B.box(-0.03, y - 0.04, 0, 0.03, y + 0.04, 0.02, M.brass);
  B.rod([0, y, 0.01], [0, y + 0.02, 0.13], 0.008, M.brass);
  const tube = new THREE.CylinderGeometry(0.022, 0.022, width, 10);
  tube.rotateZ(Math.PI / 2);
  B.add(tube, M.brass, [0, y + 0.01, 0.15]);
  B.box(-width / 2 + 0.02, y - 0.012, 0.13, width / 2 - 0.02, y - 0.005, 0.17, M.spotGlow, { cast: false });
}

export function buildLiving(B, M, colliders) {
  sofa(B, M, colliders);
  const fixtures = {};
  // big dark painting above the sofa, with its picture light
  const wallX = C.LIVING.x1, pz = (C.SOFA.z0 + C.SOFA.z1) / 2;
  B.at(wallX, 0, pz, -Math.PI / 2, () => {
    painting(B, M, 1.6, 0.86, 1.8, M.paintingSofa, M.frameSilver, 0.045);
    pictureLamp(B, M, 2.36, 0.42);
  });
  fixtures.sofaLamp = { pos: [wallX - 0.15, 2.34, pz], target: [wallX, 1.65, pz] };
  // leopard on the diagonal wall
  const p = onWall(C.DIAGONAL.a, C.DIAGONAL.b, [3.2, 3.3], 0.5 * Math.hypot(C.DIAGONAL.b[0] - C.DIAGONAL.a[0], C.DIAGONAL.b[1] - C.DIAGONAL.a[1]));
  B.at(p.x, 0, p.z, p.rotY, () => {
    painting(B, M, 0.66, 0.46, 1.78, M.paintingLeopard, M.frameDark, 0.05, 0.04);
    pictureLamp(B, M, 2.2, 0.3);
  });
  const nx = Math.sin(p.rotY), nz = Math.cos(p.rotY);
  fixtures.leopardLamp = { pos: [p.x + nx * 0.16, 2.18, p.z + nz * 0.16], target: [p.x, 1.7, p.z] };
  return fixtures;
}
