// Game configuration constants
export const MAX_ATTEMPTS = 4;
export const PUZZLE_BASE_DATE = new Date('2026-01-25');

// Animation durations (ms)
export const ROTATION_DURATION = 250;
export const GROUP_ROTATION_DURATION = 300;

// Grid layout
export const GRID_SIZE = 2; // 2x2 grid

// Edge to position mapping
// Which edges of which squares face each category
export const CATEGORY_EDGE_MAP = {
  top: [
    { square: 0, edge: 0 }, // top-left square, top edge
    { square: 1, edge: 0 }, // top-right square, top edge
  ],
  right: [
    { square: 1, edge: 1 }, // top-right square, right edge
    { square: 2, edge: 1 }, // bottom-right square, right edge
  ],
  bottom: [
    { square: 2, edge: 2 }, // bottom-right square, bottom edge
    { square: 3, edge: 2 }, // bottom-left square, bottom edge
  ],
  left: [
    { square: 3, edge: 3 }, // bottom-left square, left edge
    { square: 0, edge: 3 }, // top-left square, left edge
  ],
} as const;

// Which edges of each square face the center (red herrings)
export const CENTER_FACING_EDGES = {
  0: [1, 2], // top-left: right and bottom face center
  1: [2, 3], // top-right: bottom and left face center
  2: [0, 3], // bottom-right: top and left face center
  3: [0, 1], // bottom-left: top and right face center
} as const;
