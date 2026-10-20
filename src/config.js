// All dimensions are in meters.
// World axes: X = east (right on the scheme), Z = south (down on the scheme), Y = up.
// Origin: X = 0 is the window wall of the kitchen-living room,
//         Z = 0 is the back wall of the computer niche.
//
// Values marked "(measured)" come from the user's measurements;
// everything else is estimated from the photos and can be corrected here.

export const CEILING = 3.0;            // (measured)
export const SOFFIT_BOTTOM = 2.5;      // soffit boxes are 0.5 m tall (measured)
export const EYE_HEIGHT = 1.65;
export const PLAYER_RADIUS = 0.22;
export const WALK_SPEED = 1.35;        // m/s, calm walking pace

const STRAIGHT = 2.96;                 // hall west wall up to the diagonal (measured)
const DIAG_LEN = 0.98;                 // diagonal wall (measured), 45° as on the scheme
const DIAG = DIAG_LEN / Math.SQRT2;
const BEAM_LEN = 2.24;                 // ceiling beam over the kitchen opening (measured)

// Kitchen-living room (lower part of the scheme): 4.70 x 2.90 (measured)
const LIVING_X1 = 4.70;
// the beam spans the opening from the end of the diagonal to the corner by the sofa
const HALL_X0 = LIVING_X1 - BEAM_LEN + DIAG;

// Hall with the computer niche (upper part of the scheme): 3.51 wide (measured)
export const HALL = { x0: HALL_X0, x1: HALL_X0 + 3.51, z0: 0, z1: STRAIGHT + DIAG };

export const LIVING = { x0: 0, x1: LIVING_X1, z0: HALL.z1, z1: HALL.z1 + 2.90 };

// Diagonal wall with the leopard painting, from the kitchen side to the hall side
export const DIAGONAL = { a: [HALL.x0 - DIAG, LIVING.z0], b: [HALL.x0, STRAIGHT] };

// Computer niche: 0.82 deep (measured), lowered ceiling with three spots
export const NICHE = { x0: HALL.x0, x1: HALL.x0 + 1.83, z0: 0, z1: 0.82 };

// Pillar between the niche and the arch, with two decorative niches in it
export const PILLAR = { x0: NICHE.x1, x1: NICHE.x1 + 0.40, z0: 0, z1: NICHE.z1 };

// Arch passage (the 1.04 m box on the scheme): 1.03 m deep (measured), ending in darkness
export const ARCH = {
  x0: PILLAR.x1, x1: HALL.x1 - 0.12,   // 0.12 of wall on the right side (measured)
  wallZ: NICHE.z1,                     // front face of the arch wall
  depth: 1.03,                         // (measured)
  spring: 2.05,                        // height where the round top starts
  walkTo: 0.15,                        // the player cannot go deeper than this (into the dark)
};

// Lowered-ceiling beam over the opening between the kitchen and the hall, 0.41 x 2.24 (measured).
// It sits on the hall side: its kitchen face is flush with the kitchen's north wall and runs
// 2.24 m from the corner of the diagonal wall to the east wall; its west end follows the diagonal.
export const BEAM = { x0: DIAGONAL.a[0], x1: LIVING.x1, z0: LIVING.z0 - 0.41, z1: LIVING.z0 };

export const DOOR = { height: 2.16, leafWidth: 0.78, casing: 0.07 };   // (measured)
const DOOR_OPENING = DOOR.leafWidth + 0.05;

// Openings. Positions along the walls are estimated from photos 1, 5 and 6.
export const OPENINGS = {
  // west wall of the hall, next to the computer niche
  hallWestDoor: { z0: 0.88, z1: 0.88 + DOOR_OPENING },
  // narrow dark stained-glass panel next to that door
  glassPanel: { z0: 1.98, z1: 2.50, y0: 0.94, y1: 2.61 },
  // door in the south wall of the hall, near the passage to the kitchen
  hallSouthDoor: { x0: 5.15, x1: 5.15 + DOOR_OPENING },
  // deep window niche in the end wall of the kitchen (photo 2.5), open down to the floor
  window: { z0: LIVING.z0 + 0.77, z1: LIVING.z0 + 2.20, sill: 0.85, top: 2.45 },
};

export const WALL_THICKNESS = { inner: 0.14, outer: 0.45 };

// The worktop runs along the south wall and ends with the bar turning towards the room;
// east of the bar stands the glass TV table, 1.2 m wide (measured).
const TV_TABLE_W = 1.2;
const BAR_X1 = LIVING.x1 - TV_TABLE_W;
export const KITCHEN = {
  counterTop: 0.85,                    // (measured)
  counterDepth: 0.60,                  // (measured)
  counterX1: BAR_X1,                   // the worktop ends with the bar
  upperY0: 1.45, upperY1: 2.35, upperDepth: 0.34,
  hob: { x0: 0.55, x1: 1.15 },
  sinkX: BAR_X1 - 0.95,                // west of the bar
  bar: { x0: BAR_X1 - 0.5, x1: BAR_X1, z0: LIVING.z0 + 1.32 },   // peninsula towards the room
  pole: [BAR_X1 - 0.25, LIVING.z0 + 1.50],
  tvStand: { x0: BAR_X1 + 0.02, x1: LIVING.x1 - 0.02, depth: 0.45, height: 0.5 },
};

export const FRIDGE = { x0: 0, x1: 0.60, z0: LIVING.z0, z1: LIVING.z0 + 0.60, h: 1.78 };   // (measured)

// Sofa 2 x 1 x 1 (measured), back against the east wall of the living room
export const SOFA = { x0: LIVING.x1 - 1.0, x1: LIVING.x1, z0: LIVING.z0 + 0.12, z1: LIVING.z0 + 2.12, h: 1.0 };

// Wall bars on the east wall of the hall, 0.70 wide (measured)
export const WALL_BARS = { z0: 1.83, z1: 2.53 };

export const START = { x: 3.55, z: 2.55, yaw: -0.75, pitch: -0.05 };
