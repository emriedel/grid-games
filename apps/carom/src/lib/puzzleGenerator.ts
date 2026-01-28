import seedrandom from 'seedrandom';
import { getTodayDateString } from '@grid-games/shared';
import {
  Board,
  Piece,
  Position,
  Puzzle,
  WallFlags,
  WALL_TOP,
  WALL_RIGHT,
  WALL_BOTTOM,
  WALL_LEFT,
} from '@/types';
import {
  BOARD_SIZE,
  NUM_BLOCKERS,
  MIN_OPTIMAL_MOVES,
  MAX_OPTIMAL_MOVES,
  MAX_GENERATION_ATTEMPTS,
  MIN_L_CLUSTERS,
  MAX_L_CLUSTERS,
  MIN_SINGLE_WALLS,
  MAX_SINGLE_WALLS,
} from '@/constants/gameConfig';
import { solve } from './solver';

type RNG = () => number;

/**
 * Create an empty board with no walls
 */
function createEmptyBoard(size: number): Board {
  const walls: WallFlags[][] = [];
  for (let row = 0; row < size; row++) {
    walls.push(new Array(size).fill(0));
  }
  return {
    size,
    walls,
    goal: { row: 0, col: 0 },
  };
}

/**
 * Add a wall between two adjacent cells
 * Ensures both cells have consistent wall flags
 */
function addWallBetween(board: Board, pos1: Position, pos2: Position): void {
  const rowDiff = pos2.row - pos1.row;
  const colDiff = pos2.col - pos1.col;

  // They must be adjacent
  if (Math.abs(rowDiff) + Math.abs(colDiff) !== 1) {
    return;
  }

  if (rowDiff === -1) {
    // pos2 is above pos1
    board.walls[pos1.row][pos1.col] |= WALL_TOP;
    board.walls[pos2.row][pos2.col] |= WALL_BOTTOM;
  } else if (rowDiff === 1) {
    // pos2 is below pos1
    board.walls[pos1.row][pos1.col] |= WALL_BOTTOM;
    board.walls[pos2.row][pos2.col] |= WALL_TOP;
  } else if (colDiff === -1) {
    // pos2 is left of pos1
    board.walls[pos1.row][pos1.col] |= WALL_LEFT;
    board.walls[pos2.row][pos2.col] |= WALL_RIGHT;
  } else if (colDiff === 1) {
    // pos2 is right of pos1
    board.walls[pos1.row][pos1.col] |= WALL_RIGHT;
    board.walls[pos2.row][pos2.col] |= WALL_LEFT;
  }
}

/**
 * Add an L-shaped wall cluster at a position
 */
function addLCluster(board: Board, cornerRow: number, cornerCol: number, rng: RNG): void {
  // L-shape has 4 orientations
  // Each orientation defines walls around a corner cell
  const orientations = [
    // Top-right corner: walls on bottom and left edges of corner
    { walls: [WALL_BOTTOM, WALL_LEFT] },
    // Top-left corner: walls on bottom and right edges
    { walls: [WALL_BOTTOM, WALL_RIGHT] },
    // Bottom-right corner: walls on top and left edges
    { walls: [WALL_TOP, WALL_LEFT] },
    // Bottom-left corner: walls on top and right edges
    { walls: [WALL_TOP, WALL_RIGHT] },
  ];

  const orient = orientations[Math.floor(rng() * orientations.length)];

  // Ensure the corner position is valid (not on edge if walls would go off board)
  if (
    cornerRow < 1 ||
    cornerRow >= board.size - 1 ||
    cornerCol < 1 ||
    cornerCol >= board.size - 1
  ) {
    return;
  }

  // Add walls based on orientation
  for (const wallFlag of orient.walls) {
    if (wallFlag === WALL_TOP) {
      addWallBetween(board, { row: cornerRow, col: cornerCol }, { row: cornerRow - 1, col: cornerCol });
    } else if (wallFlag === WALL_BOTTOM) {
      addWallBetween(board, { row: cornerRow, col: cornerCol }, { row: cornerRow + 1, col: cornerCol });
    } else if (wallFlag === WALL_LEFT) {
      addWallBetween(board, { row: cornerRow, col: cornerCol }, { row: cornerRow, col: cornerCol - 1 });
    } else if (wallFlag === WALL_RIGHT) {
      addWallBetween(board, { row: cornerRow, col: cornerCol }, { row: cornerRow, col: cornerCol + 1 });
    }
  }
}

/**
 * Add a single wall segment
 */
function addSingleWall(board: Board, rng: RNG): void {
  const row = Math.floor(rng() * (board.size - 1)) + 1;
  const col = Math.floor(rng() * (board.size - 1)) + 1;

  // Randomly pick horizontal or vertical wall
  if (rng() < 0.5) {
    // Horizontal wall (between this cell and above)
    if (row > 0) {
      addWallBetween(board, { row, col }, { row: row - 1, col });
    }
  } else {
    // Vertical wall (between this cell and left)
    if (col > 0) {
      addWallBetween(board, { row, col }, { row, col: col - 1 });
    }
  }
}

/**
 * Generate walls on the board
 */
