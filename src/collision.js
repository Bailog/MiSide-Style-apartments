// Simple top-down collision: the player is a circle, the world is made of
// wall segments, axis-aligned boxes and circles. Overlaps are pushed out along
// the shortest direction, which makes the player slide along walls.

function closestOnSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  let t = len2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return [ax + dx * t, az + dz * t];
}

export class Collision {
  constructor() {
    this.segments = [];
    this.boxes = [];
    this.circles = [];
  }

  addSegment(a, b) { this.segments.push([a[0], a[1], b[0], b[1]]); }

  // Closed polyline, e.g. the outline of the walkable area.
  addPolyline(points, closed = true) {
    if (closed) this.bounds = points;
    const n = points.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) this.addSegment(points[i], points[(i + 1) % n]);
  }

  add(c) {
    if (c.type === 'box') this.boxes.push(c);
    else if (c.type === 'circle') this.circles.push(c);
    else if (c.type === 'segment') this.addSegment(c.a, c.b);
  }

  // Pushes position {x, z} out of every collider; returns true if anything was hit.
  resolve(p, r) {
    let hit = false;
    for (let iter = 0; iter < 4; iter++) {
      let moved = false;
      for (const [ax, az, bx, bz] of this.segments) {
        const [cx, cz] = closestOnSegment(p.x, p.z, ax, az, bx, bz);
        moved = this.#push(p, cx, cz, r) || moved;
      }
      for (const b of this.boxes) {
        const inside = p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1;
        if (inside) {
          // center ended up inside a box (e.g. after a teleport): leave through the
          // nearest side that is still inside the walkable area
          const exits = [
            [p.x - b.x0, b.x0 - r, p.z], [b.x1 - p.x, b.x1 + r, p.z],
            [p.z - b.z0, p.x, b.z0 - r], [b.z1 - p.z, p.x, b.z1 + r],
          ].sort((u, v) => u[0] - v[0]);
          const ok = exits.find(([, x, z]) => this.contains(x, z)) ?? exits[0];
          p.x = ok[1]; p.z = ok[2];
          moved = true;
          continue;
        }
        const cx = Math.max(b.x0, Math.min(p.x, b.x1));
        const cz = Math.max(b.z0, Math.min(p.z, b.z1));
        moved = this.#push(p, cx, cz, r) || moved;
      }
      for (const c of this.circles) {
        const dx = p.x - c.x, dz = p.z - c.z;
        const d = Math.hypot(dx, dz), min = r + c.r;
        if (d < min && d > 1e-6) {
          p.x = c.x + (dx / d) * min;
          p.z = c.z + (dz / d) * min;
          moved = true;
        }
      }
      hit = hit || moved;
      if (!moved) break;
    }
    return hit;
  }

  // Point-in-polygon test against the outline (true if no outline was set).
  contains(x, z) {
    const P = this.bounds;
    if (!P) return true;
    let inside = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, zi] = P[i], [xj, zj] = P[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  }

  #push(p, cx, cz, r) {
    const dx = p.x - cx, dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return false;
    const d = Math.sqrt(d2);
    if (d < 1e-6) return false;
    const k = (r - d) / d;
    p.x += dx * k;
    p.z += dz * k;
    return true;
  }
}
