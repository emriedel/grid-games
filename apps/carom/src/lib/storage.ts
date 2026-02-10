import { createArchiveStorage, type BasePuzzleState } from '@grid-games/shared';
import { Piece, Move } from '@/types';
import { CAROM_LAUNCH_DATE } from '@/config';

/**
 * Unified puzzle state - works for both daily and archive puzzles
 */
export interface CaromPuzzleState extends BasePuzzleState {
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

// Create the storage instance using the shared factory
const storage = createArchiveStorage<CaromPuzzleState>({
  gameId: 'carom',
  launchDate: CAROM_LAUNCH_DATE,
});

// Re-export all shared functions
export const {
  getStorageKey,
  getPuzzleState,
  findPuzzleState,
  savePuzzleState,
  clearPuzzleState,
  isPuzzleCompleted,
  isPuzzleCompletedAny,
  getSavedPuzzleId,
  isPuzzleInProgress,
  isPuzzleInProgressAny,
  getTodayPuzzleNumber,
} = storage;

// ============ Game-Specific Functions ============

/**
 * Check if a puzzle was solved optimally (achieved optimal move count)
 */
export function didAchieveOptimal(puzzleNumber: number, puzzleId?: string): boolean {
  const state = getPuzzleState(puzzleNumber, puzzleId);
  return state?.status === 'completed' && state.data.achievedOptimal === true;
}

/**
 * Check if a puzzle was solved optimally (scanning for any matching key)
 * @deprecated Use didAchieveOptimal with specific puzzleId for accuracy after puzzle regeneration
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

// ============ Legacy Compatibility Wrappers ============
// These are used by Game.tsx for loading/saving daily puzzle state

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
