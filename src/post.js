import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// Render pipeline:
//   scene (HDR, MSAA) ─┐
//   normals + depth ───┴─> outline composite ─> bloom ─> tone mapping ─> grading/vignette
// Outlines come from depth and normal discontinuities, like the thin ink lines in MiSide.

const OutlineShader = {
  uniforms: {
    tColor: { value: null },
    tNormal: { value: null },
    tDepth: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
    cameraNear: { value: 0.05 },
    cameraFar: { value: 60 },
    outlineColor: { value: new THREE.Color('#2a1838') },
    strength: { value: 0.75 },
    enabled: { value: 1 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    #include <packing>
    uniform sampler2D tColor, tNormal, tDepth;
    uniform vec2 resolution;
    uniform float cameraNear, cameraFar, strength, enabled;
    uniform vec3 outlineColor;
    varying vec2 vUv;
    float lin(vec2 uv) {
      float d = texture2D(tDepth, uv).x;
      return perspectiveDepthToViewZ(d, cameraNear, cameraFar) * -1.0;
    }
    vec3 nrm(vec2 uv) { return texture2D(tNormal, uv).xyz * 2.0 - 1.0; }
    void main() {
      vec4 col = texture2D(tColor, vUv);
      if (enabled < 0.5) { gl_FragColor = col; return; }
      vec2 px = 1.0 / resolution;
      float dc = lin(vUv);
      vec3 nc = nrm(vUv);
      vec2 ox = vec2(px.x, 0.0), oy = vec2(0.0, px.y);
      // positive Laplacian: zero on flat or sloped planes, only the nearer side of a step draws
      float de = max(0.0, lin(vUv + ox) + lin(vUv - ox) - 2.0 * dc)
               + max(0.0, lin(vUv + oy) + lin(vUv - oy) - 2.0 * dc);
      float ne = 0.0;
      ne += 1.0 - dot(nc, nrm(vUv + ox));
      ne += 1.0 - dot(nc, nrm(vUv - ox));
      ne += 1.0 - dot(nc, nrm(vUv + oy));
      ne += 1.0 - dot(nc, nrm(vUv - oy));
      float depthEdge = smoothstep(0.035, 0.09, de / max(dc, 0.3));
      float normalEdge = smoothstep(0.35, 0.8, ne);
      float edge = max(depthEdge, normalEdge * 0.75);
      edge *= 1.0 - smoothstep(4.0, 9.0, dc);   // fade lines out with distance
      vec3 inked = mix(col.rgb, col.rgb * outlineColor * 2.2, edge * strength);
      gl_FragColor = vec4(inked, col.a);
    }`,
};

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    vignette: { value: 0.32 },
    lift: { value: new THREE.Color('#1c0f2e') },
  },
  vertexShader: OutlineShader.vertexShader,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float time, vignette;
    uniform vec3 lift;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      // lift the shadows towards violet and add a touch of saturation
      c = c + lift * (1.0 - c) * 0.35;
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(vec3(l), c, 1.12);
      vec2 q = vUv - 0.5;
      c *= 1.0 - vignette * smoothstep(0.25, 0.85, dot(q, q) * 2.2);
      c += (hash(vUv * 1000.0 + time) - 0.5) * 0.012;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export class PostFX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.quality = 'high';

    this.sceneRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.normalRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    this.normalRT.depthTexture = new THREE.DepthTexture(1, 1);
    this.normalMat = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });

    this.composer = new EffectComposer(renderer);
    this.outline = new ShaderPass(OutlineShader, 'none');
    this.outline.uniforms.tColor.value = this.sceneRT.texture;
    this.outline.uniforms.tNormal.value = this.normalRT.texture;
    this.outline.uniforms.tDepth.value = this.normalRT.depthTexture;
    this.composer.addPass(this.outline);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.42, 0.5, 1.0);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
  }

  setQuality(q) {
    this.quality = q;
    this.outline.uniforms.enabled.value = q === 'high' ? 1 : 0;
    this.bloom.enabled = q !== 'low';
    const samples = q === 'high' ? 4 : 0;
    if (this.sceneRT.samples !== samples) {
      this.sceneRT.samples = samples;
      this.sceneRT.dispose();
    }
  }

  setSize(w, h, pr) {
    const W = Math.floor(w * pr), H = Math.floor(h * pr);
    this.sceneRT.setSize(W, H);
    this.normalRT.setSize(W, H);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.outline.uniforms.resolution.value.set(W, H);
  }

  render(t) {
    const { renderer, scene, camera } = this;
    this.outline.uniforms.cameraNear.value = camera.near;
    this.outline.uniforms.cameraFar.value = camera.far;
    this.grade.uniforms.time.value = t % 100;

    camera.layers.enableAll();
    renderer.setRenderTarget(this.sceneRT);
    renderer.clear();
    renderer.render(scene, camera);

    if (this.quality === 'high') {
      // normals of solid geometry only (effects and glass live on layer 1)
      camera.layers.set(0);
      scene.overrideMaterial = this.normalMat;
      const bg = scene.background;
      scene.background = null;
      renderer.setRenderTarget(this.normalRT);
      renderer.setClearColor(0x8080ff, 1);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setClearColor(0x000000, 1);
      scene.background = bg;
      scene.overrideMaterial = null;
      camera.layers.enableAll();
    }
    renderer.setRenderTarget(null);
    this.composer.render();
  }
}
