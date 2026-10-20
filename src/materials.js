import * as THREE from 'three';
import * as T from './textures.js';
import * as IMG from './generated/images.js';

export const shared = {
  time: { value: 0 },
  starIntensity: { value: 2.6 },
};

let ramp;
export function toon(params = {}) {
  ramp ??= T.toonRamp();
  return new THREE.MeshToonMaterial({ gradientMap: ramp, ...params });
}

// Emissive stars painted over the wall, each twinkling with its own phase.
function starWall(base, seed) {
  const m = toon({ map: T.plaster(base, seed) });
  const stars = T.starField(seed + 100);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.time;
    sh.uniforms.uStars = { value: stars };
    sh.uniforms.uStarIntensity = shared.starIntensity;
    sh.uniforms.uStarColor = { value: new THREE.Color('#ffe2b0') };
    sh.uniforms.uStarRepeat = { value: stars.repeat.x };
    sh.vertexShader = sh.vertexShader
      .replace('#include <uv_pars_vertex>', '#include <uv_pars_vertex>\nvarying vec2 vStarUv;\nuniform float uStarRepeat;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvStarUv = uv * uStarRepeat;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <emissivemap_pars_fragment>', `#include <emissivemap_pars_fragment>
        varying vec2 vStarUv;
        uniform sampler2D uStars;
        uniform float uTime;
        uniform float uStarIntensity;
        uniform vec3 uStarColor;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          vec4 st = texture2D(uStars, vStarUv);
          float tw = 0.55 + 0.45 * sin(uTime * (0.6 + st.b * 2.2) + st.g * 6.2831);
          totalEmissiveRadiance += uStarColor * (st.r * st.r) * tw * uStarIntensity;
        }`);
  };
  m.customProgramCacheKey = () => 'starwall';
  return m;
}

