import * as THREE from 'three';
import * as C from '../config.js';

// MiSide-like night lighting: violet ambient, warm lamps, cold moonlight through the window,
// small coloured accents from the PC and the monitor.

const WARM = '#ffb36e';
const WARM_SPOT = '#ffc994';

function spot(scene, color, intensity, pos, target, angle, penumbra, distance) {
  const l = new THREE.SpotLight(color, intensity, distance, angle, penumbra, 2);
  l.position.set(...pos);
  l.target.position.set(...target);
  scene.add(l, l.target);
  return l;
}

function point(scene, color, intensity, pos, distance) {
  const l = new THREE.PointLight(color, intensity, distance, 2);
  l.position.set(...pos);
  scene.add(l);
  return l;
}

// MiSide-style cone pendant lamp; returns the bulb position.
function pendant(B, M, x, z, drop = 0.52) {
  const y = C.CEILING - drop;
  B.cyl(x, z, C.CEILING - 0.02, C.CEILING, 0.06, M.cord, 12, { cast: false });
  B.cyl(x, z, y + 0.2, C.CEILING, 0.006, M.cord, 6, { cast: false });
  const shade = new THREE.CylinderGeometry(0.065, 0.19, 0.24, 20, 1, true);
  B.add(shade, M.lampShade, [x, y + 0.08, z], [0, 0, 0], { cast: false });
  B.add(shade.clone(), M.lampInner, [x, y + 0.08, z], [0, 0, 0], { cast: false });
  B.cyl(x, z, y + 0.2, y + 0.24, 0.07, M.lampShade, 16, { cast: false });
  const bulb = new THREE.SphereGeometry(0.055, 14, 10);
  B.add(bulb, M.bulb, [x, y + 0.02, z], [0, 0, 0], { cast: false });
  return [x, y - 0.02, z];
}

// Recessed spot in a soffit: emissive disc with a thin metal ring.
function downlight(B, M, x, z, y = C.SOFFIT_BOTTOM) {
  B.cyl(x, z, y - 0.006, y, 0.05, M.steel, 16, { cast: false });
  B.cyl(x, z, y - 0.009, y - 0.006, 0.036, M.spotGlow, 16, { cast: false });
}

export function buildLighting(scene, B, M, fx, quality) {
  // `minor` lights are switched off on the lowest quality setting
  const lights = { shadowed: [], minor: [] };

  const hemi = new THREE.HemisphereLight('#8a70ff', '#4a2f6e', 1.15);
  scene.add(hemi);

  // moonlight through the window, casting the frame pattern onto the floor
  const W = C.OPENINGS.window;
  const moon = spot(scene, '#9fb8ff', 85, [-2.4, 3.55, 4.62], [2.4, 0, 4.85], 0.42, 0.55, 0);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.near = 1;
  moon.shadow.camera.far = 12;
  moon.shadow.bias = -0.0004;
  moon.shadow.normalBias = 0.02;
  lights.shadowed.push(moon);
  lights.moon = moon;

  // ceiling pendants
  const hallBulb = pendant(B, M, 5.0, 1.95);
  const livBulb = pendant(B, M, 2.05, 4.75);
  // the cone shades send the light down, leaving the ceiling in violet dusk
  for (const p of [hallBulb, livBulb]) {
    const l = spot(scene, WARM, 8, p, [p[0], 0, p[2]], 1.4, 0.75, 9);
    l.castShadow = true;
    l.shadow.mapSize.set(1024, 1024);
    l.shadow.bias = -0.0015;
    l.shadow.normalBias = 0.03;
    l.shadow.camera.near = 0.1;
    lights.shadowed.push(l);
    lights.minor.push(point(scene, '#ffb98a', 0.25, [p[0], p[1] + 0.12, p[2]], 1.2));
  }

  // three spots in the niche soffit, washing the back wall (scallops like in photo 1)
  for (const x of [3.62, 4.08, 4.54]) {
    downlight(B, M, x, 0.42);
    spot(scene, WARM_SPOT, 3.2, [x, C.SOFFIT_BOTTOM - 0.02, 0.42], [x, 0.8, 0.02], 0.62, 0.65, 4);
  }
  // two spots in the band over the kitchen opening
  for (const x of [3.25, 4.2]) {
    downlight(B, M, x, (C.SOFFIT_BAND.z0 + C.SOFFIT_BAND.z1) / 2);
    spot(scene, WARM_SPOT, 2.4, [x, C.SOFFIT_BOTTOM - 0.02, 3.3], [x, 0, 3.4], 0.75, 0.7, 4.5);
  }

  // picture lights
  spot(scene, '#ffd29a', 2.6, fx.sofaLamp.pos, fx.sofaLamp.target, 0.75, 0.8, 2.6);
  spot(scene, '#ffd29a', 1.8, fx.leopardLamp.pos, fx.leopardLamp.target, 0.75, 0.8, 2.2);

  // warm LED strip under the kitchen cabinets
  point(scene, '#ffbf7a', 1.6, fx.underCabinet, 2.6);

  // screen glow and RGB from the PC
  point(scene, '#a9b8ff', 0.9, fx.monitor, 2.2);
  point(scene, '#7a5cff', 0.9, fx.pc, 1.4);
  lights.minor.push(point(scene, '#3dc5ff', 0.5, [fx.pc[0] - 0.1, fx.pc[1] - 0.15, fx.pc[2]], 1.0));

  lights.hemi = hemi;
  return lights;
}
