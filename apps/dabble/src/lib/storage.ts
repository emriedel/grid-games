import { getPuzzleNumber } from '@grid-games/shared';
import type { GameBoard, PlacedTile, Word, StarThresholds } from '@/types';

// Base date for puzzle numbering (first puzzle date)
const PUZZLE_BASE_DATE = new Date('2026-01-01');

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
 * Get stars for a completed puzzle (0-3)
 */
export function getPuzzleStars(puzzleNumber: number): number {
  const state = getPuzzleState(puzzleNumber);
  if (state?.status !== 'completed') return 0;

  const thresholds = state.data.thresholds;
  if (!thresholds) return 0;

  const score = state.data.totalScore;
  if (score >= thresholds.star3) return 3;
  if (score >= thresholds.star2) return 2;
  if (score >= thresholds.star1) return 1;
  return 0;
}

// ============ Legacy compatibility wrappers ============

/**
 * Check if today's puzzle is completed
 */
export function hasCompletedToday(): boolean {
  return isPuzzleCompleted(getTodayPuzzleNumber());
}

/**
 * Check if there's an in-progress game for today
 */
export function hasInProgressGame(): boolean {
  return isPuzzleInProgress(getTodayPuzzleNumber());
}

/**
 * Get today's completion state (legacy compatibility)
 */
export function getCompletionState(): DabblePuzzleState['data'] | null {
  const state = getPuzzleState(getTodayPuzzleNumber());
  if (state?.status === 'completed') {
    return state.data;
  }
  return null;
}

/**
 * Get today's in-progress state (legacy compatibility)
 */
export function getInProgressState(): DabblePuzzleState['data'] | null {
  const state = getPuzzleState(getTodayPuzzleNumber());
  if (state?.status === 'in-progress') {
    return state.data;
  }
  return null;
}

/**
 * Save completion state (legacy compatibility)
 */
export function saveCompletionState(data: {
  date: string;
  board: GameBoard;
  submittedWords: Word[];
  lockedRackIndices: number[];
  totalScore: number;
}): void {
  const puzzleNumber = getTodayPuzzleNumber();
  savePuzzleState(puzzleNumber, {
    puzzleNumber,
    status: 'completed',
    data: {
      board: data.board,
      rackLetters: [], // Not needed for completed state
      submittedWords: data.submittedWords,
      lockedRackIndices: data.lockedRackIndices,
      totalScore: data.totalScore,
    },
  });
}

/**
 * Save in-progress state (legacy compatibility)
 */
export function saveInProgressState(data: {
  board: GameBoard;
  rackLetters: string[];
  placedTiles: PlacedTile[];
  usedRackIndices: number[];
  lockedRackIndices: number[];
  submittedWords: Word[];
  turnCount: number;
  totalScore: number;
}): void {
  const puzzleNumber = getTodayPuzzleNumber();
  savePuzzleState(puzzleNumber, {
    puzzleNumber,
    status: 'in-progress',
    data: {
      board: data.board,
      rackLetters: data.rackLetters,
      submittedWords: data.submittedWords,
      lockedRackIndices: data.lockedRackIndices,
      totalScore: data.totalScore,
      placedTiles: data.placedTiles,
      usedRackIndices: data.usedRackIndices,
      turnCount: data.turnCount,
    },
  });
}

/**
 * Clear in-progress state for today (legacy compatibility)
 */
export function clearInProgressState(): void {
  // Don't clear - the state is preserved as 'completed'
  // This function is called after saveCompletionState, so it's already transitioned
}

/**
 * Clear all state (debug/testing)
 */
export function clearAllState(): void {
  if (typeof window === 'undefined') return;

  try {
    clearPuzzleState(getTodayPuzzleNumber());
  } catch (error) {
    console.warn('[dabble] Failed to clear all state:', error);
  }
}
