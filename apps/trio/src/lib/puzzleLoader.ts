/**
 * Puzzle loading utilities for Trio.
 *
 * Sequential Draw Mode:
 * - Puzzles have 5 rounds
 * - Each round has tuples and the indices of the valid set
 * - Cards are created from tuples using the visual mapping
 */

import {
  getPuzzleNumber,
  loadMonthlyFile,
  getMonthForPuzzleNumber,
  type PuzzleWithId,
} from '@grid-games/shared';
import { PUZZLE_BASE_DATE, PUZZLE_BASE_DATE_STRING } from '@/config';
import type { SequentialPuzzle, Card, CardCount, Tuple, VisualMapping } from '@/types';
import { GAME_CONFIG } from '@/constants';

// Pool file interface
interface PoolFile {
  gameId: string;
  version?: number;
  generatedAt: string;
  puzzles: SequentialPuzzle[];
}

// Get base path for fetches (for Vercel deployment)
function getBasePath(): string {
  return typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_BASE_PATH || '')
    : '';
}

/**
 * Load a puzzle by its number from monthly assigned files.
 */
export async function loadPuzzleByNumber(puzzleNumber: number): Promise<SequentialPuzzle | null> {
  try {
    const monthKey = getMonthForPuzzleNumber(puzzleNumber, PUZZLE_BASE_DATE_STRING);
    const basePath = getBasePath();
    const data = await loadMonthlyFile<SequentialPuzzle & PuzzleWithId>(monthKey, 'trio', basePath);

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
 * Load today's puzzle.
 */
export async function loadTodayPuzzle(): Promise<SequentialPuzzle | null> {
  const puzzleNumber = getPuzzleNumber(PUZZLE_BASE_DATE);
  return loadPuzzleByNumber(puzzleNumber);
}

/**
 * Load a puzzle from the pool by index (for debug mode).
 */
export async function loadPoolPuzzle(index: number): Promise<SequentialPuzzle | null> {
  try {
    const basePath = getBasePath();
    const response = await fetch(`${basePath}/puzzles/pool.json`);
    if (!response.ok) return null;

    const data: PoolFile = await response.json();
    if (index >= 0 && index < data.puzzles.length) {
      return data.puzzles[index];
    }

    return null;
  } catch (error) {
    console.error('Failed to load pool puzzle:', error);
    return null;
  }
}

/**
 * Create a single card from a tuple using the visual mapping.
 */
export function createCardFromTuple(
  tuple: Tuple,
  visualMapping: VisualMapping,
  id: string,
  position: number
): Card {
  const [shapeIdx, colorIdx, patternIdx, countIdx] = tuple;

  return {
    id,
    tuple,
    shape: visualMapping.shapes[shapeIdx],
    color: visualMapping.colors[colorIdx],
    pattern: visualMapping.patterns[patternIdx],
    count: (countIdx + 1) as CardCount, // 0,1,2 -> 1,2,3
    position,
  };
}

/**
 * Create the initial cards for round 1.
 */
export function createInitialCards(puzzle: SequentialPuzzle): Card[] {
  const round1 = puzzle.rounds[0];
  if (!round1 || round1.tuples.length !== GAME_CONFIG.CARD_COUNT) {
    throw new Error(`Invalid puzzle: round 1 must have ${GAME_CONFIG.CARD_COUNT} tuples`);
  }

  return round1.tuples.map((tuple, index) =>
    createCardFromTuple(tuple, puzzle.visualMapping, `card-r1-${index}`, index)
  );
}

/**
 * Get the replacement cards for a given round.
 * Returns null for round 1 (no replacements).
 */
export function getReplacementCards(
  puzzle: SequentialPuzzle,
  round: number,
  positions: [number, number, number]
): Card[] | null {
  if (round < 2 || round > 5) return null;

  const roundData = puzzle.rounds[round - 1];
  if (!roundData || roundData.tuples.length !== 3) {
    throw new Error(`Invalid puzzle: round ${round} must have 3 replacement tuples`);
  }

  return roundData.tuples.map((tuple, index) =>
    createCardFromTuple(
      tuple,
      puzzle.visualMapping,
      `card-r${round}-${index}`,
      positions[index]
    )
  );
}

/**
 * Get the valid set indices for a given round.
 */
export function getValidSetIndices(puzzle: SequentialPuzzle, round: number): [number, number, number] {
  if (round < 1 || round > 5) {
    throw new Error(`Invalid round number: ${round}`);
  }
  return puzzle.rounds[round - 1].validSetIndices;
}

/**
 * Get today's puzzle number.
 */
export function getTodayPuzzleNumber(): number {
  return getPuzzleNumber(PUZZLE_BASE_DATE);
}

/**
 * Get the puzzle ID for a given puzzle number.
 * Used for archive page to verify completion status.
 */
export async function getPuzzleId(puzzleNumber: number): Promise<string | null> {
  const puzzle = await loadPuzzleByNumber(puzzleNumber);
  return puzzle?.id ?? null;
}

/**
 * Get puzzle IDs for a range of puzzle numbers.
 * Optimized for archive page loading.
 */
export async function getPuzzleIdsForRange(
  startNum: number,
  endNum: number
): Promise<Map<number, string>> {
  const {
    getPuzzleIdsForRange: getIdsForRange,
  } = await import('@grid-games/shared');

  const basePath = getBasePath();
  return getIdsForRange(startNum, endNum, PUZZLE_BASE_DATE_STRING, 'trio', basePath);
}
