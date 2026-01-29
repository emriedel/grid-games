import seedrandom from 'seedrandom';
import { getTodayDateString } from '@grid-games/shared';
import {
  Board,
  Piece,
  Position,
  Puzzle,
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
  MIN_OPTIMAL_SOLUTION,
  L_WALLS_TOTAL_MIN,
  L_WALLS_TOTAL_MAX,
} from '@/constants/gameConfig';
import { hasObstacle, hasPieceAt } from './gameLogic';
import { getSolutionPath } from './solver';

type RNG = () => number;

// Maximum moves we'll accept (puzzles shouldn't be too hard)
const MAX_OPTIMAL_SOLUTION = 12;

// How many piece placement attempts per board (reduced from 100 to prevent hangs)
const PIECE_PLACEMENT_ATTEMPTS = 40;

// How many board generation attempts (reduced from 30)
const BOARD_GENERATION_ATTEMPTS = 15;

// Time limit for puzzle generation (ms) to prevent browser hangs
const GENERATION_TIME_LIMIT = 2000;

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
 */
function addWallBetween(board: Board, pos1: Position, pos2: Position): void {
  const rowDiff = pos2.row - pos1.row;
  const colDiff = pos2.col - pos1.col;

  if (Math.abs(rowDiff) + Math.abs(colDiff) !== 1) return;

  if (rowDiff === -1) {
    board.walls[pos1.row][pos1.col] |= WALL_TOP;
    board.walls[pos2.row][pos2.col] |= WALL_BOTTOM;
  } else if (rowDiff === 1) {
    board.walls[pos1.row][pos1.col] |= WALL_BOTTOM;
    board.walls[pos2.row][pos2.col] |= WALL_TOP;
  } else if (colDiff === -1) {
    board.walls[pos1.row][pos1.col] |= WALL_LEFT;
    board.walls[pos2.row][pos2.col] |= WALL_RIGHT;
  } else if (colDiff === 1) {
    board.walls[pos1.row][pos1.col] |= WALL_RIGHT;
    board.walls[pos2.row][pos2.col] |= WALL_LEFT;
  }
}

/**
 * L-wall placement info
 */
interface LWallPlacement {
  center: Position;
  orientation: LWallOrientation;
}

/**
 * Add an L-shaped wall at a position
 * The center is where the corner of the L is
 */
function addLWall(board: Board, row: number, col: number, orientation: LWallOrientation): void {
  switch (orientation) {
    case 'NE': // Opens toward northeast (walls on bottom and left)
      if (row < board.size - 1) addWallBetween(board, { row, col }, { row: row + 1, col });
      if (col > 0) addWallBetween(board, { row, col }, { row, col: col - 1 });
      break;
    case 'NW': // Opens toward northwest (walls on bottom and right)
      if (row < board.size - 1) addWallBetween(board, { row, col }, { row: row + 1, col });
      if (col < board.size - 1) addWallBetween(board, { row, col }, { row, col: col + 1 });
      break;
    case 'SE': // Opens toward southeast (walls on top and left)
      if (row > 0) addWallBetween(board, { row, col }, { row: row - 1, col });
      if (col > 0) addWallBetween(board, { row, col }, { row, col: col - 1 });
      break;
    case 'SW': // Opens toward southwest (walls on top and right)
      if (row > 0) addWallBetween(board, { row, col }, { row: row - 1, col });
      if (col < board.size - 1) addWallBetween(board, { row, col }, { row, col: col + 1 });
      break;
  }
}

/**
 * Add an edge wall (perpendicular to the edge, single segment only)
 * Returns the cells affected for spacing checks
 */
function addEdgeWall(
  board: Board,
  edge: 'top' | 'right' | 'bottom' | 'left',
  position: number
): Position[] {
  // Position should be in the middle range (not corners)
  if (position <= 1 || position >= board.size - 2) return [];

  const affectedCells: Position[] = [];

  switch (edge) {
    case 'top':
      // Single vertical wall segment at row 0
      addWallBetween(board, { row: 0, col: position - 1 }, { row: 0, col: position });
      affectedCells.push({ row: 0, col: position - 1 }, { row: 0, col: position });
      break;
    case 'bottom':
      // Single vertical wall segment at bottom row
      addWallBetween(board, { row: board.size - 1, col: position - 1 }, { row: board.size - 1, col: position });
      affectedCells.push({ row: board.size - 1, col: position - 1 }, { row: board.size - 1, col: position });
      break;
    case 'left':
      // Single horizontal wall segment at col 0
      addWallBetween(board, { row: position - 1, col: 0 }, { row: position, col: 0 });
      affectedCells.push({ row: position - 1, col: 0 }, { row: position, col: 0 });
      break;
    case 'right':
      // Single horizontal wall segment at right col
      addWallBetween(board, { row: position - 1, col: board.size - 1 }, { row: position, col: board.size - 1 });
      affectedCells.push({ row: position - 1, col: board.size - 1 }, { row: position, col: board.size - 1 });
      break;
  }

  return affectedCells;
}

