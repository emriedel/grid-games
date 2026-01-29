import seedrandom from 'seedrandom';
import { getTodayDateString } from '@grid-games/shared';
import {
  Board,
  Piece,
  Position,
  Puzzle,
  Direction,
  ReverseMove,
  LWallOrientation,
  WallFlags,
  WALL_TOP,
  WALL_RIGHT,
  WALL_BOTTOM,
  WALL_LEFT,
} from '@/types';
import {
  BOARD_SIZE,
  NUM_BLOCKERS,
  MIN_BACKWARD_MOVES,
  MAX_BACKWARD_MOVES,
  L_WALLS_PER_QUADRANT_MIN,
  L_WALLS_PER_QUADRANT_MAX,
  L_WALLS_TOTAL_MIN,
  L_WALLS_TOTAL_MAX,
  LINE_WALLS_PER_EDGE,
  LINE_WALL_LENGTH,
  MIN_SOLID_BLOCKS,
  MAX_SOLID_BLOCKS,
} from '@/constants/gameConfig';
import {
  getOppositeDirection,
  findValidOrigins,
  getStoppingObstacle,
  applyMove,
  hasObstacle,
  hasPieceAt,
  isInBounds,
} from './gameLogic';
import { solve } from './solver';

type RNG = () => number;

const DIRECTIONS: Direction[] = ['up', 'right', 'down', 'left'];

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
    obstacles: [],
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
 * Add an L-shaped wall at a position with specific orientation
 * L walls form a corner that pieces can bounce off
 */
function addLWall(board: Board, row: number, col: number, orientation: LWallOrientation): void {
  // L-wall orientations define which direction the L "opens" toward
  // NE: walls on south and west sides (opens toward northeast)
  // NW: walls on south and east sides (opens toward northwest)
  // SE: walls on north and west sides (opens toward southeast)
  // SW: walls on north and east sides (opens toward southwest)

  switch (orientation) {
    case 'NE':
      // Walls on bottom and left
      if (row < board.size - 1) {
        addWallBetween(board, { row, col }, { row: row + 1, col });
      }
      if (col > 0) {
        addWallBetween(board, { row, col }, { row, col: col - 1 });
      }
      break;
    case 'NW':
      // Walls on bottom and right
      if (row < board.size - 1) {
        addWallBetween(board, { row, col }, { row: row + 1, col });
      }
      if (col < board.size - 1) {
        addWallBetween(board, { row, col }, { row, col: col + 1 });
      }
      break;
    case 'SE':
      // Walls on top and left
      if (row > 0) {
        addWallBetween(board, { row, col }, { row: row - 1, col });
      }
      if (col > 0) {
        addWallBetween(board, { row, col }, { row, col: col - 1 });
      }
      break;
    case 'SW':
      // Walls on top and right
      if (row > 0) {
        addWallBetween(board, { row, col }, { row: row - 1, col });
      }
      if (col < board.size - 1) {
        addWallBetween(board, { row, col }, { row, col: col + 1 });
      }
      break;
  }
}

/**
 * Add a line wall perpendicular to the board edge
 * Creates an L-shape with the board edge as one arm
 * Extends LINE_WALL_LENGTH cells from the edge
 *
 * For top/bottom edges: adds a VERTICAL wall (blocks left-right movement)
 * For left/right edges: adds a HORIZONTAL wall (blocks up-down movement)
 */
