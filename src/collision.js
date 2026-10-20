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
          // center ended up inside a box: leave through the nearest side
          const d = [p.x - b.x0, b.x1 - p.x, p.z - b.z0, b.z1 - p.z];
          const m = Math.min(...d);
          if (m === d[0]) p.x = b.x0 - r; else if (m === d[1]) p.x = b.x1 + r;
          else if (m === d[2]) p.z = b.z0 - r; else p.z = b.z1 + r;
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
