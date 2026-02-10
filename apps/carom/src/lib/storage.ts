import { getPuzzleNumber } from '@grid-games/shared';
import { Piece, Move } from '@/types';

// Launch date for Carom - puzzle #1 starts on this date
const PUZZLE_BASE_DATE = new Date('2026-02-01');

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
  puzzleId?: string; // Unique puzzle identifier (for key generation)
  status: 'in-progress' | 'completed';
  data: {
    moveCount: number;
    moveHistory: Move[];
    // In-progress only
    pieces?: Piece[];
    // Completed only
    optimalMoves?: number;
    achievedOptimal?: boolean;
  };
}

/**
 * Get storage key for a puzzle
 * If puzzleId is provided, uses new format: carom-{puzzleNumber}-{puzzleId}
 * Otherwise uses legacy format: carom-{puzzleNumber}
 */
function getStorageKey(puzzleNumber: number, puzzleId?: string): string {
  if (puzzleId) {
    return `carom-${puzzleNumber}-${puzzleId}`;
  }
  return `carom-${puzzleNumber}`;
}

/**
 * Get puzzle state by puzzle number and optional puzzleId
 * If puzzleId is provided, looks for new key format first
 */
export function getPuzzleState(puzzleNumber: number, puzzleId?: string): CaromPuzzleState | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getStorageKey(puzzleNumber, puzzleId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as CaromPuzzleState;
  } catch (error) {
    console.warn('[carom] Failed to load puzzle state:', error);
    return null;
  }
}

/**
 * Find puzzle state by scanning localStorage for any matching key pattern
 * Used by archive pages to check completion status regardless of puzzleId
 */
export function findPuzzleState(puzzleNumber: number): CaromPuzzleState | null {
  if (typeof window === 'undefined') return null;

  try {
    // Look for keys matching carom-{puzzleNumber} or carom-{puzzleNumber}-*
    const prefix = `carom-${puzzleNumber}`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key === prefix || key.startsWith(`${prefix}-`))) {
        const stored = localStorage.getItem(key);
        if (stored) {
          return JSON.parse(stored) as CaromPuzzleState;
        }
      }
    }
    return null;
  } catch (error) {
    console.warn('[carom] Failed to find puzzle state:', error);
    return null;
  }
}

/**
 * Save puzzle state
 */
export function savePuzzleState(puzzleNumber: number, state: CaromPuzzleState, puzzleId?: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getStorageKey(puzzleNumber, puzzleId);
    // Include puzzleId in state for consistency
    const stateWithId = { ...state, puzzleId };
    localStorage.setItem(key, JSON.stringify(stateWithId));
  } catch (error) {
    console.warn('[carom] Failed to save puzzle state:', error);
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
    console.warn('[carom] Failed to clear puzzle state:', error);
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
 * Check if a puzzle was solved optimally (achieved optimal move count)
 */
export function didAchieveOptimal(puzzleNumber: number, puzzleId?: string): boolean {
  const state = getPuzzleState(puzzleNumber, puzzleId);
  return state?.status === 'completed' && state.data.achievedOptimal === true;
}

/**
 * Check if a puzzle was solved optimally (scanning for any matching key)
 * Used by archive pages to check optimal status regardless of puzzleId
 */
export function didAchieveOptimalAny(puzzleNumber: number): boolean {
  const state = findPuzzleState(puzzleNumber);
  return state?.status === 'completed' && state.data.achievedOptimal === true;
}

/**
 * Get the move count for a completed puzzle
 */
export function getCompletedMoveCount(puzzleNumber: number): number | null {
  const state = getPuzzleState(puzzleNumber);
  if (state?.status === 'completed') {
    return state.data.moveCount;
  }
  return null;
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
      achievedOptimal: moveCount === optimalMoves,
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