function addLineWall(board: Board, edge: 'top' | 'right' | 'bottom' | 'left', position: number): void {
  const length = LINE_WALL_LENGTH;

  switch (edge) {
    case 'top':
      // Vertical wall extending down from top edge at column `position`
      // Wall is between columns position-1 and position (on the left side of position)
      if (position > 0 && position < board.size) {
        for (let row = 0; row < length && row < board.size; row++) {
          addWallBetween(board, { row, col: position - 1 }, { row, col: position });
        }
      }
      break;
    case 'bottom':
      // Vertical wall extending up from bottom edge at column `position`
      if (position > 0 && position < board.size) {
        for (let i = 0; i < length && i < board.size; i++) {
          const row = board.size - 1 - i;
          addWallBetween(board, { row, col: position - 1 }, { row, col: position });
        }
      }
      break;
    case 'left':
      // Horizontal wall extending right from left edge at row `position`
      // Wall is between rows position-1 and position (on the top side of position)
      if (position > 0 && position < board.size) {
        for (let col = 0; col < length && col < board.size; col++) {
          addWallBetween(board, { row: position - 1, col }, { row: position, col });
        }
      }
      break;
    case 'right':
      // Horizontal wall extending left from right edge at row `position`
      if (position > 0 && position < board.size) {
        for (let i = 0; i < length && i < board.size; i++) {
          const col = board.size - 1 - i;
          addWallBetween(board, { row: position - 1, col }, { row: position, col });
        }
      }
      break;
  }
}

/**
 * Get cells belonging to a quadrant (for interior L wall placement)
 * Interior = rows/cols 2 to size-3 (avoiding edges and adjacent to edges)
 * Quadrants are non-overlapping to ensure even distribution
 */
function getQuadrantCells(
  size: number,
  quadrant: 'Q1' | 'Q2' | 'Q3' | 'Q4'
): Position[] {
  const cells: Position[] = [];
  const midRow = Math.floor(size / 2);
  const midCol = Math.floor(size / 2);

  // Interior starts at 2 (not adjacent to edge) and ends at size-3
  let rowStart: number, rowEnd: number, colStart: number, colEnd: number;

  switch (quadrant) {
    case 'Q1': // Top-left
      rowStart = 2;
      rowEnd = midRow - 1;
      colStart = 2;
      colEnd = midCol - 1;
      break;
    case 'Q2': // Top-right
      rowStart = 2;
      rowEnd = midRow - 1;
      colStart = midCol;
      colEnd = size - 3;
      break;
    case 'Q3': // Bottom-left
      rowStart = midRow;
      rowEnd = size - 3;
      colStart = 2;
      colEnd = midCol - 1;
      break;
    case 'Q4': // Bottom-right
      rowStart = midRow;
      rowEnd = size - 3;
      colStart = midCol;
      colEnd = size - 3;
      break;
  }

  for (let row = rowStart; row <= rowEnd; row++) {
    for (let col = colStart; col <= colEnd; col++) {
      cells.push({ row, col });
    }
  }

  return cells;
}

/**
 * Check if a position is adjacent to any position in a set (within 1 cell)
 */
function isAdjacentToAny(pos: Position, positions: Position[]): boolean {
  for (const other of positions) {
    const rowDiff = Math.abs(pos.row - other.row);
    const colDiff = Math.abs(pos.col - other.col);
    // Adjacent means within 1 cell (including diagonals)
    if (rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0)) {
      return true;
    }
  }
  return false;
}

// Store L wall positions for goal placement
interface LWallPlacement {
  center: Position;
  orientation: LWallOrientation;
}

/**
 * Generate walls using the new system:
 * - 6-8 L walls total, 1-2 per quadrant, with spacing rules
 * - Line walls on edges (1 per edge)
 * Returns the L wall placements for goal positioning
 */
