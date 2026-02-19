/**
 * Inlay Puzzle Loader
 *
 * Loads puzzles from pre-generated monthly files or generates fallback puzzles.
 */

import {
  getPuzzleNumber,
  loadMonthlyFile,
  getMonthForPuzzleNumber,
  getPuzzleIdsForRange,
  verifyPuzzleIdMatch,
  type PuzzleWithId,
} from '@grid-games/shared';
import type { Puzzle, PentominoId } from '@/types';
import { PUZZLE_BASE_DATE_STRING, PUZZLE_BASE_DATE } from '@/config';

function getBasePath(): string {
  return typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_BASE_PATH || '')
    : '';
}

/**
 * Load a puzzle by its number from monthly assigned files
 */
export async function loadPuzzleByNumber(puzzleNumber: number): Promise<Puzzle | null> {
  try {
    const monthKey = getMonthForPuzzleNumber(puzzleNumber, PUZZLE_BASE_DATE_STRING);
    const basePath = getBasePath();
    const data = await loadMonthlyFile<Puzzle & PuzzleWithId>(monthKey, 'inlay', basePath);

    if (data && data[String(puzzleNumber)]) {
      const puzzle = data[String(puzzleNumber)];
      return { ...puzzle, puzzleNumber };
    }
    return null;
  } catch (error) {
    console.error(`Failed to load puzzle #${puzzleNumber}:`, error);
    return null;
  }
}

/**
 * Get today's puzzle number
 */
export function getTodayPuzzleNumber(): number {
  return getPuzzleNumber(PUZZLE_BASE_DATE);
}

/**
 * Load puzzle IDs for a range (for archive page)
 */
export async function loadPuzzleIdsForRange(
  startNum: number,
  endNum: number
): Promise<Map<number, string>> {
  const basePath = getBasePath();
  return getPuzzleIdsForRange(startNum, endNum, PUZZLE_BASE_DATE_STRING, 'inlay', basePath);
}

/**
 * Verify a saved puzzle ID matches the current puzzle
 */
export function verifyPuzzleId(currentId: string | undefined, savedId: string | undefined): boolean {
  return verifyPuzzleIdMatch(currentId, savedId);
}

/**
 * Load a puzzle from the pool (for debug mode)
 */
export async function loadPoolPuzzle(index: number): Promise<Puzzle | null> {
  try {
    const basePath = getBasePath();
    const response = await fetch(`${basePath}/puzzles/pool.json`);
    const data = await response.json();

    if (data.puzzles && data.puzzles[index]) {
      return data.puzzles[index];
    }
    return null;
  } catch (error) {
    console.error('Failed to load pool puzzle:', error);
    return null;
  }
}

/**
 * Generate a simple fallback puzzle
 * Used when no pre-generated puzzle is available
 */
export function generateFallbackPuzzle(puzzleNumber: number): Puzzle {
  // Simple 10x6 rectangle that fits exactly 12 pentominoes (60 cells = 12 × 5)
  // For now, we'll use a subset of 6 pieces (30 cells)
  const shape: boolean[][] = [];
  for (let row = 0; row < 6; row++) {
    const rowCells: boolean[] = [];
    for (let col = 0; col < 5; col++) {
      rowCells.push(true);
    }
    shape.push(rowCells);
  }

  // Use 6 pentominoes (30 cells = 6 × 5)
  const pentominoIds: PentominoId[] = ['F', 'I', 'L', 'P', 'T', 'V'];

  return {
    id: `fallback-${puzzleNumber}`,
    puzzleNumber,
    shape,
    shapeName: 'Rectangle',
    pentominoIds,
  };
}

/**
 * Get all puzzles from the pool (for debug page)
 */
export async function getPoolPuzzles(): Promise<Puzzle[]> {
  try {
    const basePath = getBasePath();
    const response = await fetch(`${basePath}/puzzles/pool.json`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.puzzles || [];
  } catch {
    return [];
  }
}

/**
 * Load a puzzle from the pool by ID (for debug mode)
 */
export async function loadPoolPuzzleById(puzzleId: string): Promise<Puzzle | null> {
  try {
    const poolPuzzles = await getPoolPuzzles();
    return poolPuzzles.find((p) => p.id === puzzleId) || null;
  } catch {
    return null;
  }
}

/**
 * Get future assigned puzzles (puzzle numbers > today)
 */
export async function getFutureAssignedPuzzles(): Promise<{ puzzleNumber: number; puzzle: Puzzle }[]> {
  const todayNum = getTodayPuzzleNumber();
  const result: { puzzleNumber: number; puzzle: Puzzle }[] = [];

  // Check the next 3 months for future puzzles
  for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
    const date = new Date(PUZZLE_BASE_DATE);
    date.setMonth(date.getMonth() + monthOffset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${month}`;

    try {
      const basePath = getBasePath();
      const data = await loadMonthlyFile<Puzzle & PuzzleWithId>(monthKey, 'inlay', basePath);
      if (!data) continue;

      for (const [numStr, puzzle] of Object.entries(data)) {
        const num = parseInt(numStr, 10);
        if (num > todayNum) {
          result.push({ puzzleNumber: num, puzzle });
        }
      }
    } catch {
      // Month file doesn't exist yet
    }
  }

  // Sort by puzzle number
  result.sort((a, b) => a.puzzleNumber - b.puzzleNumber);
  return result;
}
