import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Box UVs in meters (so tiled textures keep their real-world scale), or 0..1 per face.
// BoxGeometry face order: +x, -x, +y, -y, +z, -z (4 vertices each).
function scaleBoxUV(geo, w, h, d) {
  const uv = geo.attributes.uv;
  const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = sizes[f];
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * su, uv.getY(k) * sv);
    }
  }
  return geo;
}

export function boxGeo(w, h, d, uvMode = 'meter') {
  const g = new THREE.BoxGeometry(w, h, d);
  return uvMode === 'meter' ? scaleBoxUV(g, w, h, d) : g;
}

export function roundedBoxGeo(w, h, d, radius, segments = 2) {
  const r = Math.min(radius, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3);
  return new RoundedBoxGeometry(w, h, d, segments, r);
}

// Extrudes a 2D shape (in the XY plane) and returns it with meter UVs on the caps.
export function extrudeGeo(shape, depth, opts = {}) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, ...opts });
}

// Collects static meshes and merges them per material to keep the draw-call count low.
export class Builder {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    this.root.name = 'static';
    scene.add(this.root);
    this.staticItems = [];
    this.xf = null;
  }

  // Runs fn with an extra placement (translation + rotation around Y) applied to every add().
  at(x, y, z, rotY, fn) {
    const prev = this.xf;
    const m = new THREE.Matrix4().makeRotationY(rotY).setPosition(x, y, z);
    this.xf = prev ? prev.clone().multiply(m) : m;
    try { fn(); } finally { this.xf = prev; }
  }

  // Adds a mesh that will be merged into the static batch.
  add(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], opts = {}) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    if (this.xf) {
      mesh.updateMatrix();
      mesh.matrix.premultiply(this.xf);
      mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
    }
    mesh.castShadow = opts.cast ?? true;
    mesh.receiveShadow = opts.receive ?? true;
    if (opts.layer) mesh.layers.set(opts.layer);
    if (opts.parent) {
      opts.parent.add(mesh);
      return mesh;
    }
    if (opts.dynamic) {
      this.root.add(mesh);
      return mesh;
    }
    this.staticItems.push(mesh);
    return mesh;
  }

  // Axis-aligned box from min/max corners.
  box(x0, y0, z0, x1, y1, z1, material, opts = {}) {
    const w = x1 - x0, h = y1 - y0, d = z1 - z0;
    return this.add(boxGeo(w, h, d, opts.uv), material,
      [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], [0, 0, 0], opts);
  }

  // Box given by its size, center and rotation around Y.
  boxAt(w, h, d, x, y, z, rotY, material, opts = {}) {
    return this.add(boxGeo(w, h, d, opts.uv), material, [x, y, z], [0, rotY, 0], opts);
  }

  // Cylinder between two heights at (x, z).
  cyl(x, z, y0, y1, r, material, segs = 10, opts = {}) {
    const g = new THREE.CylinderGeometry(opts.rTop ?? r, r, y1 - y0, segs);
    return this.add(g, material, [x, (y0 + y1) / 2, z], [0, opts.rotY ?? 0, 0], opts);
  }

  // Cylinder (rod) between two arbitrary points.
  rod(a, b, r, material, segs = 8, opts = {}) {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const g = new THREE.CylinderGeometry(r, r, va.distanceTo(vb), segs);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    g.applyQuaternion(q);
    const mid = va.add(vb).multiplyScalar(0.5);
    g.translate(mid.x, mid.y, mid.z);
    return this.add(g, material, [0, 0, 0], [0, 0, 0], opts);
  }

  // Merges all collected static meshes per (material, shadow flags, layer).
  finalize() {
    const buckets = new Map();
    for (const mesh of this.staticItems) {
      mesh.updateMatrixWorld(true);
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      let geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      geo.applyMatrix4(mesh.matrixWorld);
      for (const name of Object.keys(geo.attributes)) {
        if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
      }
      const parts = [];
      if (Array.isArray(mesh.material) && geo.groups.length) {
        for (const g of geo.groups) {
          const sub = new THREE.BufferGeometry();
          for (const name of Object.keys(geo.attributes)) {
            const a = geo.attributes[name];
            sub.setAttribute(name, new THREE.BufferAttribute(
              a.array.slice(g.start * a.itemSize, (g.start + g.count) * a.itemSize), a.itemSize));
          }
          parts.push([sub, mats[g.materialIndex]]);
        }
      } else {
        geo.clearGroups();
        parts.push([geo, mats[0]]);
      }
      for (const [g, m] of parts) {
        if (!m) continue;
        const key = `${m.uuid}|${mesh.castShadow}|${mesh.receiveShadow}|${mesh.layers.mask}`;
        if (!buckets.has(key)) buckets.set(key, { m, cast: mesh.castShadow, receive: mesh.receiveShadow, mask: mesh.layers.mask, geos: [] });
        buckets.get(key).geos.push(g);
      }
      mesh.geometry.dispose();
    }
    for (const b of buckets.values()) {
      const merged = mergeGeometries(b.geos, false);
      b.geos.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, b.m);
      mesh.castShadow = b.cast;
      mesh.receiveShadow = b.receive;
      mesh.layers.mask = b.mask;
      mesh.matrixAutoUpdate = false;
      this.root.add(mesh);
    }
    this.staticItems = [];
    return buckets.size;
  }
}
