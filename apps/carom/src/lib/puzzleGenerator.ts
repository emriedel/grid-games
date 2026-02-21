import {
  getTodayDateString,
  getPuzzleNumber,
  parseDateString,
  getMonthForPuzzleNumber,
  getDateForPuzzleNumber,
  loadMonthlyFile,
  getPuzzleIdsForRange as sharedGetPuzzleIdsForRange,
  type PuzzleWithId,
} from '@grid-games/shared';
import {
  Board,
  Piece,
  Puzzle,
  PrecomputedPuzzle,
} from '@/types';
import {
  BOARD_SIZE,
} from '@/constants/gameConfig';
import { CAROM_LAUNCH_DATE, CAROM_LAUNCH_DATE_STRING } from '@/config';

// Assigned puzzle with ID (matches monthly file format)
interface AssignedPuzzle extends PrecomputedPuzzle, PuzzleWithId {
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
 * Helper to load monthly file using shared utility
 */
async function fetchMonthlyFile(month: string): Promise<Record<string, AssignedPuzzle> | null> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return loadMonthlyFile<AssignedPuzzle>(month, 'carom', basePath);
}

/**
 * Get a puzzle by its puzzle number from monthly files
 */
async function getPuzzleByNumber(puzzleNumber: number): Promise<AssignedPuzzle | null> {
  const month = getMonthForPuzzleNumber(puzzleNumber, CAROM_LAUNCH_DATE_STRING);
  const puzzles = await fetchMonthlyFile(month);

  if (!puzzles) {
    return null;
  }

  // Try number key (legacy format)
  if (puzzles[String(puzzleNumber)]) {
    return puzzles[String(puzzleNumber)];
  }

  // Try date key (new format) - calculate date from puzzle number
  const dateKey = getDateForPuzzleNumber(CAROM_LAUNCH_DATE, puzzleNumber);
  if (puzzles[dateKey]) {
    return puzzles[dateKey];
  }

  // Scan for matching puzzleNumber field
  for (const puzzle of Object.values(puzzles)) {
    if (puzzle.puzzleNumber === puzzleNumber) {
      return puzzle;
    }
  }

  return null;
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
 * Loads from pre-computed puzzle in assigned files
 * Returns null if no puzzle is available for the given date
 */
export async function getDailyPuzzle(dateStr?: string): Promise<Puzzle | null> {
  const date = dateStr || getTodayDateString();
  const puzzleNumber = getPuzzleNumber(CAROM_LAUNCH_DATE, parseDateString(date));

  try {
    // Load from monthly assigned files
    const precomputed = await getPuzzleByNumber(puzzleNumber);
    if (precomputed) {
      return hydratePuzzle(precomputed, date, puzzleNumber, precomputed.id);
    }

    // No puzzle found for this date
    console.warn(`[carom] Puzzle #${puzzleNumber} not found in assigned files`);
    return null;
  } catch (error) {
    console.warn('[carom] Failed to load daily puzzle:', error);
    return null;
  }
}

/**
 * Generate a random puzzle (for debug mode)
 * Picks a random puzzle from the monthly files
 * Returns null if no puzzles are available
 */
export async function generateRandomPuzzle(): Promise<Puzzle | null> {
  try {
    // Get current month and try to load those puzzles
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;

    const puzzles = await fetchMonthlyFile(monthKey);
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
    // Fall through to return null
  }

  return null;
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
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return sharedGetPuzzleIdsForRange(startNum, endNum, CAROM_LAUNCH_DATE_STRING, 'carom', basePath);
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

    const puzzles = await fetchMonthlyFile(monthKey);
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

