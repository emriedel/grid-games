import { createArchiveStorage, type BasePuzzleState } from '@grid-games/shared';
import { PUZZLE_BASE_DATE } from '@/config';
import { FoundWord } from '@/types';

/**
 * Jumble puzzle state for archive storage
 */
export interface JumblePuzzleState extends BasePuzzleState {
  puzzleNumber: number;
  puzzleId?: string;
  status: 'in-progress' | 'completed';
  data: {
    foundWords: FoundWord[];
    // In-progress only
    timeRemaining?: number;
    // Completed only
    totalPossibleWords?: number;
    score?: number;
    maxPossibleScore?: number;
    stars?: number; // For archive display
  };
}

// Create storage instance using the shared factory
const storage = createArchiveStorage<JumblePuzzleState>({
  gameId: 'jumble',
  launchDate: PUZZLE_BASE_DATE,
});

// Re-export storage functions
export const {
  getStorageKey,
  getPuzzleState,
  findPuzzleState,
  savePuzzleState,
  clearPuzzleState,
  isPuzzleCompleted,
  isPuzzleInProgress,
  getSavedPuzzleId,
  getTodayPuzzleNumber,
  // Keep deprecated functions for backward compatibility
  isPuzzleCompletedAny,
  isPuzzleInProgressAny,
} = storage;

/**
 * Get stars for a completed puzzle
 */
export function getPuzzleStars(puzzleNumber: number): number | null {
  const state = findPuzzleState(puzzleNumber);
  if (state?.status === 'completed' && state.data.stars !== undefined) {
    return state.data.stars;
  }
  return null;
}

/**
 * Get score for a completed puzzle
 */
export function getPuzzleScore(puzzleNumber: number): number | null {
  const state = findPuzzleState(puzzleNumber);
  if (state?.status === 'completed' && state.data.score !== undefined) {
    return state.data.score;
  }
  return null;
}

// ============ Legacy compatibility wrappers ============

/** Legacy interface for daily results */
export interface DailyResult {
  puzzleNumber: number;
  date: string;
  foundWords: FoundWord[];
  totalPossibleWords: number;
  score: number;
  maxPossibleScore: number;
}

/**
 * Check if today has been played (legacy compatibility)
 */
export function hasPlayedToday(): boolean {
  return isPuzzleCompletedAny(getTodayPuzzleNumber());
}

/**
 * Check if there's an in-progress game (legacy compatibility)
 */
export function hasInProgressGame(): boolean {
  return isPuzzleInProgressAny(getTodayPuzzleNumber());
}

/**
 * Get today's result (legacy compatibility)
 */
export function getTodayResult(): DailyResult | null {
  const puzzleNumber = getTodayPuzzleNumber();
  const state = findPuzzleState(puzzleNumber);
  if (state?.status === 'completed') {
    return {
      puzzleNumber,
      date: '',
      foundWords: state.data.foundWords,
      totalPossibleWords: state.data.totalPossibleWords ?? 0,
      score: state.data.score ?? 0,
      maxPossibleScore: state.data.maxPossibleScore ?? 0,
    };
  }
  return null;
}

/**
 * Save daily result (legacy compatibility)
 */
export function saveDailyResult(result: DailyResult, puzzleId?: string): void {
  const puzzleNumber = result.puzzleNumber || getTodayPuzzleNumber();
  savePuzzleState(
    puzzleNumber,
    {
      puzzleNumber,
      puzzleId,
      status: 'completed',
      data: {
        foundWords: result.foundWords,
        totalPossibleWords: result.totalPossibleWords,
        score: result.score,
        maxPossibleScore: result.maxPossibleScore,
      },
    },
    puzzleId
  );
}

/** Legacy interface for in-progress state */
interface InProgressState {
  date: string;
  foundWords: FoundWord[];
  timeRemaining: number;
}

/**
 * Get in-progress state (legacy compatibility)
 */
export function getInProgressState(): InProgressState | null {
  const puzzleNumber = getTodayPuzzleNumber();
  const state = findPuzzleState(puzzleNumber);
  if (state?.status === 'in-progress') {
    return {
      date: '',
      foundWords: state.data.foundWords,
      timeRemaining: state.data.timeRemaining ?? 0,
    };
  }
  return null;
}

/**
 * Save in-progress state (legacy compatibility)
 */
export function saveInProgressState(
  foundWords: FoundWord[],
  timeRemaining: number,
  puzzleId?: string
): void {
  const puzzleNumber = getTodayPuzzleNumber();
  savePuzzleState(
    puzzleNumber,
    {
      puzzleNumber,
      puzzleId,
      status: 'in-progress',
      data: {
        foundWords,
        timeRemaining,
      },
    },
    puzzleId
  );
}

/**
 * Clear in-progress state (legacy compatibility)
 */
export function clearInProgressState(): void {
  // Don't clear - the state transitions to 'completed'
  // This is called after saveDailyResult
}
