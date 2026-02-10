import seedrandom from 'seedrandom';
import { getTodayDateString, getPuzzleNumber, parseDateString } from '@grid-games/shared';
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
  PrecomputedPuzzle,
} from '@/types';
import {
  BOARD_SIZE,
  NUM_BLOCKERS,
} from '@/constants/gameConfig';
import { hasObstacle, hasPieceAt } from './gameLogic';
import { CAROM_LAUNCH_DATE, CAROM_LAUNCH_DATE_STRING } from '@/config';

// Cache for monthly puzzle files
const monthlyFileCache: Map<string, Record<string, AssignedPuzzle>> = new Map();

// Assigned puzzle with ID (matches monthly file format)
interface AssignedPuzzle extends PrecomputedPuzzle {
  id: string;
}

// Pool puzzle interface (matches script output)
interface PoolPuzzle extends PrecomputedPuzzle {
  id: string;
}

interface PoolFile {
  generatedAt: string;
  puzzles: PoolPuzzle[];
}

// Cache for pool file
let poolCache: PoolFile | null = null;

/**
 * Get the month key (YYYY-MM) for a puzzle number
 */
function getMonthForPuzzleNumber(puzzleNumber: number): string {
  const baseDate = new Date(CAROM_LAUNCH_DATE_STRING + 'T00:00:00');
  const puzzleDate = new Date(baseDate.getTime() + (puzzleNumber - 1) * 24 * 60 * 60 * 1000);
  const year = puzzleDate.getFullYear();
  const month = String(puzzleDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Load a monthly puzzle file
 */
async function loadMonthlyFile(month: string): Promise<Record<string, AssignedPuzzle> | null> {
  // Check cache first
  if (monthlyFileCache.has(month)) {
    return monthlyFileCache.get(month)!;
  }

  try {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const response = await fetch(`${basePath}/puzzles/assigned/${month}.json`);
    if (!response.ok) {
      console.warn(`Monthly file not found: ${month}.json (status ${response.status})`);
      return null;
    }
    const data = await response.json();
    const puzzles = data.puzzles as Record<string, AssignedPuzzle>;

    // Cache the result
    monthlyFileCache.set(month, puzzles);
    return puzzles;
  } catch (error) {
    console.warn(`Failed to load monthly file ${month}.json:`, error);
    return null;
  }
}

/**
 * Get a puzzle by its puzzle number from monthly files
 */
async function getPuzzleByNumber(puzzleNumber: number): Promise<AssignedPuzzle | null> {
  const month = getMonthForPuzzleNumber(puzzleNumber);
  const puzzles = await loadMonthlyFile(month);

  if (!puzzles) {
    return null;
  }

  return puzzles[String(puzzleNumber)] || null;
}

/**
 * Convert a precomputed puzzle to a full Puzzle object
 */
function hydratePuzzle(precomputed: PrecomputedPuzzle, date: string, puzzleNumber: number, puzzleId?: string): Puzzle {
  const board: Board = {
    size: BOARD_SIZE,
    walls: precomputed.walls,
    goal: precomputed.goal,
    obstacles: [],
  };

  const pieces: Piece[] = precomputed.pieces.map((p) => ({
    id: p.id,
    type: p.type,
    position: { row: p.row, col: p.col },
  }));

  return {
    board,
    pieces,
    optimalMoves: precomputed.optimalMoves,
    date,
    puzzleNumber,
    puzzleId,
    solutionPath: precomputed.solutionPath,
  };
}

/**
 * Get the daily puzzle
 * Loads from pre-computed puzzle pool for instant response
 */
export async function getDailyPuzzle(dateStr?: string): Promise<Puzzle> {
  const date = dateStr || getTodayDateString();
  const puzzleNumber = getPuzzleNumber(CAROM_LAUNCH_DATE, parseDateString(date));

  try {
    // Try to load from monthly assigned files first
    const precomputed = await getPuzzleByNumber(puzzleNumber);
    if (precomputed) {
      return hydratePuzzle(precomputed, date, puzzleNumber, precomputed.id);
    }

    // Fallback to runtime generation if not found in assigned files
    console.warn(`Puzzle #${puzzleNumber} not found in assigned files, using fallback generation`);
    return generateFallbackPuzzle(date);
  } catch (error) {
    // Fallback to runtime generation if loading fails
    console.warn('Using fallback puzzle generation:', error);
    return generateFallbackPuzzle(date);
  }
}

/**
 * Generate a random puzzle (for debug mode)
 * Picks a random puzzle from the monthly files
 */
export async function generateRandomPuzzle(): Promise<Puzzle> {
  try {
    // Get current month and try to load those puzzles
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;

    const puzzles = await loadMonthlyFile(monthKey);
    if (puzzles) {
      const puzzleNumbers = Object.keys(puzzles);
      if (puzzleNumbers.length > 0) {
        const randomNum = puzzleNumbers[Math.floor(Math.random() * puzzleNumbers.length)];
        const precomputed = puzzles[randomNum];
        const randomDate = `random-${Date.now()}`;
        return hydratePuzzle(precomputed, randomDate, parseInt(randomNum, 10), precomputed.id);
      }
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback
  const randomSeed = `random-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return generateFallbackPuzzle(randomSeed);
}

/**
 * Load the puzzle pool file
 */
async function loadPool(): Promise<PoolFile | null> {
  if (poolCache) {
    return poolCache;
  }

  try {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const response = await fetch(`${basePath}/puzzles/pool.json`);
    if (!response.ok) {
      console.warn(`Pool file not found (status ${response.status})`);
      return null;
    }
    const data = await response.json() as PoolFile;
    poolCache = data;
    return data;
  } catch (error) {
    console.warn('Failed to load pool file:', error);
    return null;
  }
}

/**
 * Get a puzzle from the pool by its ID (for debug page)
 */
export async function getPuzzleFromPool(poolId: string): Promise<Puzzle | null> {
  const pool = await loadPool();
  if (!pool) {
    return null;
  }

  const poolPuzzle = pool.puzzles.find((p) => p.id === poolId);
  if (!poolPuzzle) {
    return null;
  }

  // Use a synthetic date for pool puzzles
  const date = `pool-${poolId}`;
  return hydratePuzzle(poolPuzzle, date, 0, poolPuzzle.id);
}

/**
 * Get all pool puzzles (for debug page)
 */
export async function getPoolPuzzles(): Promise<PoolPuzzle[]> {
  const pool = await loadPool();
  return pool?.puzzles || [];
}

/**
 * Get puzzleIds for a range of puzzle numbers (for archive page)
 * Returns a Map of puzzleNumber -> puzzleId
 */
export async function getPuzzleIdsForRange(startNum: number, endNum: number): Promise<Map<number, string>> {
  const result = new Map<number, string>();

  // Group puzzle numbers by month to minimize file loads
  const monthGroups = new Map<string, number[]>();
  for (let num = startNum; num <= endNum; num++) {
    const month = getMonthForPuzzleNumber(num);
    if (!monthGroups.has(month)) {
      monthGroups.set(month, []);
    }
    monthGroups.get(month)!.push(num);
  }

  // Load each month's file and extract puzzleIds
  for (const [month, puzzleNumbers] of monthGroups) {
    const puzzles = await loadMonthlyFile(month);
    if (puzzles) {
      for (const num of puzzleNumbers) {
        const puzzle = puzzles[String(num)];
        if (puzzle?.id) {
          result.set(num, puzzle.id);
        }
      }
    }
  }

  return result;
}

/**
 * Get future assigned puzzles (puzzle numbers greater than today's)
 */
export async function getFutureAssignedPuzzles(): Promise<{ puzzleNumber: number; puzzle: PrecomputedPuzzle }[]> {
  const todayPuzzleNumber = getPuzzleNumber(CAROM_LAUNCH_DATE, new Date());
  const results: { puzzleNumber: number; puzzle: PrecomputedPuzzle }[] = [];

  // Check current and next few months
  const today = new Date();
  for (let monthOffset = 0; monthOffset <= 3; monthOffset++) {
    const checkDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    const year = checkDate.getFullYear();
    const month = String(checkDate.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;

    const puzzles = await loadMonthlyFile(monthKey);
    if (puzzles) {
      for (const [numStr, puzzle] of Object.entries(puzzles)) {
        const num = parseInt(numStr, 10);
        if (num > todayPuzzleNumber) {
          results.push({ puzzleNumber: num, puzzle });
        }
      }
    }
  }

  return results.sort((a, b) => a.puzzleNumber - b.puzzleNumber);
}

// =====================================================
// Fallback generation (used if puzzle pool fails to load)
// =====================================================

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

function addLWall(board: Board, row: number, col: number, orientation: LWallOrientation): void {
  switch (orientation) {
    case 'NE':
      if (row < board.size - 1) addWallBetween(board, { row, col }, { row: row + 1, col });
      if (col > 0) addWallBetween(board, { row, col }, { row, col: col - 1 });
      break;
    case 'NW':
      if (row < board.size - 1) addWallBetween(board, { row, col }, { row: row + 1, col });
      if (col < board.size - 1) addWallBetween(board, { row, col }, { row, col: col + 1 });
      break;
    case 'SE':
      if (row > 0) addWallBetween(board, { row, col }, { row: row - 1, col });
      if (col > 0) addWallBetween(board, { row, col }, { row, col: col - 1 });
      break;
    case 'SW':
      if (row > 0) addWallBetween(board, { row, col }, { row: row - 1, col });
      if (col < board.size - 1) addWallBetween(board, { row, col }, { row, col: col + 1 });
      break;
  }
}

function addEdgeWall(
  board: Board,
  edge: 'top' | 'right' | 'bottom' | 'left',
  position: number
): void {
  if (position <= 1 || position >= board.size - 2) return;

  switch (edge) {
    case 'top':
      addWallBetween(board, { row: 0, col: position - 1 }, { row: 0, col: position });
      break;
    case 'bottom':
      addWallBetween(
        board,
        { row: board.size - 1, col: position - 1 },
        { row: board.size - 1, col: position }
      );
      break;
    case 'left':
      addWallBetween(board, { row: position - 1, col: 0 }, { row: position, col: 0 });
      break;
    case 'right':
      addWallBetween(
        board,
        { row: position - 1, col: board.size - 1 },
        { row: position, col: board.size - 1 }
      );
      break;
  }
}

function getValidPiecePositions(
  board: Board,
  pieces: Piece[],
  excludeGoal: boolean = false
): Position[] {
  const positions: Position[] = [];

  for (let row = 0; row < board.size; row++) {
    for (let col = 0; col < board.size; col++) {
      const pos = { row, col };

      if ((row === 0 || row === board.size - 1) && (col === 0 || col === board.size - 1)) continue;
      if (hasPieceAt(pieces, pos)) continue;
      if (hasObstacle(board, pos)) continue;
      if (excludeGoal && board.goal.row === row && board.goal.col === col) continue;

      positions.push(pos);
    }
  }

  return positions;
}

/**
 * Hand-crafted fallback puzzles that are guaranteed to work
 */
function generateFallbackPuzzle(date: string): Puzzle {
  const rng = seedrandom(date);
  const variant = Math.floor(rng() * 4);

  const board = createEmptyBoard(BOARD_SIZE);

  switch (variant) {
    case 0:
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

  const pieces: Piece[] = [];
  const validPositions = getValidPiecePositions(board, pieces, true);

  for (let i = validPositions.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
  }

  const targetCandidates = validPositions.filter((pos) => {
    const dist = Math.abs(pos.row - board.goal.row) + Math.abs(pos.col - board.goal.col);
    return dist >= 4;
  });

  const targetPos = targetCandidates.length > 0 ? targetCandidates[0] : validPositions[0];

  pieces.push({ id: 'target', type: 'target', position: targetPos });

  const remainingPositions = validPositions.filter(
    (pos) => pos.row !== targetPos.row || pos.col !== targetPos.col
  );

  for (let i = 0; i < NUM_BLOCKERS && i < remainingPositions.length; i++) {
    pieces.push({
      id: `blocker-${i}`,
      type: 'blocker',
      position: remainingPositions[i],
    });
  }

  return {
    board,
    pieces,
    optimalMoves: 10, // Fallback estimate
    date,
    puzzleNumber: 0,
  };
}
