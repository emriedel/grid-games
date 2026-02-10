/**
 * Archive puzzle loading utilities
 *
 * Provides shared functionality for loading pre-generated puzzles from monthly files.
 * Used by both games with archive support and their archive pages.
 *
 * @example
 * ```ts
 * import { getMonthForPuzzleNumber, loadMonthlyFile, getPuzzleIdsForRange } from '@grid-games/shared';
 *
 * // Get month key for a puzzle
 * const month = getMonthForPuzzleNumber(15, '2026-02-01'); // '2026-02'
 *
 * // Load monthly file
 * const puzzles = await loadMonthlyFile<MyPuzzle>('2026-02', 'mygame');
 *
 * // Load puzzle IDs for archive page
 * const ids = await getPuzzleIdsForRange(1, 30, '2026-02-01', 'mygame');
 * ```
 */

/**
 * Base interface for monthly file structure
 * Games can extend this with their specific puzzle data type
 */
export interface MonthlyAssignedFile<TPuzzle = unknown> {
  gameId: string;
  baseDate: string;
  puzzles: Record<string, TPuzzle>;
}

/**
 * Base interface for puzzles with an ID
 * Monthly file puzzles should have at least an id field
 */
export interface PuzzleWithId {
  id: string;
  [key: string]: unknown;
}

// Module-level cache for monthly files (shared across all games)
const monthlyFileCache = new Map<string, MonthlyAssignedFile | null>();

/**
 * Get the month key (YYYY-MM) for a puzzle number
 *
 * @param puzzleNumber - The puzzle number (1-indexed)
 * @param launchDateString - The game's launch date as 'YYYY-MM-DD'
 * @returns Month key in 'YYYY-MM' format
 */
export function getMonthForPuzzleNumber(
  puzzleNumber: number,
  launchDateString: string
): string {
  const baseDate = new Date(launchDateString + 'T00:00:00');
  const puzzleDate = new Date(baseDate.getTime() + (puzzleNumber - 1) * 24 * 60 * 60 * 1000);
  const year = puzzleDate.getFullYear();
  const month = String(puzzleDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Load a monthly puzzle file
 *
 * @param month - Month key in 'YYYY-MM' format
 * @param gameId - Game identifier (used in logging)
 * @param basePath - Optional base path for fetch (e.g., process.env.NEXT_PUBLIC_BASE_PATH)
 * @returns The puzzles record or null if not found
 */
export async function loadMonthlyFile<TPuzzle extends PuzzleWithId = PuzzleWithId>(
  month: string,
  gameId: string,
  basePath: string = ''
): Promise<Record<string, TPuzzle> | null> {
  // Create cache key that includes gameId to avoid cross-game collisions
  const cacheKey = `${gameId}-${month}`;

  // Check cache first
  if (monthlyFileCache.has(cacheKey)) {
    const cached = monthlyFileCache.get(cacheKey);
    // Return null explicitly if cached value is null/undefined (failed fetch or missing)
    if (!cached) {
      return null;
    }
    return cached.puzzles as Record<string, TPuzzle>;
  }

  try {
    const response = await fetch(`${basePath}/puzzles/assigned/${month}.json`);
    if (!response.ok) {
      console.warn(`[${gameId}] Monthly file not found: ${month}.json (status ${response.status})`);
      monthlyFileCache.set(cacheKey, null);
      return null;
    }
    const data = await response.json() as MonthlyAssignedFile<TPuzzle>;
    monthlyFileCache.set(cacheKey, data as MonthlyAssignedFile);
    return data.puzzles;
  } catch (error) {
    console.warn(`[${gameId}] Failed to load monthly file ${month}.json:`, error);
    monthlyFileCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Get puzzleIds for a range of puzzle numbers
 * Used by archive pages to verify completion status matches current puzzle version
 *
 * @param startNum - Starting puzzle number (inclusive)
 * @param endNum - Ending puzzle number (inclusive)
 * @param launchDateString - The game's launch date as 'YYYY-MM-DD'
 * @param gameId - Game identifier
 * @param basePath - Optional base path for fetch
 * @returns Map of puzzleNumber -> puzzleId
 */
export async function getPuzzleIdsForRange(
  startNum: number,
  endNum: number,
  launchDateString: string,
  gameId: string,
  basePath: string = ''
): Promise<Map<number, string>> {
  const result = new Map<number, string>();

  // Early return for invalid range
  if (startNum > endNum) {
    return result;
  }

  // Group puzzle numbers by month to minimize file loads
  const monthGroups = new Map<string, number[]>();
  for (let num = startNum; num <= endNum; num++) {
    const month = getMonthForPuzzleNumber(num, launchDateString);
    if (!monthGroups.has(month)) {
      monthGroups.set(month, []);
    }
    monthGroups.get(month)!.push(num);
  }

  // Load each month's file and extract puzzleIds
  for (const [month, puzzleNumbers] of monthGroups) {
    const puzzles = await loadMonthlyFile(month, gameId, basePath);
    if (puzzles) {
      for (const num of puzzleNumbers) {
        const puzzle = puzzles[String(num)];
        if (puzzle?.id) {
          result.set(num, puzzle.id);
        }
      }
    }
  }

  // Debug warning if no puzzleIds found for the range
  if (result.size === 0 && startNum <= endNum) {
    console.warn(`[${gameId}] No puzzleIds found for range ${startNum}-${endNum}`);
  }

  return result;
}

/**
 * Verify that a saved puzzleId matches the current puzzle's id
 * Used by archive pages to ensure completion status is for the current puzzle version
 *
 * @param currentPuzzleId - The puzzleId from the monthly file (current version)
 * @param savedPuzzleId - The puzzleId from localStorage (saved completion)
 * @returns true if they match (or both undefined for legacy puzzles)
 */
export function verifyPuzzleIdMatch(
  currentPuzzleId: string | undefined,
  savedPuzzleId: string | undefined
): boolean {
  // For legacy puzzles without puzzleId, allow if both undefined
  if (currentPuzzleId === undefined && savedPuzzleId === undefined) {
    return true;
  }
  // Otherwise require exact match
  return currentPuzzleId === savedPuzzleId;
}

/**
 * Clear the monthly file cache
 * Useful for testing or when puzzles are updated
 */
export function clearMonthlyFileCache(): void {
  monthlyFileCache.clear();
}