/**
 * Check if two positions are within N cells of each other (Manhattan distance)
 */
function areWithinDistance(a: Position, b: Position, distance: number): boolean {
  return Math.abs(a.row - b.row) <= distance && Math.abs(a.col - b.col) <= distance;
}

/**
 * Check if position is within distance of any in the list
 */
function isNearAny(pos: Position, positions: Position[], distance: number): boolean {
  return positions.some(p => areWithinDistance(pos, p, distance));
}

/**
 * Generate the board structure (walls only, no pieces)
 * Returns L-wall placements for goal selection
 */
function generateBoardStructure(board: Board, rng: RNG): LWallPlacement[] {
  const orientations: LWallOrientation[] = ['NE', 'NW', 'SE', 'SW'];
  const lWallPlacements: LWallPlacement[] = [];
  const lWallPositions: Position[] = [];
  const edgeWallCells: Position[] = [];

  // Add edge walls first and track their positions
  // L-walls can be near edges, but not adjacent to these specific edge wall cells
  const edges: ('top' | 'right' | 'bottom' | 'left')[] = ['top', 'right', 'bottom', 'left'];
  for (const edge of edges) {
    const rangeStart = Math.floor(board.size / 3);
    const rangeEnd = Math.floor((2 * board.size) / 3);
    const position = rangeStart + Math.floor(rng() * (rangeEnd - rangeStart + 1));
    const cells = addEdgeWall(board, edge, position);
    edgeWallCells.push(...cells);
  }

  // Target 6-8 L-walls
  const targetLWalls = L_WALLS_TOTAL_MIN + Math.floor(rng() * (L_WALLS_TOTAL_MAX - L_WALLS_TOTAL_MIN + 1));

  // Define quadrant boundaries - allow L-walls closer to edges (rows/cols 1 to size-2)
  // This fills corners better while still avoiding the very edge (row/col 0 and size-1)
  const midRow = Math.floor(board.size / 2);
  const midCol = Math.floor(board.size / 2);
  const quadrants = [
    { rowMin: 1, rowMax: midRow - 1, colMin: 1, colMax: midCol - 1 },           // Q1: top-left
    { rowMin: 1, rowMax: midRow - 1, colMin: midCol, colMax: board.size - 2 },  // Q2: top-right
    { rowMin: midRow, rowMax: board.size - 2, colMin: 1, colMax: midCol - 1 },  // Q3: bottom-left
    { rowMin: midRow, rowMax: board.size - 2, colMin: midCol, colMax: board.size - 2 }, // Q4: bottom-right
  ];

  // Place L-walls, trying to distribute across quadrants
  let placed = 0;
  let attempts = 0;
  const maxAttempts = 200;

  while (placed < targetLWalls && attempts < maxAttempts) {
    attempts++;

    // Pick a quadrant (cycle through them for distribution)
    const quadrant = quadrants[placed % 4];

    // Pick a random position in this quadrant
    const row = quadrant.rowMin + Math.floor(rng() * (quadrant.rowMax - quadrant.rowMin + 1));
    const col = quadrant.colMin + Math.floor(rng() * (quadrant.colMax - quadrant.colMin + 1));
    const pos = { row, col };

    // Check spacing: L-walls should not be adjacent to each other (1 cell gap minimum)
    if (isNearAny(pos, lWallPositions, 1)) continue;

    // Check spacing: L-walls should not be adjacent to edge wall cells
    if (isNearAny(pos, edgeWallCells, 1)) continue;

    // Place it
    const orientation = orientations[Math.floor(rng() * orientations.length)];
    addLWall(board, row, col, orientation);
    lWallPositions.push(pos);
    lWallPlacements.push({ center: pos, orientation });
    placed++;
  }

  return lWallPlacements;
}

/**
 * Get all valid positions for placing a piece
 */
function getValidPiecePositions(board: Board, pieces: Piece[], excludeGoal: boolean = false): Position[] {
  const positions: Position[] = [];

  for (let row = 0; row < board.size; row++) {
    for (let col = 0; col < board.size; col++) {
      const pos = { row, col };

      // Skip corners
      if ((row === 0 || row === board.size - 1) && (col === 0 || col === board.size - 1)) continue;

      // Skip occupied
      if (hasPieceAt(pieces, pos)) continue;

      // Skip obstacles
      if (hasObstacle(board, pos)) continue;

      // Skip goal if requested
      if (excludeGoal && board.goal.row === row && board.goal.col === col) continue;

      positions.push(pos);
    }
  }

  return positions;
}

