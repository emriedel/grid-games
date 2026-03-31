import {
  getMonthForPuzzleNumber,
  getDateForPuzzleNumber,
  getPuzzleNumber,
  parseDateString,
  loadMonthlyFile,
  getPuzzleIdsForRange as sharedGetPuzzleIdsForRange,
  type PuzzleWithId,
} from '@grid-games/shared';
import type { Cell, BonusType, DailyPuzzle } from '@/types';
import { PUZZLE_BASE_DATE, PUZZLE_BASE_DATE_STRING } from '@/config';

// Get today's date string in YYYY-MM-DD format (Pacific time)
export function getTodayDateString(): string {
  const now = new Date();
  // Format date in Pacific time
  const pacificDate = now.toLocaleDateString('en-CA', {
    timeZone: 'America/Los_Angeles',
  });
  return pacificDate; // Returns YYYY-MM-DD format
}

// Pre-generated puzzle format (from scripts/generatePuzzles.ts)
interface AssignedPuzzle extends PuzzleWithId {
  id: string;
  archetype: string;
  letters: string[];
  board: {
    size: number;
    cells: {
      row: number;
      col: number;
      bonus: BonusType;
      isPlayable: boolean;
    }[][];
  };
  thresholds: {
    heuristicMax: number;
    star1: number;
    star2: number;
    star3: number;
  };
}

// Helper to load monthly file using shared utility
async function fetchMonthlyFile(month: string): Promise<Record<string, AssignedPuzzle> | null> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return loadMonthlyFile<AssignedPuzzle>(month, 'dabble', basePath);
}

// Convert assigned puzzle to DailyPuzzle format
function convertAssignedPuzzle(puzzle: AssignedPuzzle, dateString: string): DailyPuzzle {
  const cells: Cell[][] = puzzle.board.cells.map(row =>
    row.map(cell => ({
      ...cell,
      letter: null,
      isLocked: false,
    }))
  );

  return {
    date: dateString,
    board: { cells, size: puzzle.board.size },
    letters: puzzle.letters,
    seed: Date.parse(dateString),
    archetype: puzzle.archetype,
    thresholds: puzzle.thresholds,
    puzzleId: puzzle.id,
  };
}

/**
 * Fetch pre-generated puzzle by date.
 * Returns null if no puzzle is available for the given date.
 */
export async function fetchDailyPuzzle(dateString?: string): Promise<DailyPuzzle | null> {
  const date = dateString || getTodayDateString();
  const puzzleNumber = getPuzzleNumber(PUZZLE_BASE_DATE, parseDateString(date));
  const month = getMonthForPuzzleNumber(puzzleNumber, PUZZLE_BASE_DATE_STRING);

  // Fetch only the relevant monthly file
  const puzzles = await fetchMonthlyFile(month);

  if (puzzles) {
    // Try number key (legacy format)
    let puzzle = puzzles[String(puzzleNumber)];

    // Try date key (new format)
    if (!puzzle) {
      const dateKey = getDateForPuzzleNumber(PUZZLE_BASE_DATE, puzzleNumber);
      puzzle = puzzles[dateKey];
    }

    // Scan for matching puzzleNumber field
    if (!puzzle) {
      for (const p of Object.values(puzzles)) {
        if (p.puzzleNumber === puzzleNumber) {
          puzzle = p;
          break;
        }
      }
    }

    if (puzzle) {
      return convertAssignedPuzzle(puzzle, date);
    }
  }

  // No fallback - return null (like Carom)
  console.warn(`[dabble] No puzzle found for ${date} (#${puzzleNumber})`);
  return null;
}

// =====================================================
// Debug page functions
// =====================================================

// Pool puzzle format (from scripts/generatePuzzles.ts)
type PoolPuzzle = AssignedPuzzle;

interface PoolFile {
  generatedAt: string;
  puzzles: PoolPuzzle[];
}

// Cache for pool file
let poolCache: PoolFile | null = null;

/**
 * Load the puzzle pool file
 */
async function loadPool(): Promise<PoolFile | null> {
  if (poolCache) {
    return poolCache;
  }

  try {
    const response = await fetch('/puzzles/pool.json');
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
export async function getPuzzleFromPool(poolId: string): Promise<DailyPuzzle | null> {
  const pool = await loadPool();
  if (!pool) {
    return null;
  }

  const poolPuzzle = pool.puzzles.find((p) => p.id === poolId);
  if (!poolPuzzle) {
    return null;
  }

  // Convert to DailyPuzzle format
  return convertAssignedPuzzle(poolPuzzle, `pool-${poolId}`);
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
  return sharedGetPuzzleIdsForRange(startNum, endNum, PUZZLE_BASE_DATE_STRING, 'dabble', basePath);
}

/**
 * Get future assigned puzzles (puzzle numbers greater than today's)
 */
export async function getFutureAssignedPuzzles(): Promise<{ puzzleNumber: number; puzzle: AssignedPuzzle }[]> {
  const todayPuzzleNumber = getPuzzleNumber(PUZZLE_BASE_DATE, parseDateString(getTodayDateString()));
  const results: { puzzleNumber: number; puzzle: AssignedPuzzle }[] = [];

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
