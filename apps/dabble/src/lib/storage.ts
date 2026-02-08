import { getPuzzleNumber } from '@grid-games/shared';
import type { GameBoard, PlacedTile, Word, StarThresholds } from '@/types';
import { STAR_THRESHOLDS, getLetterUsageBonus } from '@/constants/gameConfig';
import { PUZZLE_BASE_DATE } from '@/config';

/**
 * Get today's puzzle number
 */
export function getTodayPuzzleNumber(): number {
  return getPuzzleNumber(PUZZLE_BASE_DATE);
}

/**
 * Unified puzzle state - works for both daily and archive puzzles
 */
export interface DabblePuzzleState {
  puzzleNumber: number;
  status: 'in-progress' | 'completed';
  data: {
    board: GameBoard;
    rackLetters: string[];
    submittedWords: Word[];
    lockedRackIndices: number[];
    totalScore: number;
    // In-progress only fields (optional for completed)
    placedTiles?: PlacedTile[];
    usedRackIndices?: number[];
    turnCount?: number;
    // Star thresholds (stored on completion for archive display)
    thresholds?: StarThresholds;
  };
}

/**
 * Get storage key for a puzzle
 */
function getStorageKey(puzzleNumber: number): string {
  return `dabble-${puzzleNumber}`;
}

/**
 * Get puzzle state by puzzle number
 */
export function getPuzzleState(puzzleNumber: number): DabblePuzzleState | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getStorageKey(puzzleNumber);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as DabblePuzzleState;
  } catch (error) {
    console.warn('[dabble] Failed to load puzzle state:', error);
    return null;
  }
}

/**
 * Save puzzle state
 */
export function savePuzzleState(puzzleNumber: number, state: DabblePuzzleState): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getStorageKey(puzzleNumber);
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.warn('[dabble] Failed to save puzzle state:', error);
  }
}

/**
 * Clear puzzle state
 */
export function clearPuzzleState(puzzleNumber: number): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getStorageKey(puzzleNumber);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('[dabble] Failed to clear puzzle state:', error);
  }
}

/**
 * Check if a puzzle is completed
 */
export function isPuzzleCompleted(puzzleNumber: number): boolean {
  const state = getPuzzleState(puzzleNumber);
  return state?.status === 'completed';
}

/**
 * Check if a puzzle is in progress
 */
export function isPuzzleInProgress(puzzleNumber: number): boolean {
  const state = getPuzzleState(puzzleNumber);
  return state?.status === 'in-progress';
}

/**
 * Get score for a completed puzzle (including letter bonus)
 */
export function getPuzzleScore(puzzleNumber: number): number | null {
  const state = getPuzzleState(puzzleNumber);
  if (state?.status !== 'completed') return null;
  const lettersUsed = state.data.lockedRackIndices?.length ?? 0;
  const letterBonus = getLetterUsageBonus(lettersUsed);
  return state.data.totalScore + letterBonus;
}

/**
 * Get stars for a completed puzzle (0-3)
 * Calculates star thresholds at runtime using config percentages
 */
export function getPuzzleStars(puzzleNumber: number): number {
  const state = getPuzzleState(puzzleNumber);
  if (state?.status !== 'completed') return 0;

  const thresholds = state.data.thresholds;
  if (!thresholds) return 0;

  const { heuristicMax } = thresholds;
  const star1 = Math.round(heuristicMax * STAR_THRESHOLDS.star1Percent);
  const star2 = Math.round(heuristicMax * STAR_THRESHOLDS.star2Percent);
  const star3 = Math.round(heuristicMax * STAR_THRESHOLDS.star3Percent);

  // Include letter usage bonus in score calculation (matches results modal)
  const lettersUsed = state.data.lockedRackIndices?.length ?? 0;
  const letterBonus = getLetterUsageBonus(lettersUsed);
  const score = state.data.totalScore + letterBonus;

  if (score >= star3) return 3;
  if (score >= star2) return 2;
  if (score >= star1) return 1;
  return 0;
}