function generateWalls(board: Board, rng: RNG): void {
  // Add L-shaped clusters
  const numLClusters = MIN_L_CLUSTERS + Math.floor(rng() * (MAX_L_CLUSTERS - MIN_L_CLUSTERS + 1));
  for (let i = 0; i < numLClusters; i++) {
    const row = 1 + Math.floor(rng() * (board.size - 2));
    const col = 1 + Math.floor(rng() * (board.size - 2));
    addLCluster(board, row, col, rng);
  }

  // Add single walls
  const numSingleWalls = MIN_SINGLE_WALLS + Math.floor(rng() * (MAX_SINGLE_WALLS - MIN_SINGLE_WALLS + 1));
  for (let i = 0; i < numSingleWalls; i++) {
    addSingleWall(board, rng);
  }
}

/**
 * Check if a position is in a corner
 */
function isCorner(pos: Position, size: number): boolean {
  return (
    (pos.row === 0 || pos.row === size - 1) &&
    (pos.col === 0 || pos.col === size - 1)
  );
}

/**
 * Check if position is occupied by any piece
 */
function isOccupied(pos: Position, pieces: Piece[]): boolean {
  return pieces.some((p) => p.position.row === pos.row && p.position.col === pos.col);
}

/**
 * Generate random position not in corners and not occupied
 */
function getRandomPosition(
  board: Board,
  pieces: Piece[],
  rng: RNG,
  excludeGoal: Position | null = null
): Position {
  let attempts = 0;
  while (attempts < 100) {
    const row = Math.floor(rng() * board.size);
    const col = Math.floor(rng() * board.size);
    const pos = { row, col };

    if (
      !isCorner(pos, board.size) &&
      !isOccupied(pos, pieces) &&
      (!excludeGoal || pos.row !== excludeGoal.row || pos.col !== excludeGoal.col)
    ) {
      return pos;
    }
    attempts++;
  }
  // Fallback - shouldn't happen with proper board size
  return { row: Math.floor(board.size / 2), col: Math.floor(board.size / 2) };
}

/**
 * Generate pieces (1 target + blockers)
 */
function generatePieces(board: Board, rng: RNG): Piece[] {
  const pieces: Piece[] = [];

  // Create target piece
  const targetPos = getRandomPosition(board, pieces, rng);
  pieces.push({
    id: 'target',
    type: 'target',
    position: targetPos,
  });

  // Create blocker pieces
  for (let i = 0; i < NUM_BLOCKERS; i++) {
    const blockerPos = getRandomPosition(board, pieces, rng);
    pieces.push({
      id: `blocker-${i}`,
      type: 'blocker',
      position: blockerPos,
    });
  }

  return pieces;
}

/**
 * Generate goal position
 */
function generateGoal(board: Board, pieces: Piece[], rng: RNG): Position {
  return getRandomPosition(board, [], rng);
}

/**
 * Attempt to generate a valid puzzle
 */
function attemptGeneration(rng: RNG): Puzzle | null {
  const board = createEmptyBoard(BOARD_SIZE);
  generateWalls(board, rng);

  const pieces = generatePieces(board, rng);
  board.goal = generateGoal(board, pieces, rng);

  // Solve to find optimal moves
  const optimalMoves = solve(board, pieces, MAX_OPTIMAL_MOVES + 5);

  // Validate: must be solvable in target range
  if (optimalMoves >= MIN_OPTIMAL_MOVES && optimalMoves <= MAX_OPTIMAL_MOVES) {
    return {
      board,
      pieces,
      optimalMoves,
      date: getTodayDateString(),
    };
  }

  return null;
}

/**
 * Generate daily puzzle
 */
export function generateDailyPuzzle(dateStr?: string): Puzzle {
  const date = dateStr || getTodayDateString();
  const baseSeed = date;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const seed = `${baseSeed}-${attempt}`;
    const rng = seedrandom(seed);
    const puzzle = attemptGeneration(rng);
    if (puzzle) {
      puzzle.date = date;
      return puzzle;
    }
  }

  // Fallback: return a simple puzzle that's definitely solvable
  // This should rarely happen with proper generation parameters
  console.warn('Failed to generate puzzle with target difficulty, using fallback');
  const fallbackRng = seedrandom(baseSeed);
  const board = createEmptyBoard(BOARD_SIZE);

  // Create a simple puzzle with target near goal
  const pieces: Piece[] = [
    { id: 'target', type: 'target', position: { row: 3, col: 3 } },
    { id: 'blocker-0', type: 'blocker', position: { row: 1, col: 1 } },
    { id: 'blocker-1', type: 'blocker', position: { row: 1, col: 6 } },
    { id: 'blocker-2', type: 'blocker', position: { row: 6, col: 1 } },
  ];
  board.goal = { row: 0, col: 3 };

  // Add some walls to make it interesting
  addWallBetween(board, { row: 2, col: 3 }, { row: 2, col: 4 });
  addWallBetween(board, { row: 4, col: 2 }, { row: 4, col: 3 });

  const optimalMoves = solve(board, pieces, 15);

  return {
    board,
    pieces,
    optimalMoves: optimalMoves > 0 ? optimalMoves : 5,
    date,
  };
}

/**
 * Debug: get puzzle for testing
 */
export function generateTestPuzzle(): Puzzle {
  return generateDailyPuzzle('test-puzzle');
}
