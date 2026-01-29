export const BOARD_SIZE = 8;
export const NUM_BLOCKERS = 3;

// Backward generation parameters
export const MIN_BACKWARD_MOVES = 7;
export const MAX_BACKWARD_MOVES = 10;

// Wall generation (new system)
export const L_WALLS_PER_QUADRANT_MIN = 1;
export const L_WALLS_PER_QUADRANT_MAX = 2; // 4-8 total, aim for 6-8
export const L_WALLS_TOTAL_MIN = 6;
export const L_WALLS_TOTAL_MAX = 8;
export const LINE_WALLS_PER_EDGE = 1; // 4 total edge line walls
export const LINE_WALL_LENGTH = 1; // How many cells the line wall extends from edge

// Solid blocks (1x1 obstacles pieces can't pass through)
export const MIN_SOLID_BLOCKS = 0;
export const MAX_SOLID_BLOCKS = 2;

// Animation duration in ms
export const SLIDE_ANIMATION_DURATION = 150;
