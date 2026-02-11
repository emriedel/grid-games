/**
 * Puzzle loading utilities for Jumble
 *
 * Provides functions to load pre-generated puzzles from monthly assigned files.
 * All puzzles must be pre-generated; there is no on-the-fly fallback.
 */

import {
  getMonthForPuzzleNumber,
  loadMonthlyFile,
  getPuzzleIdsForRange as sharedGetPuzzleIdsForRange,
  type PuzzleWithId,
} from '@grid-games/shared';
import { PUZZLE_BASE_DATE, PUZZLE_BASE_DATE_STRING } from '@/config';
import type { Board } from '@/types';
import { generateBoard as generateBoardClientSide } from './boardGenerator';
import { findAllValidWords } from './wordValidator';
import { calculateMaxScore } from './scoring';

/**
 * Pre-generated puzzle format (from scripts/generatePool.ts)
 */
export interface AssignedPuzzle extends PuzzleWithId {
  id: string;
  board: Board;
  maxPossibleScore: number;
  debug: {
    totalValidWords: number;
    wordsByLength: Record<number, number>;
    longestWords: string[];
    rareLetterCount: number;
    vowelPositions: [number, number][];
  };
}

/**
 * Daily puzzle format returned to game components
 */
export interface DailyPuzzle {
  puzzleId: string;
  puzzleNumber: number;
  board: Board;
  maxPossibleScore: number;
  isPreGenerated: boolean;
}

// Cache for monthly files
const monthlyFileCache = new Map<string, Record<string, AssignedPuzzle> | null>();

/**
 * Get today's date string in YYYY-MM-DD format (local time)
 */
export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get puzzle number for a date
 */
export function getPuzzleNumberForDate(dateString: string): number {
  const date = new Date(dateString + 'T00:00:00');
  const diffTime = date.getTime() - PUZZLE_BASE_DATE.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

/**
 * Get date string for a puzzle number
 */
export function getDateStringForPuzzle(puzzleNumber: number): string {
  const puzzleDate = new Date(PUZZLE_BASE_DATE.getTime() + (puzzleNumber - 1) * 24 * 60 * 60 * 1000);
  const year = puzzleDate.getFullYear();
  const month = String(puzzleDate.getMonth() + 1).padStart(2, '0');
  const day = String(puzzleDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Helper to load monthly file using shared utility
 */
async function fetchMonthlyFile(month: string): Promise<Record<string, AssignedPuzzle> | null> {
  // Check module cache first
  if (monthlyFileCache.has(month)) {
    return monthlyFileCache.get(month) ?? null;
  }

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const result = await loadMonthlyFile<AssignedPuzzle>(month, 'jumble', basePath);
  monthlyFileCache.set(month, result);
  return result;
}

/**
 * Get daily puzzle by date string (defaults to today)
 * All puzzles should be pre-generated; falls back to client-side generation if not found
 */
export async function getDailyPuzzle(dateString?: string): Promise<DailyPuzzle> {
  const date = dateString || getTodayDateString();
  const puzzleNumber = getPuzzleNumberForDate(date);
  const month = getMonthForPuzzleNumber(puzzleNumber, PUZZLE_BASE_DATE_STRING);

  // Fetch the monthly file
  const puzzles = await fetchMonthlyFile(month);

  if (puzzles) {
    const puzzle = puzzles[String(puzzleNumber)];
    if (puzzle) {
      return {
        puzzleId: puzzle.id,
        puzzleNumber,
        board: puzzle.board,
        maxPossibleScore: puzzle.maxPossibleScore,
        isPreGenerated: true,
      };
    }
  }

  // Fall back to client-side generation (for development/testing only)
  console.warn(`[jumble] No pre-generated puzzle for ${date} (#${puzzleNumber}), generating client-side`);
  const puzzleDate = new Date(date + 'T00:00:00');
  const board = generateBoardClientSide(puzzleDate);
  const allWords = findAllValidWords(board);
  const maxPossibleScore = calculateMaxScore(Array.from(allWords.keys()));

  return {
    puzzleId: `generated-${puzzleNumber}`,
    puzzleNumber,
    board,
    maxPossibleScore,
    isPreGenerated: false,
  };
}

/**
 * Get puzzle by puzzle number
 */
export async function getPuzzleByNumber(puzzleNumber: number): Promise<DailyPuzzle> {
  const dateString = getDateStringForPuzzle(puzzleNumber);
  return getDailyPuzzle(dateString);
}

/**
 * Get puzzleIds for a range of puzzle numbers (for archive page)
 */
export async function getPuzzleIdsForRange(startNum: number, endNum: number): Promise<Map<number, string>> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return sharedGetPuzzleIdsForRange(startNum, endNum, PUZZLE_BASE_DATE_STRING, 'jumble', basePath);
}

// =====================================================
// Debug page functions
// =====================================================

interface PoolFile {
  generatedAt: string;
  puzzles: AssignedPuzzle[];
}

// Cache for pool file
let poolCache: PoolFile | null = null;

/**
 * Load the puzzle pool file (for debug page)
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
    const data = (await response.json()) as PoolFile;
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

  return {
    puzzleId: poolPuzzle.id,
    puzzleNumber: 0, // Pool puzzles don't have a number yet
    board: poolPuzzle.board,
    maxPossibleScore: poolPuzzle.maxPossibleScore,
    isPreGenerated: true,
  };
}

/**
 * Get all pool puzzles (for debug page)
 */
export async function getPoolPuzzles(): Promise<AssignedPuzzle[]> {
  const pool = await loadPool();
  return pool?.puzzles || [];
}

/**
 * Get future assigned puzzles (puzzle numbers greater than today's)
 */
export async function getFutureAssignedPuzzles(): Promise<{ puzzleNumber: number; puzzle: AssignedPuzzle }[]> {
  const todayPuzzleNumber = getPuzzleNumberForDate(getTodayDateString());
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
