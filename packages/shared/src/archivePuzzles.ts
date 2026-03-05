/**
 * Archive puzzle loading utilities
 *
 * Provides shared functionality for loading pre-generated puzzles from monthly files.
 * Used by both games with archive support and their archive pages.
 *
 * ## File Format
 *
 * Monthly files use date-based keys with explicit puzzleNumber fields:
 * ```json
 * {
 *   "gameId": "mygame",
 *   "baseDate": "2026-02-01",
 *   "puzzles": {
 *     "2026-02-01": { "puzzleNumber": 1, "id": "...", ... },
 *     "2026-02-03": { "puzzleNumber": 2, "id": "...", ... }
 *   }
 * }
 * ```
 *
 * Key features:
 * - Date-keyed: Puzzles keyed by their date (YYYY-MM-DD)
 * - Sequential numbering: puzzleNumber is sequential with no gaps
 * - Skip missing days: If no puzzle on a date, that date has no entry
 *
 * @example
 * ```ts
 * import { loadTodayPuzzle, listPuzzlesForMonth, getPuzzleIdsForRange } from '@grid-games/shared';
 *
 * // Load today's puzzle (returns puzzle with embedded puzzleNumber)
 * const puzzle = await loadTodayPuzzle('2026-02-15', 'mygame');
 *
 * // List all puzzles in a month (for archive pagination)
 * const list = await listPuzzlesForMonth('2026-02', 'mygame');
 *
 * // Load puzzle IDs for archive page verification
 * const ids = await getPuzzleIdsForRange(1, 30, '2026-02-01', 'mygame');
 * ```
 */

/**
 * Base interface for monthly file structure
 * Games can extend this with their specific puzzle data type
 *
 * Puzzles are keyed by date string (YYYY-MM-DD) in the new format,
 * or by puzzle number string in the legacy format.
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
  /** Sequential puzzle number (1-indexed). Present in new date-keyed format. */
  puzzleNumber?: number;
  [key: string]: unknown;
}

/**
 * Summary info for a puzzle in the archive list
 */