function generateWalls(board: Board, rng: RNG): LWallPlacement[] {
  const orientations: LWallOrientation[] = ['NE', 'NW', 'SE', 'SW'];
  const quadrants: ('Q1' | 'Q2' | 'Q3' | 'Q4')[] = ['Q1', 'Q2', 'Q3', 'Q4'];
  const lWallPlacements: LWallPlacement[] = [];
  const lWallPositions: Position[] = [];

  // First pass: place line walls on edges (so L walls can avoid them)
  const lineWallPositions: Position[] = [];
  const edges: ('top' | 'right' | 'bottom' | 'left')[] = ['top', 'right', 'bottom', 'left'];
  for (const edge of edges) {
    for (let i = 0; i < LINE_WALLS_PER_EDGE; i++) {
      // Avoid corners (positions 0 and size-1) and pick from middle range
      const position = 2 + Math.floor(rng() * (board.size - 4));
      addLineWall(board, edge, position);

      // Track positions affected by line walls
      if (edge === 'top') {
        for (let r = 0; r < LINE_WALL_LENGTH; r++) lineWallPositions.push({ row: r, col: position });
      } else if (edge === 'bottom') {
        for (let r = 0; r < LINE_WALL_LENGTH; r++) lineWallPositions.push({ row: board.size - 1 - r, col: position });
      } else if (edge === 'left') {
        for (let c = 0; c < LINE_WALL_LENGTH; c++) lineWallPositions.push({ row: position, col: c });
      } else if (edge === 'right') {
        for (let c = 0; c < LINE_WALL_LENGTH; c++) lineWallPositions.push({ row: position, col: board.size - 1 - c });
      }
    }
  }

  // Determine target number of L walls (6-8 total)
  const targetLWalls = L_WALLS_TOTAL_MIN + Math.floor(rng() * (L_WALLS_TOTAL_MAX - L_WALLS_TOTAL_MIN + 1));
  const wallsPerQuadrant: number[] = [0, 0, 0, 0];

  // Distribute walls across quadrants (1-2 each, total 6-8)
  let remaining = targetLWalls;
  for (let q = 0; q < 4 && remaining > 0; q++) {
    const min = Math.min(L_WALLS_PER_QUADRANT_MIN, remaining);
    const max = Math.min(L_WALLS_PER_QUADRANT_MAX, remaining);
    wallsPerQuadrant[q] = min + Math.floor(rng() * (max - min + 1));
    remaining -= wallsPerQuadrant[q];
  }
  // Distribute any remaining
  while (remaining > 0) {
    for (let q = 0; q < 4 && remaining > 0; q++) {
      if (wallsPerQuadrant[q] < L_WALLS_PER_QUADRANT_MAX) {
        wallsPerQuadrant[q]++;
        remaining--;
      }
    }
  }

  // Place L walls in each quadrant with spacing rules
  for (let q = 0; q < 4; q++) {
    const quadrant = quadrants[q];
    const numLWalls = wallsPerQuadrant[q];
    const cells = getQuadrantCells(board.size, quadrant);

    // Shuffle cells for randomness
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    let placed = 0;
    for (const cell of cells) {
      if (placed >= numLWalls) break;

      // Check spacing: not adjacent to other L walls or line walls
      if (isAdjacentToAny(cell, lWallPositions)) continue;
      if (isAdjacentToAny(cell, lineWallPositions)) continue;

      // Place the L wall
      const orientation = orientations[Math.floor(rng() * orientations.length)];
      addLWall(board, cell.row, cell.col, orientation);
      lWallPositions.push(cell);
      lWallPlacements.push({ center: cell, orientation });
      placed++;
    }
  }

  return lWallPlacements;
}

/**
 * Check if a cell has any walls (is part of an L wall or has walls from line walls)
 */
function hasAnyWalls(board: Board, pos: Position): boolean {
  if (!isInBounds(board, pos)) return false;
  return board.walls[pos.row][pos.col] !== 0;
}

/**
 * Check if position is adjacent to any cell with walls
 */
function isAdjacentToWalls(board: Board, pos: Position): boolean {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const checkPos = { row: pos.row + dr, col: pos.col + dc };
      if (hasAnyWalls(board, checkPos)) return true;
    }
  }
  return false;
}

/**
 * Generate solid obstacles (1x1 blocks) with spacing from walls
 */
