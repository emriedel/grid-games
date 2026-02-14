import seedrandom from 'seedrandom';
import { Puzzle, SquareState, Rotation, PuzzleSquare } from '@/types';
import {
  getTodayDateString,
  getMonthForPuzzleNumber,
  loadMonthlyFile,
  getPuzzleIdsForRange as sharedGetPuzzleIdsForRange,
} from '@grid-games/shared';
import { groupRotate } from './gameLogic';
import { PUZZLE_BASE_DATE_STRING, PUZZLE_BASE_DATE } from '@/constants/gameConfig';

// Import puzzles from JSON as fallback
import puzzlesData from '../../public/puzzles/puzzles.json';

/**
 * Assigned puzzle format (from monthly files)
 */
interface AssignedPuzzle {
  id: string;
  date: string;
  categories: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  squares: [PuzzleSquare, PuzzleSquare, PuzzleSquare, PuzzleSquare];
  [key: string]: unknown;
}

// Type assertion for legacy puzzles
const legacyPuzzles: Puzzle[] = puzzlesData.puzzles.map(p => ({
  ...p,
  squares: p.squares as [PuzzleSquare, PuzzleSquare, PuzzleSquare, PuzzleSquare],
}));

/**
 * Get puzzle number for a date
 */
export function getPuzzleNumberForDate(dateStr: string): number {
  const targetDate = new Date(dateStr + 'T00:00:00');
  const diffTime = targetDate.getTime() - PUZZLE_BASE_DATE.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

/**
 * Get date string for a puzzle number
 */
export function getDateForPuzzleNumber(puzzleNumber: number): string {
  const puzzleDate = new Date(PUZZLE_BASE_DATE.getTime() + (puzzleNumber - 1) * 24 * 60 * 60 * 1000);
  return puzzleDate.toISOString().split('T')[0];
}

/**
 * Load puzzle by puzzle number from monthly files
 * Falls back to legacy puzzles.json if not found
 */
export async function loadPuzzleByNumber(puzzleNumber: number): Promise<{
  puzzle: Puzzle;
  puzzleId?: string;
} | null> {
  const month = getMonthForPuzzleNumber(puzzleNumber, PUZZLE_BASE_DATE_STRING);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  try {
    const puzzles = await loadMonthlyFile<AssignedPuzzle>(month, 'edgewise', basePath);
    if (puzzles) {
      const puzzle = puzzles[String(puzzleNumber)];
      if (puzzle) {
        return {
          puzzle: {
            date: puzzle.date,
            categories: puzzle.categories,
            squares: puzzle.squares,
          },
          puzzleId: puzzle.id,
        };
      }
    }
  } catch (error) {
    console.warn(`[edgewise] Failed to load puzzle #${puzzleNumber} from monthly file:`, error);
  }

  // Fallback to legacy puzzles
  const dateStr = getDateForPuzzleNumber(puzzleNumber);
  const legacyPuzzle = legacyPuzzles.find(p => p.date === dateStr);
  if (legacyPuzzle) {
    return { puzzle: legacyPuzzle };
  }

  return null;
}

/**
 * Get the puzzle for a specific date
 * Falls back to a random puzzle if date not found
 */
export function getPuzzleForDate(dateStr: string): Puzzle | null {
  // First try to find exact date match in legacy puzzles
  const exactMatch = legacyPuzzles.find(p => p.date === dateStr);
  if (exactMatch) return exactMatch;

  // Fallback: use date as seed to pick a puzzle
  if (legacyPuzzles.length === 0) return null;

  const rng = seedrandom(dateStr);
  const index = Math.floor(rng() * legacyPuzzles.length);
  return legacyPuzzles[index];
}

/**
 * Get today's puzzle (synchronous fallback version)
 */
export function getTodayPuzzle(): Puzzle | null {
  return getPuzzleForDate(getTodayDateString());
}

/**
 * Get puzzle IDs for archive page
 */
export async function getPuzzleIdsForRange(
  startNum: number,
  endNum: number
): Promise<Map<number, string>> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return sharedGetPuzzleIdsForRange(startNum, endNum, PUZZLE_BASE_DATE_STRING, 'edgewise', basePath);
}

/**
 * Generate initial rotations for squares based on date
 * Same date always produces same scramble
 */
export function getInitialRotations(dateStr: string): [Rotation, Rotation, Rotation, Rotation] {
  const rng = seedrandom(dateStr + '-scramble');
  return [
    Math.floor(rng() * 4) as Rotation,
    Math.floor(rng() * 4) as Rotation,
    Math.floor(rng() * 4) as Rotation,
    Math.floor(rng() * 4) as Rotation,
  ];
}

/**
 * Generate initial group rotations based on date
 * Returns number of group rotations (0-3) to apply
 */
export function getInitialGroupRotations(dateStr: string): number {
  const rng = seedrandom(dateStr + '-group-scramble');
  return Math.floor(rng() * 4);
}

/**
 * Convert puzzle to initial game state with scrambled rotations and positions
 */
export function initializeGameState(puzzle: Puzzle, dateStr: string): SquareState[] {
  const rotations = getInitialRotations(dateStr);
  const groupRotationCount = getInitialGroupRotations(dateStr);

  let squares: SquareState[] = puzzle.squares.map((square, index) => ({
    words: [square.top, square.right, square.bottom, square.left],
    rotation: rotations[index],
  }));

  // Apply group rotations for position scrambling
  for (let i = 0; i < groupRotationCount; i++) {
    squares = groupRotate(squares);
  }

  return squares;
}

/**
 * Get the puzzle number based on date
 */
export function getPuzzleNumber(baseDate: Date, currentDate?: Date): number {
  const current = currentDate || new Date();
  const diffTime = current.getTime() - baseDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

/**
 * Get a random puzzle (for debug mode)
 */
export function getRandomPuzzle(): { puzzle: Puzzle; dateStr: string } | null {
  if (legacyPuzzles.length === 0) return null;

  const randomDate = new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000);
  const dateStr = randomDate.toISOString().split('T')[0];
  const rng = seedrandom(dateStr);
  const index = Math.floor(rng() * legacyPuzzles.length);

  return { puzzle: legacyPuzzles[index], dateStr };
}

/**
 * Load a puzzle from pool.json by ID (for debug page testing)
 */
export async function loadPuzzleFromPoolById(poolId: string): Promise<{
  puzzle: Puzzle;
  puzzleId: string;
} | null> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

  try {
    const response = await fetch(`${basePath}/puzzles/pool.json`);
    if (!response.ok) {
      console.warn('[edgewise] Failed to load pool.json');
      return null;
    }

    const data = await response.json();
    const poolPuzzles = data.puzzles || [];

    const found = poolPuzzles.find((p: { id: string }) => p.id === poolId);
    if (!found) {
      console.warn(`[edgewise] Pool puzzle not found: ${poolId}`);
      return null;
    }

    // Convert pool puzzle format to game Puzzle format
    // Pool puzzles don't have a date, so we generate one for scrambling
    const debugDate = new Date().toISOString().split('T')[0] + '-' + poolId;

    return {
      puzzle: {
        date: debugDate,
        categories: found.categories,
        squares: found.squares,
      },
      puzzleId: found.id,
    };
  } catch (error) {
    console.error('[edgewise] Error loading pool puzzle:', error);
    return null;
  }
}
