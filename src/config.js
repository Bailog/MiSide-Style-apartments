// All dimensions are in meters.
// World axes: X = east (right on the scheme), Z = south (down on the scheme), Y = up.
// Origin: X = 0 is the window wall of the kitchen-living room,
//         Z = 0 is the back wall of the computer niche.
//
// Values marked "(scheme)" or "(photo)" come from the user's measurements;
// everything else is estimated from the photos and can be corrected here.

export const CEILING = 3.0;            // (photo 1, 6)
export const SOFFIT_BOTTOM = 2.5;      // soffit boxes are 0.5 m tall (photo 1, 6)
export const EYE_HEIGHT = 1.75;
export const PLAYER_RADIUS = 0.22;
export const WALK_SPEED = 1.35;        // m/s, calm walking pace

// Kitchen-living room (lower part of the scheme)
export const LIVING = {
  x0: 0, x1: 4.70,                     // 4.70 (scheme)
  z0: 3.30, z1: 6.20,                  // 2.90 (scheme)
};

// Hall with the computer niche (upper part of the scheme)
export const HALL = {
  x0: 3.17, x1: 6.68,                  // 3.51 (scheme)
  z0: 0, z1: LIVING.z0,                // 3.30 (scheme, read as full depth)
};

// Diagonal wall with the leopard painting, from the kitchen side to the hall side
export const DIAGONAL = { a: [2.40, LIVING.z0], b: [HALL.x0, 2.72] };

// Computer niche: 0.82 deep (scheme), lowered ceiling with three spots
export const NICHE = { x0: HALL.x0, x1: 4.98, z0: 0, z1: 0.82 };

// Pillar between the niche and the arch, with two decorative niches in it
export const PILLAR = { x0: NICHE.x1, x1: 5.38, z0: 0, z1: NICHE.z1 };

// Arch passage to the corridor (the 1.04 m box on the scheme)
export const ARCH = {
  x0: PILLAR.x1, x1: HALL.x1,          // opening width 1.30, the passage continues the east wall
  wallZ: NICHE.z1,                     // front face of the arch wall
  thickness: 0.30,
  spring: 2.05,                        // height where the round top starts
  corridorEnd: -1.90,                  // dead end of the (not photographed) corridor
};

// Lowered ceiling band over the opening between the kitchen and the hall
export const SOFFIT_BAND = { x0: DIAGONAL.a[0], x1: LIVING.x1, z0: 3.00, z1: 3.60 };

export const DOOR = { height: 2.16, leafWidth: 0.78, casing: 0.07 };

// Openings. "along" is measured along the wall from its start point.
export const OPENINGS = {
  // west wall of the hall, next to the computer niche (photo 1, 5, 6)
  hallWestDoor: { z0: 0.86, z1: 1.78 },
  // narrow dark stained-glass panel next to that door (photo 5, 6)
  glassPanel: { z0: 1.98, z1: 2.50, y0: 0.94, y1: 2.61 },
  // door in the south wall of the hall, near the passage to the kitchen (photo 2, 6)
  hallSouthDoor: { x0: 5.15, x1: 6.07 },
  // window in the end wall of the kitchen (photo 3)
  window: { z0: 4.20, z1: 5.40, y0: 0.90, y1: 2.55 },
};

export const WALL_THICKNESS = { inner: 0.14, outer: 0.45 };

export const KITCHEN = {
  counterTop: 0.85,                    // (photo 3)
  counterDepth: 0.60,                  // (photo 4)
  counterX1: LIVING.x1,
  upperY0: 1.45, upperY1: 2.35, upperDepth: 0.34,
  hob: { x0: 0.55, x1: 1.15 },
  sinkX: 3.25,
  bar: { x0: 3.15, x1: 3.65, z0: 4.62 },   // peninsula from the counter towards the room
  pole: [3.40, 4.80],
};

export const SOFA = { x0: 3.80, x1: LIVING.x1, z0: 3.42, z1: 5.52 };

export const START = { x: 3.55, z: 2.55, yaw: -0.75, pitch: -0.05 };