function generateObstacles(board: Board, pieces: Piece[], lWallPositions: Position[], rng: RNG): void {
  const numObstacles =
    MIN_SOLID_BLOCKS + Math.floor(rng() * (MAX_SOLID_BLOCKS - MIN_SOLID_BLOCKS + 1));

  const occupiedPositions: Position[] = [];

  // Mark piece positions as occupied
  for (const piece of pieces) {
    occupiedPositions.push(piece.position);
  }

  // Mark goal as occupied
  occupiedPositions.push(board.goal);

  for (let i = 0; i < numObstacles; i++) {
    let attempts = 0;
    while (attempts < 100) {
      // Interior positions only (2 to size-3, away from edges)
      const row = 2 + Math.floor(rng() * (board.size - 4));
      const col = 2 + Math.floor(rng() * (board.size - 4));
      const pos = { row, col };

      // Check not occupied
      const isOccupied = occupiedPositions.some(
        (p) => p.row === pos.row && p.col === pos.col
      );
      if (isOccupied) {
        attempts++;
        continue;
      }

      // Check not adjacent to L walls
      if (isAdjacentToAny(pos, lWallPositions)) {
        attempts++;
        continue;
      }

      // Check not adjacent to existing obstacles
      if (isAdjacentToAny(pos, board.obstacles)) {
        attempts++;
        continue;
      }

      // Check not adjacent to any walls
      if (isAdjacentToWalls(board, pos)) {
        attempts++;
        continue;
      }

      board.obstacles.push(pos);
      occupiedPositions.push(pos);
      break;
    }
  }
}

/**
 * Check if a position is in a corner
 */
function isCorner(pos: Position, size: number): boolean {
  return (
    (pos.row === 0 || pos.row === size - 1) && (pos.col === 0 || pos.col === size - 1)
  );
}

/**
 * Find a position that is "stopped" by something (wall, edge, or piece) in at least one direction.
 * This is needed for backward generation to work.
 */
function getStoppedPosition(
  board: Board,
  pieces: Piece[],
  rng: RNG,
  excludePositions: Position[] = []
): Position {
  // Collect all valid positions that are stopped by something
  const stoppedPositions: Position[] = [];

  for (let row = 0; row < board.size; row++) {
    for (let col = 0; col < board.size; col++) {
      const pos = { row, col };

      // Skip invalid positions
      if (isCorner(pos, board.size)) continue;
      if (hasPieceAt(pieces, pos)) continue;
      if (hasObstacle(board, pos)) continue;
      if (excludePositions.some((ex) => ex.row === pos.row && ex.col === pos.col)) continue;

      // Check if position is stopped in at least one direction
      let isStopped = false;
      for (const dir of DIRECTIONS) {
        const stopped = getStoppingObstacle(board, pieces, pos, dir);
        if (stopped) {
          isStopped = true;
          break;
        }
      }

      if (isStopped) {
        stoppedPositions.push(pos);
      }
    }
  }

  if (stoppedPositions.length > 0) {
    return stoppedPositions[Math.floor(rng() * stoppedPositions.length)];
  }

  // Fallback to edge positions (always stopped by at least one edge)
  const edgePositions: Position[] = [];
  for (let i = 1; i < board.size - 1; i++) {
    edgePositions.push({ row: 0, col: i }); // top edge
    edgePositions.push({ row: board.size - 1, col: i }); // bottom edge
    edgePositions.push({ row: i, col: 0 }); // left edge
    edgePositions.push({ row: i, col: board.size - 1 }); // right edge
  }

  const validEdges = edgePositions.filter(
    (pos) =>
      !hasPieceAt(pieces, pos) &&
      !hasObstacle(board, pos) &&
      !excludePositions.some((ex) => ex.row === pos.row && ex.col === pos.col)
  );

  if (validEdges.length > 0) {
    return validEdges[Math.floor(rng() * validEdges.length)];
  }

  // Ultimate fallback
  return { row: 0, col: Math.floor(board.size / 2) };
}

/**
 * Score a reverse move for "interestingness"
 * Piece-to-piece interactions are the most interesting!
 */