/**
 * Score a solution for quality
 * Higher score = better puzzle
 */
function scoreSolution(path: { pieceId: string }[]): { score: number; piecesUsed: Set<string> } {
  const piecesUsed = new Set<string>();
  for (const move of path) {
    piecesUsed.add(move.pieceId);
  }

  let score = 0;

  // Bonus for using multiple pieces (this is key for interesting puzzles)
  score += piecesUsed.size * 10;

  // Bonus for longer solutions (within reason)
  score += Math.min(path.length, 12) * 2;

  // Extra bonus if blockers are used (not just the target)
  const blockersUsed = [...piecesUsed].filter(id => id !== 'target').length;
  score += blockersUsed * 15;

  return { score, piecesUsed };
}

/**
 * Try to generate a puzzle with the given board structure
 * Returns null if time limit exceeded or no valid puzzle found
 */
function tryGeneratePuzzle(
  board: Board,
  lWallPlacements: LWallPlacement[],
  rng: RNG,
  startTime: number
): { pieces: Piece[]; optimalMoves: number; piecesUsed: number } | null {
  if (lWallPlacements.length === 0) return null;

  // Pick a random L-wall for the goal
  const shuffledLWalls = [...lWallPlacements].sort(() => rng() - 0.5);
  const goalLWall = shuffledLWalls[0];
  board.goal = { ...goalLWall.center };

  let bestResult: { pieces: Piece[]; optimalMoves: number; piecesUsed: number; score: number } | null = null;

  for (let attempt = 0; attempt < PIECE_PLACEMENT_ATTEMPTS; attempt++) {
    // Check time limit to prevent browser hangs
    if (Date.now() - startTime > GENERATION_TIME_LIMIT) {
      break;
    }

    // Get valid positions
    const validPositions = getValidPiecePositions(board, [], true);
    if (validPositions.length < NUM_BLOCKERS + 1) continue;

    // Shuffle positions
    for (let i = validPositions.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
    }

    // Place target piece (prefer positions far from goal)
    const targetCandidates = validPositions.filter(pos => {
      const dist = Math.abs(pos.row - board.goal.row) + Math.abs(pos.col - board.goal.col);
      return dist >= 3; // At least 3 Manhattan distance from goal
    });

    if (targetCandidates.length === 0) continue;

    const targetPos = targetCandidates[Math.floor(rng() * targetCandidates.length)];
    const pieces: Piece[] = [
      { id: 'target', type: 'target', position: targetPos },
    ];

    // Place blockers
    const remainingPositions = validPositions.filter(
      pos => pos.row !== targetPos.row || pos.col !== targetPos.col
    );

    for (let i = 0; i < NUM_BLOCKERS && i < remainingPositions.length; i++) {
      pieces.push({
        id: `blocker-${i}`,
        type: 'blocker',
        position: remainingPositions[i],
      });
    }

    if (pieces.length < NUM_BLOCKERS + 1) continue;

    // Solve and check quality
    const solution = getSolutionPath(board, pieces, MAX_OPTIMAL_SOLUTION + 3);

    if (!solution) continue;
    if (solution.length < MIN_OPTIMAL_SOLUTION) continue;
    if (solution.length > MAX_OPTIMAL_SOLUTION) continue;

    const { score, piecesUsed } = scoreSolution(solution);

    // We want puzzles that use at least 2 pieces (ideally including blockers)
    if (piecesUsed.size < 2) continue;

    if (!bestResult || score > bestResult.score) {
      bestResult = {
        pieces,
        optimalMoves: solution.length,
        piecesUsed: piecesUsed.size,
        score,
      };

      // If we found a really good puzzle (uses 3+ pieces), stop early
      if (piecesUsed.size >= 3 && solution.length >= 8) {
        break;
      }
    }
  }

  return bestResult;
}

/**
 * Generate daily puzzle
 */
export function generateDailyPuzzle(dateStr?: string): Puzzle {
  const date = dateStr || getTodayDateString();
  const startTime = Date.now();

  for (let boardAttempt = 0; boardAttempt < BOARD_GENERATION_ATTEMPTS; boardAttempt++) {
    // Check time limit
    if (Date.now() - startTime > GENERATION_TIME_LIMIT) {
      break;
    }

    const seed = `${date}-board-${boardAttempt}`;
    const rng = seedrandom(seed);

    const board = createEmptyBoard(BOARD_SIZE);
    const lWallPlacements = generateBoardStructure(board, rng);

    const result = tryGeneratePuzzle(board, lWallPlacements, rng, startTime);

    if (result) {
      return {
        board,
        pieces: result.pieces,
        optimalMoves: result.optimalMoves,
        date,
      };
    }
  }

  // Fallback: use a hand-crafted board
  console.warn('Using hand-crafted fallback puzzle');
  return generateFallbackPuzzle(date);
}

