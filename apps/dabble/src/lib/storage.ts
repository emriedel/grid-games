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
  puzzleId?: string; // Unique puzzle identifier (for key generation)
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
 * If puzzleId is provided, uses new format: dabble-{puzzleNumber}-{puzzleId}
 * Otherwise uses legacy format: dabble-{puzzleNumber}
 */
function getStorageKey(puzzleNumber: number, puzzleId?: string): string {
  if (puzzleId) {
    return `dabble-${puzzleNumber}-${puzzleId}`;
  }
  return `dabble-${puzzleNumber}`;
}

/**
 * Get puzzle state by puzzle number and optional puzzleId
 * If puzzleId is provided, looks for new key format first
 */
export function getPuzzleState(puzzleNumber: number, puzzleId?: string): DabblePuzzleState | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getStorageKey(puzzleNumber, puzzleId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as DabblePuzzleState;
  } catch (error) {
    console.warn('[dabble] Failed to load puzzle state:', error);
    return null;
  }
}

/**
 * Find puzzle state by scanning localStorage for any matching key pattern
 * Used by archive pages to check completion status regardless of puzzleId
 */
export function findPuzzleState(puzzleNumber: number): DabblePuzzleState | null {
  if (typeof window === 'undefined') return null;

  try {
    // Look for keys matching dabble-{puzzleNumber} or dabble-{puzzleNumber}-*
    const prefix = `dabble-${puzzleNumber}`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key === prefix || key.startsWith(`${prefix}-`))) {
        const stored = localStorage.getItem(key);
        if (stored) {
          return JSON.parse(stored) as DabblePuzzleState;
        }
      }
    }
    return null;
  } catch (error) {
    console.warn('[dabble] Failed to find puzzle state:', error);
    return null;
  }
}

/**
 * Save puzzle state
 */
export function savePuzzleState(puzzleNumber: number, state: DabblePuzzleState, puzzleId?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getStorageKey(puzzleNumber, puzzleId);
    // Include puzzleId in state for consistency
    const stateWithId = { ...state, puzzleId };
    localStorage.setItem(key, JSON.stringify(stateWithId));
  } catch (error) {
    console.warn('[dabble] Failed to save puzzle state:', error);
  }
}

/**
 * Clear puzzle state
 */
export function clearPuzzleState(puzzleNumber: number, puzzleId?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getStorageKey(puzzleNumber, puzzleId);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('[dabble] Failed to clear puzzle state:', error);
  }
}

/**
 * Check if a puzzle is completed (with specific puzzleId)
 */
export function isPuzzleCompleted(puzzleNumber: number, puzzleId?: string): boolean {
  const state = getPuzzleState(puzzleNumber, puzzleId);
  return state?.status === 'completed';
}

/**
 * Check if a puzzle is completed (scanning for any matching key)
 * Used by archive pages to check completion status regardless of puzzleId
 */
export function isPuzzleCompletedAny(puzzleNumber: number): boolean {
  const state = findPuzzleState(puzzleNumber);
  return state?.status === 'completed';
}

/**
 * Check if a puzzle is in progress (with specific puzzleId)
 */
export function isPuzzleInProgress(puzzleNumber: number, puzzleId?: string): boolean {
  const state = getPuzzleState(puzzleNumber, puzzleId);
  return state?.status === 'in-progress';
}

/**
 * Check if a puzzle is in progress (scanning for any matching key)
 * Used by archive pages to check in-progress status regardless of puzzleId
 */
export function isPuzzleInProgressAny(puzzleNumber: number): boolean {
  const state = findPuzzleState(puzzleNumber);
  return state?.status === 'in-progress';
}

/**
 * Get score for a completed puzzle (including letter bonus)
 * Uses findPuzzleState to scan for any matching key
 */
export function getPuzzleScore(puzzleNumber: number): number | null {
  const state = findPuzzleState(puzzleNumber);
  if (state?.status !== 'completed') return null;
  const lettersUsed = state.data.lockedRackIndices?.length ?? 0;
  const letterBonus = getLetterUsageBonus(lettersUsed);
  return state.data.totalScore + letterBonus;
}

/**
 * Get stars for a completed puzzle (0-3)
 * Calculates star thresholds at runtime using config percentages
 * Uses findPuzzleState to scan for any matching key
 */
export function getPuzzleStars(puzzleNumber: number): number {
  const state = findPuzzleState(puzzleNumber);
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