function scoreReverseMove(
  move: ReverseMove,
  lastMovedPieceId: string | null,
  lastMoveDir: Direction | null
): number {
  let score = 0;

  // Piece-stopped moves are the most interesting (deflecting off each other)
  if (move.stoppedBy === 'piece') {
    score += 5;
  } else if (move.stoppedBy === 'wall') {
    score += 3;
  } else if (move.stoppedBy === 'obstacle') {
    score += 2;
  } else if (move.stoppedBy === 'edge') {
    score += 1;
  }

  // Penalize moving same piece twice in a row
  if (move.pieceId === lastMovedPieceId) {
    score -= 2;
  }

  // Heavy penalty for immediate reversal
  if (
    move.pieceId === lastMovedPieceId &&
    lastMoveDir &&
    move.direction === getOppositeDirection(lastMoveDir)
  ) {
    score -= 5;
  }

  // Bonus for longer slides (up to +3)
  score += Math.min(move.distance, 3);

  // Bonus for target piece moves
  if (move.pieceId === 'target') {
    score += 2;
  }

  return score;
}

/**
 * Backward puzzle generation:
 * Start from solved state, work backward to create a solvable puzzle
 */
function generateBackward(
  board: Board,
  lWallPlacements: LWallPlacement[],
  rng: RNG
): { pieces: Piece[]; backwardMoves: number } | null {
  // Phase 1: Setup solved state
  // Goal should be at the center of an L wall (like the base game)
  if (lWallPlacements.length === 0) {
    return null; // Need at least one L wall for goal placement
  }

  // Pick a random L wall for the goal
  const goalLWall = lWallPlacements[Math.floor(rng() * lWallPlacements.length)];
  board.goal = { ...goalLWall.center };

  // Place target piece ON the goal (solved state)
  const pieces: Piece[] = [
    {
      id: 'target',
      type: 'target',
      position: { ...board.goal },
    },
  ];

  // Get L wall positions for obstacle spacing
  const lWallPositions = lWallPlacements.map((p) => p.center);

  // Place blockers at stopped positions (adjacent to walls/edges/pieces)
  for (let i = 0; i < NUM_BLOCKERS; i++) {
    const pos = getStoppedPosition(board, pieces, rng, [board.goal]);
    pieces.push({
      id: `blocker-${i}`,
      type: 'blocker',
      position: pos,
    });
  }

  // Generate obstacles after pieces are placed (with spacing from L walls)
  generateObstacles(board, pieces, lWallPositions, rng);

  // Phase 2: Work backward
  const numMoves =
    MIN_BACKWARD_MOVES + Math.floor(rng() * (MAX_BACKWARD_MOVES - MIN_BACKWARD_MOVES + 1));

  let currentPieces = pieces.map((p) => ({ ...p, position: { ...p.position } }));
  let lastMovedPieceId: string | null = null;
  let lastMoveDir: Direction | null = null;
  const piecesMoved = new Set<string>();

  for (let moveNum = 0; moveNum < numMoves; moveNum++) {
    // Collect all possible reverse moves for all pieces
    const allReverseMoves: ReverseMove[] = [];

    for (const piece of currentPieces) {
      for (const dir of DIRECTIONS) {
        // Check if piece is stopped in this direction (meaning it could have arrived from opposite)
        const stoppedBy = getStoppingObstacle(board, currentPieces, piece.position, dir);
        if (stoppedBy) {
          // Find where this piece could have come from
          const origins = findValidOrigins(board, currentPieces, piece.id, piece.position, dir);
          allReverseMoves.push(...origins);
        }
      }
    }

    if (allReverseMoves.length === 0) {
      // No valid reverse moves, can't continue
      break;
    }

    // Score and select a move
    const scoredMoves = allReverseMoves.map((move) => ({
      move,
      score: scoreReverseMove(move, lastMovedPieceId, lastMoveDir),
    }));

    // Sort by score (descending) and add some randomness
    scoredMoves.sort((a, b) => b.score - a.score);

    // Pick from top moves with some randomness
    const topMoves = scoredMoves.slice(0, Math.min(5, scoredMoves.length));
    const selectedIdx = Math.floor(rng() * topMoves.length);
    const selected = topMoves[selectedIdx].move;

    // Apply the reverse move (move piece to its origin position)
    currentPieces = applyMove(currentPieces, selected.pieceId, selected.toPosition);
    lastMovedPieceId = selected.pieceId;
    lastMoveDir = selected.direction;
    piecesMoved.add(selected.pieceId);
  }

  // Phase 3: Validate
  // Ensure at least 2 different pieces moved
  if (piecesMoved.size < 2) {
    return null;
  }

  // Return the starting positions (after backward moves)
  return {
    pieces: currentPieces,
    backwardMoves: numMoves,
  };
}