function imageTexture(dataUri) {
  const t = new THREE.TextureLoader().load(dataUri);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const emissiveMat = (map, color = '#ffffff', intensity = 1) =>
  new THREE.MeshBasicMaterial({ map, color: new THREE.Color(color).multiplyScalar(intensity) });

function shadeMat(alphaMap, opacity, color = '#140a24') {
  return new THREE.MeshBasicMaterial({
    color, alphaMap, transparent: true, opacity, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}

export function createMaterials() {
  const doorTex = T.doorFront();
  const fade = T.linearFade();
  const ovenTex = T.ovenFront();
  const kbTex = T.keyboard();
  const pcTex = T.pcFront();
  const M = {
    wall: starWall('#dcc4d8', 1),
    wallPlain: toon({ map: T.plaster('#dcc4d8', 2) }),
    ceiling: toon({ color: '#f4eef2' }),
    floor: toon({ map: T.laminate() }),
    baseboard: toon({ color: '#ece4dc' }),
    cornice: toon({ color: '#f7f2ee' }),

    doorWood: toon({ map: T.woodGrain([24, 52, 40], 61, 0.8) }),
    doorLeaf: toon({ map: doorTex }),
    glassPanel: toon({ map: T.glassPanel(), emissive: '#1b2a18', emissiveIntensity: 0.25 }),
    brass: toon({ color: '#d9ad55' }),
    whitePaint: toon({ color: '#f4f1ec' }),
    windowFrame: toon({ color: '#f2f0ec' }),
    windowGlass: new THREE.MeshBasicMaterial({ color: '#9fb6ff', transparent: true, opacity: 0.12, depthWrite: false }),
    sky: new THREE.MeshBasicMaterial({ map: T.nightSky(), fog: false }),
    curtain: toon({ map: T.curtainFabric(), side: THREE.DoubleSide }),
    radiator: toon({ color: '#e9e6e0' }),

    cherry: toon({ map: T.woodGrain([16, 42, 24], 71, 0.7) }),
    cabinetDoor: toon({ map: T.cabinetFront({ base: [16, 42, 25] }) }),
    cabinetDoorL: toon({ map: T.cabinetFront({ base: [16, 42, 25], knob: 'left' }) }),
    upperDoor: toon({ map: T.cabinetFront({ base: [16, 42, 25], arch: true, h: 448 }) }),
    upperGlass: toon({ map: T.cabinetFront({ base: [16, 42, 25], arch: true, glass: true, h: 448, knob: 'left' }) }),
    drawer: toon({ map: T.cabinetFront({ base: [16, 40, 20], w: 384, h: 160, knob: 'center' }) }),
    countertop: toon({ map: T.speckle() }),
    mosaic: toon({ map: T.mosaic() }),
    hob: toon({ map: T.hobTop() }),
    oven: toon({ map: ovenTex, emissiveMap: ovenTex, emissive: '#2a5', emissiveIntensity: 0.15 }),
    steel: toon({ color: '#b9bec8' }),
    chrome: toon({ color: '#eef2fb', emissive: '#30304a', emissiveIntensity: 0.4 }),
    darkSteel: toon({ color: '#3a3d46' }),
    fridgeBody: toon({ color: '#efe9dc' }),
    fridgeDoor: toon({ map: T.fridgeFront() }),
    blackPlastic: toon({ color: '#1b1b20' }),
    tvScreen: new THREE.MeshBasicMaterial({ map: T.tvScreen() }),
    acBody: toon({ color: '#f3f3f1' }),

    tableWood: toon({ map: T.woodGrain([20, 55, 34], 81, 0.6) }),
    tablecloth: toon({ map: T.roses() }),
    chairFabric: toon({ color: '#efe3cc' }),

    sofa: toon({ map: T.velvet([174, 40, 30]) }),
    sofaDark: toon({ map: T.velvet([174, 38, 24], 18) }),
    sofaLeg: toon({ color: '#6b3d22' }),
    pillowChevron: toon({ map: T.chevron() }),
    pillowColor: toon({ map: T.patchwork() }),

    frameSilver: toon({ color: '#b8b6bd' }),
    frameDark: toon({ color: '#2d2418' }),
    canvasSide: toon({ color: '#e8e2d6' }),
    paintingSofa: toon({ map: imageTexture(IMG.sofa_painting), emissive: '#2a1d10', emissiveIntensity: 0.15 }),
    paintingLeopard: toon({ map: imageTexture(IMG.leopard) }),
    paintingKlimt: toon({ map: imageTexture(IMG.klimt) }),

    deskWood: toon({ map: T.woodGrain([18, 42, 18], 91, 0.9) }),
    deskMat: toon({ map: T.deskMat() }),
    keyboard: toon({ map: kbTex, emissiveMap: kbTex, emissive: '#ffffff', emissiveIntensity: 1.4 }),
    monitorScreen: emissiveMat(T.monitorScreen(), '#ffffff', 0.85),
    pcBody: toon({ color: '#e9eaee' }),
    pcFront: toon({ map: pcTex, emissiveMap: pcTex, emissive: '#ffffff', emissiveIntensity: 1.6 }),
    officeWhite: toon({ color: '#f1f0f0' }),
    officeMesh: toon({ color: '#d9d8de' }),
    cushion: toon({ map: T.patchwork(97, ['#e64a3c', '#2f6fd6', '#f4c542', '#38b46a', '#1c1c1c', '#f08a2c']) }),

    swedishWhite: toon({ color: '#f6f6f4' }),
    swedishRung: toon({ color: '#2b2c30' }),
    bin: toon({ color: '#2c2a30' }),
    binInside: toon({ color: '#e0662b' }),
    pinkVase: toon({ color: '#f0a7b8' }),
    shelfGlass: new THREE.MeshBasicMaterial({ color: '#e8f2ff', transparent: true, opacity: 0.35, depthWrite: false }),

    lampShade: toon({ color: '#f08a8a', side: THREE.DoubleSide }),
    lampInner: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a8').multiplyScalar(0.8), side: THREE.BackSide }),
    bulb: new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff1d6').multiplyScalar(4) }),
    spotGlow: new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4e0').multiplyScalar(5) }),
    cord: toon({ color: '#2a2230' }),
    ledStrip: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc58a').multiplyScalar(3) }),
    ledStripCool: new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff4fd8').multiplyScalar(2) }),
    bandPurple: toon({ color: '#5a3d7a' }),

    aoFloor: shadeMat(fade, 0.55),
    aoWall: shadeMat(fade, 0.45),
    aoCeil: shadeMat(fade, 0.35),
    blobShadow: shadeMat(T.softRect(), 0.6),

    corridorWall: new THREE.MeshBasicMaterial({ color: '#1a1326' }),
    corridorFloor: new THREE.MeshBasicMaterial({ color: '#130d1c' }),
    corridorDoor: new THREE.MeshBasicMaterial({ map: doorTex, color: '#2a1f30' }),
  };
  return M;
}