/**
 * Generate a random puzzle (for debug mode)
 */
export function generateRandomPuzzle(): Puzzle {
  const randomSeed = `random-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return generateDailyPuzzle(randomSeed);
}

/**
 * Hand-crafted fallback puzzles that are guaranteed to be interesting
 * These are designed to always produce good solutions
 */
function generateFallbackPuzzle(date: string): Puzzle {
  const rng = seedrandom(date);
  const variant = Math.floor(rng() * 4); // 4 different fallback layouts

  const board = createEmptyBoard(BOARD_SIZE);

  // All variants have well-spaced L-walls and single-segment edge walls
  switch (variant) {
    case 0:
      // Layout 1: Classic cross pattern
      addLWall(board, 2, 2, 'SE');
      addLWall(board, 2, 5, 'SW');
      addLWall(board, 5, 2, 'NE');
      addLWall(board, 5, 5, 'NW');
      addLWall(board, 3, 4, 'SE');
      addLWall(board, 4, 3, 'NE');
      addEdgeWall(board, 'top', 4);
      addEdgeWall(board, 'bottom', 4);
      addEdgeWall(board, 'left', 4);
      addEdgeWall(board, 'right', 4);
      board.goal = { row: 3, col: 4 };
      break;

    case 1:
      // Layout 2: Diagonal pattern
      addLWall(board, 2, 3, 'SE');
      addLWall(board, 3, 5, 'SW');
      addLWall(board, 4, 2, 'NE');
      addLWall(board, 5, 4, 'NW');
      addLWall(board, 2, 6, 'SW');
      addLWall(board, 6, 2, 'NE');
      addEdgeWall(board, 'top', 3);
      addEdgeWall(board, 'bottom', 5);
      addEdgeWall(board, 'left', 3);
      addEdgeWall(board, 'right', 5);
      board.goal = { row: 3, col: 5 };
      break;

    case 2:
      // Layout 3: Scattered pattern
      addLWall(board, 2, 2, 'NE');
      addLWall(board, 2, 5, 'NW');
      addLWall(board, 4, 3, 'SE');
      addLWall(board, 4, 5, 'SW');
      addLWall(board, 5, 2, 'SE');
      addLWall(board, 6, 5, 'NW');
      addEdgeWall(board, 'top', 5);
      addEdgeWall(board, 'bottom', 3);
      addEdgeWall(board, 'left', 5);
      addEdgeWall(board, 'right', 3);
      board.goal = { row: 4, col: 3 };
      break;

    default:
      // Layout 4: Asymmetric pattern
      addLWall(board, 2, 4, 'SE');
      addLWall(board, 3, 2, 'NE');
      addLWall(board, 3, 6, 'NW');
      addLWall(board, 5, 3, 'SE');
      addLWall(board, 5, 5, 'SW');
      addLWall(board, 6, 4, 'NE');
      addEdgeWall(board, 'top', 3);
      addEdgeWall(board, 'bottom', 5);
      addEdgeWall(board, 'left', 4);
      addEdgeWall(board, 'right', 4);
      board.goal = { row: 2, col: 4 };
      break;
  }

  // Now place pieces to create a good puzzle
  const pieces: Piece[] = [];
  const validPositions = getValidPiecePositions(board, pieces, true);

  // Shuffle and pick positions
  for (let i = validPositions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
  }

  // Find a good target position (far from goal)
  const targetCandidates = validPositions.filter(pos => {
    const dist = Math.abs(pos.row - board.goal.row) + Math.abs(pos.col - board.goal.col);
    return dist >= 4;
  });

  const targetPos = targetCandidates.length > 0
    ? targetCandidates[0]
    : validPositions[0];

  pieces.push({ id: 'target', type: 'target', position: targetPos });

  // Place blockers
  const remainingPositions = validPositions.filter(
    pos => pos.row !== targetPos.row || pos.col !== targetPos.col
  );

  for (let i = 0; i < NUM_BLOCKERS && i < remainingPositions.length; i++) {
    pieces.push({
      id: `blocker-${i}`,
      type: 'blocker',
      position: remainingPositions[i],
    });
  }

  // Solve to get optimal moves
  const solution = getSolutionPath(board, pieces, 20);
  const optimalMoves = solution ? solution.length : 8;

  return {
    board,
    pieces,
    optimalMoves: Math.max(optimalMoves, 1),
    date,
  };
}

/**
 * Debug: get puzzle for testing
 */
export function generateTestPuzzle(): Puzzle {
  return generateDailyPuzzle('test-puzzle');
}