export interface PuzzleListEntry {
  date: string;       // YYYY-MM-DD
  puzzleNumber: number;
  id: string;
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
 * Get the date string (YYYY-MM-DD) for a puzzle number from a string launch date
 * Internal helper for archive utilities
 *
 * @param puzzleNumber - The puzzle number (1-indexed)
 * @param launchDateString - The game's launch date as 'YYYY-MM-DD'
 * @returns Date string in 'YYYY-MM-DD' format
 */
function getDateKeyForPuzzleNumber(
  puzzleNumber: number,
  launchDateString: string
): string {
  const baseDate = new Date(launchDateString + 'T00:00:00');
  const puzzleDate = new Date(baseDate.getTime() + (puzzleNumber - 1) * 24 * 60 * 60 * 1000);
  const year = puzzleDate.getFullYear();
  const month = String(puzzleDate.getMonth() + 1).padStart(2, '0');
  const day = String(puzzleDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get puzzleIds for a range of puzzle numbers
 * Used by archive pages to verify completion status matches current puzzle version
 *
 * Supports both formats:
 * - Legacy: puzzles keyed by number string ("1", "2", ...)
 * - New: puzzles keyed by date string ("2026-02-01", ...) with puzzleNumber field
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
        // Try legacy number-keyed format first
        let puzzle = puzzles[String(num)];

        // Try new date-keyed format if not found
        if (!puzzle) {
          const dateKey = getDateKeyForPuzzleNumber(num, launchDateString);
          puzzle = puzzles[dateKey];
        }

        // Also scan for puzzle with matching puzzleNumber field (date-keyed format)
        if (!puzzle) {
          for (const p of Object.values(puzzles)) {
            if (p.puzzleNumber === num) {
              puzzle = p;
              break;
            }
          }
        }

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

/**
 * Get the month key (YYYY-MM) for a date string
 *
 * @param dateString - Date in 'YYYY-MM-DD' format
 * @returns Month key in 'YYYY-MM' format
 */
export function getMonthFromDate(dateString: string): string {
  return dateString.slice(0, 7);
}

/**
 * Load a puzzle by date (new date-keyed format)
 *
 * @param dateString - Date in 'YYYY-MM-DD' format
 * @param gameId - Game identifier
 * @param basePath - Optional base path for fetch
 * @returns The puzzle or null if not found
 */
export async function loadPuzzleByDate<TPuzzle extends PuzzleWithId = PuzzleWithId>(
  dateString: string,
  gameId: string,
  basePath: string = ''
): Promise<TPuzzle | null> {
  const month = getMonthFromDate(dateString);
  const puzzles = await loadMonthlyFile<TPuzzle>(month, gameId, basePath);

  if (!puzzles) {
    return null;
  }

  // Try date-keyed format first (new)
  if (puzzles[dateString]) {
    return puzzles[dateString];
  }

  // Fall back to number-keyed format (legacy) - would need launch date to calculate
  // but for date lookup, we expect date-keyed format
  return null;
}

/**
 * List all puzzles in a month
 * Returns entries sorted by date (oldest first)
 *
 * @param month - Month key in 'YYYY-MM' format
 * @param gameId - Game identifier
 * @param basePath - Optional base path for fetch
 * @param launchDateString - Optional launch date for legacy number-keyed format support
 * @returns Array of puzzle list entries
 */
export async function listPuzzlesForMonth(
  month: string,
  gameId: string,
  basePath: string = '',
  launchDateString?: string
): Promise<PuzzleListEntry[]> {
  const puzzles = await loadMonthlyFile(month, gameId, basePath);

  if (!puzzles) {
    return [];
  }

  const entries: PuzzleListEntry[] = [];

  for (const [key, puzzle] of Object.entries(puzzles)) {
    // Check if key is a date string (YYYY-MM-DD) or a number
    const isDateKey = key.match(/^\d{4}-\d{2}-\d{2}$/);

    if (isDateKey && puzzle.puzzleNumber !== undefined) {
      // New date-keyed format
      entries.push({
        date: key,
        puzzleNumber: puzzle.puzzleNumber,
        id: puzzle.id,
      });
    } else if (/^\d+$/.test(key) && puzzle.puzzleNumber !== undefined && launchDateString) {
      // Legacy number-keyed format - compute date from puzzleNumber
      const dateFromNumber = getDateKeyForPuzzleNumber(puzzle.puzzleNumber, launchDateString);
      entries.push({
        date: dateFromNumber,
        puzzleNumber: puzzle.puzzleNumber,
        id: puzzle.id,
      });
    }
  }

  // Sort by date (oldest first)
  entries.sort((a, b) => a.date.localeCompare(b.date));

  return entries;
}

/**
 * Get the list of months that have puzzles available
 * Used for archive pagination
 *
 * @param launchDateString - Game's launch date as 'YYYY-MM-DD'
 * @param todayDateString - Today's date as 'YYYY-MM-DD'
 * @returns Array of month keys in 'YYYY-MM' format (newest first)
 */
export function getAvailableMonths(
  launchDateString: string,
  todayDateString: string
): string[] {
  const months: string[] = [];
  const launchMonth = getMonthFromDate(launchDateString);
  const todayMonth = getMonthFromDate(todayDateString);

  // Generate months from launch to today
  const launchDate = new Date(launchDateString + 'T00:00:00');
  const todayDate = new Date(todayDateString + 'T00:00:00');

  const current = new Date(launchDate);
  while (current <= todayDate) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
    current.setMonth(current.getMonth() + 1);
  }

  // Return newest first
  return months.reverse();
}

/**
 * Get the highest puzzle number from assigned files
 * Used by assignment scripts to continue sequential numbering
 *
 * @param gameId - Game identifier
 * @param basePath - Base path for file access (typically for server-side scripts)
 * @param fs - File system module (for server-side use)
 * @param path - Path module (for server-side use)
 * @returns The highest puzzle number or 0 if none found
 */
export function getHighestPuzzleNumberSync(
  assignedDir: string,
  fs: { readdirSync: (path: string) => string[]; readFileSync: (path: string, encoding: string) => string },
): number {
  let highest = 0;

  try {
    const files = fs.readdirSync(assignedDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const content = fs.readFileSync(`${assignedDir}/${file}`, 'utf-8');
      const data = JSON.parse(content) as MonthlyAssignedFile<PuzzleWithId>;

      for (const puzzle of Object.values(data.puzzles)) {
        if (puzzle.puzzleNumber !== undefined && puzzle.puzzleNumber > highest) {
          highest = puzzle.puzzleNumber;
        }
      }
    }
  } catch {
    // Directory doesn't exist or other error
  }

  return highest;
}
