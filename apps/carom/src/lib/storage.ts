import { getPuzzleNumber } from '@grid-games/shared';
import { Piece, Move } from '@/types';

// Launch date for Carom - puzzle #1 starts on this date
const PUZZLE_BASE_DATE = new Date('2026-01-30');

/**
 * Get today's puzzle number
 */
export function getTodayPuzzleNumber(): number {
  return getPuzzleNumber(PUZZLE_BASE_DATE);
}

/**
 * Unified puzzle state - works for both daily and archive puzzles
 */
export interface CaromPuzzleState {
  puzzleNumber: number;
  status: 'in-progress' | 'completed';
  data: {
    moveCount: number;
    moveHistory: Move[];
    // In-progress only
    pieces?: Piece[];
    // Completed only
    optimalMoves?: number;
  };
}

/**
 * Get storage key for a puzzle
 */
function getStorageKey(puzzleNumber: number): string {
  return `carom-${puzzleNumber}`;
}

/**
 * Get puzzle state by puzzle number
 */
export function getPuzzleState(puzzleNumber: number): CaromPuzzleState | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getStorageKey(puzzleNumber);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as CaromPuzzleState;
  } catch (error) {
    console.warn('[carom] Failed to load puzzle state:', error);
    return null;
  }
}

/**
 * Save puzzle state
 */
export function savePuzzleState(puzzleNumber: number, state: CaromPuzzleState): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getStorageKey(puzzleNumber);
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.warn('[carom] Failed to save puzzle state:', error);
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
    console.warn('[carom] Failed to clear puzzle state:', error);
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

// ============ Legacy compatibility wrappers ============

/** Legacy completion state interface */
interface CompletionState {
  date: string;
  moveCount: number;
  optimalMoves: number;
  moveHistory: Move[];
}

/** Legacy in-progress state interface */
interface InProgressState {
  date: string;
  pieces: Piece[];
  moveCount: number;
  moveHistory: Move[];
}

/**
 * Save game completion (legacy compatibility)
 */
export function saveGameCompletion(moveCount: number, optimalMoves: number, moveHistory: Move[]): void {
  const puzzleNumber = getTodayPuzzleNumber();
  savePuzzleState(puzzleNumber, {
    puzzleNumber,
    status: 'completed',
    data: {
      moveCount,
      optimalMoves,
      moveHistory,
    },
  });
}

/**
 * Get today's completion state (legacy compatibility)
 */
export function getCompletionState(): CompletionState | null {
  const puzzleNumber = getTodayPuzzleNumber();
  const state = getPuzzleState(puzzleNumber);
  if (state?.status === 'completed') {
    return {
      date: '', // Date is not stored in new format
      moveCount: state.data.moveCount,
      optimalMoves: state.data.optimalMoves ?? 0,
      moveHistory: state.data.moveHistory,
    };
  }
  return null;
}

/**
 * Save in-progress state (legacy compatibility)
 */
export function saveInProgressState(pieces: Piece[], moveCount: number, moveHistory: Move[]): void {
  const puzzleNumber = getTodayPuzzleNumber();
  savePuzzleState(puzzleNumber, {
    puzzleNumber,
    status: 'in-progress',
    data: {
      pieces,
      moveCount,
      moveHistory,
    },
  });
}

/**
 * Get today's in-progress state (legacy compatibility)
 */
export function getInProgressState(): InProgressState | null {
  const puzzleNumber = getTodayPuzzleNumber();
  const state = getPuzzleState(puzzleNumber);
  if (state?.status === 'in-progress') {
    return {
      date: '', // Date is not stored in new format
      pieces: state.data.pieces ?? [],
      moveCount: state.data.moveCount,
      moveHistory: state.data.moveHistory,
    };
  }
  return null;
}

/**
 * Clear in-progress state (legacy compatibility)
 */
export function clearInProgressState(): void {
  // Don't clear - the state transitions to 'completed'
}

/**
 * Check if today's puzzle was already completed (legacy compatibility)
 */
export function isTodayCompleted(): boolean {
  return isPuzzleCompleted(getTodayPuzzleNumber());
}

/**
 * Check if there's an in-progress game for today (legacy compatibility)
 */
export function hasInProgressGame(): boolean {
  return isPuzzleInProgress(getTodayPuzzleNumber());
}

/**
 * Clear all stored state (for testing/debug)
 */
export function clearStoredState(): void {
  if (typeof window === 'undefined') return;
  clearPuzzleState(getTodayPuzzleNumber());
}

/**
 * Legacy compatibility alias
 */
export function getTodayGameState(): CompletionState | null {
  return getCompletionState();
}
