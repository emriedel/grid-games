import { createArchiveStorage, type BasePuzzleState } from '@grid-games/shared';
import { SquareState, Rotation, GuessFeedback } from '@/types';
import { PUZZLE_BASE_DATE } from '@/constants/gameConfig';

/**
 * Unified puzzle state for Edgewise - works for both daily and archive puzzles
 */
export interface EdgewisePuzzleState extends BasePuzzleState {
  puzzleNumber: number;
  puzzleId?: string;
  status: 'in-progress' | 'completed';
  data: {
    // Square rotations (indices into puzzle.squares after group rotations applied)
    squareRotations: Rotation[];
    // Number of guesses used
    guessesUsed: number;
    // History of feedback from each guess
    feedbackHistory: GuessFeedback[];
    // Whether puzzle was solved (only set on completion)
    solved?: boolean;
    // Square ordering after group rotations (tracks position changes)
    squareOrder?: number[];
  };
}

// Create the storage instance using the shared factory
const storage = createArchiveStorage<EdgewisePuzzleState>({
  gameId: 'edgewise',
  launchDate: PUZZLE_BASE_DATE,
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

// ============ Game-Specific Helper Functions ============

/**
 * Save game progress (in-progress state)
 */
export function saveGameProgress(
  puzzleNumber: number,
  squares: SquareState[],
  guessesUsed: number,
  feedbackHistory: GuessFeedback[],
  puzzleId?: string
): void {
  const state: EdgewisePuzzleState = {
    puzzleNumber,
    puzzleId,
    status: 'in-progress',
    data: {
      squareRotations: squares.map(s => s.rotation),
      guessesUsed,
      feedbackHistory,
    },
  };
  savePuzzleState(puzzleNumber, state, puzzleId);
}

/**
 * Save game completion
 */
export function saveGameCompletion(
  puzzleNumber: number,
  squares: SquareState[],
  guessesUsed: number,
  feedbackHistory: GuessFeedback[],
  solved: boolean,
  puzzleId?: string
): void {
  const state: EdgewisePuzzleState = {
    puzzleNumber,
    puzzleId,
    status: 'completed',
    data: {
      squareRotations: squares.map(s => s.rotation),
      guessesUsed,
      feedbackHistory,
      solved,
    },
  };
  savePuzzleState(puzzleNumber, state, puzzleId);
}

/**
 * Get result for today's puzzle
 * Returns null if not completed today
 */
export function getTodayResult(): {
  solved: boolean;
  guessesUsed: number;
  feedbackHistory: GuessFeedback[];
} | null {
  const puzzleNumber = getTodayPuzzleNumber();
  const state = findPuzzleState(puzzleNumber);

  if (state?.status === 'completed') {
    return {
      solved: state.data.solved ?? false,
      guessesUsed: state.data.guessesUsed,
      feedbackHistory: state.data.feedbackHistory,
    };
  }
  return null;
}

/**
 * Get in-progress state for today's puzzle
 */
export function getTodayInProgress(): {
  squareRotations: Rotation[];
  guessesUsed: number;
  feedbackHistory: GuessFeedback[];
} | null {
  const puzzleNumber = getTodayPuzzleNumber();
  const state = findPuzzleState(puzzleNumber);

  if (state?.status === 'in-progress') {
    return {
      squareRotations: state.data.squareRotations,
      guessesUsed: state.data.guessesUsed,
      feedbackHistory: state.data.feedbackHistory,
    };
  }
  return null;
}

/**
 * Restore squares from saved state rotations
 */
export function restoreSquaresFromRotations(
  baseSquares: SquareState[],
  rotations: Rotation[]
): SquareState[] {
  return baseSquares.map((square, index) => ({
    ...square,
    rotation: rotations[index] ?? square.rotation,
  }));
}

/**
 * Clear today's puzzle state (for try again functionality)
 */
export function clearTodayPuzzle(): void {
  const puzzleNumber = getTodayPuzzleNumber();
  // Find and clear any state for this puzzle number
  const state = findPuzzleState(puzzleNumber);
  if (state?.puzzleId) {
    clearPuzzleState(puzzleNumber, state.puzzleId);
  }
  // Also try clearing without puzzleId (legacy format)
  clearPuzzleState(puzzleNumber);
}