/**
 * Generate daily puzzle using backward generation
 */
export function generateDailyPuzzle(dateStr?: string): Puzzle {
  const date = dateStr || getTodayDateString();
  const baseSeed = date;

  // Try backward generation multiple times
  for (let attempt = 0; attempt < 50; attempt++) {
    const seed = `${baseSeed}-${attempt}`;
    const rng = seedrandom(seed);

    const board = createEmptyBoard(BOARD_SIZE);
    const lWallPlacements = generateWalls(board, rng);

    const result = generateBackward(board, lWallPlacements, rng);
    if (result) {
      // Quick validation: solve to verify
      const optimalMoves = solve(board, result.pieces, MAX_BACKWARD_MOVES + 5);

      // Accept if solvable (any positive number within reasonable range)
      if (optimalMoves > 0 && optimalMoves <= MAX_BACKWARD_MOVES + 5) {
        return {
          board,
          pieces: result.pieces,
          optimalMoves,
          date,
        };
      }
    }
  }

  // Fallback: return a simple guaranteed solvable puzzle
  console.warn('Failed to generate puzzle with backward generation, using fallback');
  return generateFallbackPuzzle(date);
}

/**
 * Generate a simple fallback puzzle that's definitely solvable
 */
function generateFallbackPuzzle(date: string): Puzzle {
  const board = createEmptyBoard(BOARD_SIZE);

  // Add L walls distributed across the board (1-2 per quadrant, 6-8 total)
  // Q1 (top-left)
  addLWall(board, 2, 2, 'SE');
  // Q2 (top-right)
  addLWall(board, 2, 5, 'SW');
  addLWall(board, 3, 6, 'NW');
  // Q3 (bottom-left)
  addLWall(board, 5, 2, 'NE');
  addLWall(board, 6, 3, 'SE');
  // Q4 (bottom-right)
  addLWall(board, 5, 5, 'NW');

  // Add perpendicular edge walls
  addLineWall(board, 'top', 4);
  addLineWall(board, 'bottom', 3);
  addLineWall(board, 'left', 4);
  addLineWall(board, 'right', 3);

  // Goal at center of an L wall (row 2, col 5)
  board.goal = { row: 2, col: 5 };

  const pieces: Piece[] = [
    { id: 'target', type: 'target', position: { row: 5, col: 2 } },
    { id: 'blocker-0', type: 'blocker', position: { row: 0, col: 2 } },
    { id: 'blocker-1', type: 'blocker', position: { row: 3, col: 7 } },
    { id: 'blocker-2', type: 'blocker', position: { row: 7, col: 5 } },
  ];

  const optimalMoves = solve(board, pieces, 15);

  return {
    board,
    pieces,
    optimalMoves: optimalMoves > 0 ? optimalMoves : 7,
    date,
  };
}

/**
 * Debug: get puzzle for testing
 */
export function generateTestPuzzle(): Puzzle {
  return generateDailyPuzzle('test-puzzle');
}
