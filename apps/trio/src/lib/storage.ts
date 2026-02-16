/**
 * Storage utilities for Trio game state persistence.
 *
 * Uses the createArchiveStorage factory from @grid-games/shared.
 *
 * Sequential Draw Mode storage:
 * - Saves current round, found sets, and current board state
 * - Tracks incorrect guesses, hints used, and guess history
 */

import { createArchiveStorage, type BasePuzzleState } from '@grid-games/shared';
import type { FoundSet, Tuple, GuessAttempt } from '@/types';

// Define Trio-specific puzzle state
export interface TrioPuzzleState extends BasePuzzleState {
  puzzleNumber: number;
  puzzleId?: string;
  status: 'in-progress' | 'completed';
  data: {
    // In-progress state
    currentRound: number;
    foundSets: FoundSet[];
    currentCardTuples: Tuple[];   // Current 12 cards as tuples
    incorrectGuesses: number;
    guessHistory: GuessAttempt[];
    hintsUsed: number;
    hintedCardIds: string[];
    selectedCardIds?: string[];
    // Completion state
    won?: boolean;
  };
}

// Launch date for Trio
const LAUNCH_DATE = new Date('2026-02-01T00:00:00');

// Create storage instance
const storage = createArchiveStorage<TrioPuzzleState>({
  gameId: 'trio',
  launchDate: LAUNCH_DATE,
});

// Re-export all storage functions
export const {
  getPuzzleState,
  findPuzzleState,
  savePuzzleState,
  clearPuzzleState,
  isPuzzleCompleted,
  isPuzzleInProgress,
  getSavedPuzzleId,
  getTodayPuzzleNumber,
} = storage;

/**
 * Save in-progress game state.
 */
export function saveInProgressState(
  puzzleNumber: number,
  currentRound: number,
  foundSets: FoundSet[],
  currentCardTuples: Tuple[],
  incorrectGuesses: number,
  guessHistory: GuessAttempt[],
  hintsUsed: number,
  hintedCardIds: string[],
  selectedCardIds: string[],
  puzzleId?: string
): void {
  const state: TrioPuzzleState = {
    puzzleNumber,
    puzzleId,
    status: 'in-progress',
    data: {
      currentRound,
      foundSets,
      currentCardTuples,
      incorrectGuesses,
      guessHistory,
      hintsUsed,
      hintedCardIds,
      selectedCardIds,
    },
  };
  savePuzzleState(puzzleNumber, state, puzzleId);
}

/**
 * Save completed game state.
 */
export function saveCompletedState(
  puzzleNumber: number,
  currentRound: number,
  foundSets: FoundSet[],
  incorrectGuesses: number,
  guessHistory: GuessAttempt[],
  hintsUsed: number,
  won: boolean,
  puzzleId?: string
): void {
  const state: TrioPuzzleState = {
    puzzleNumber,
    puzzleId,
    status: 'completed',
    data: {
      currentRound,
      foundSets,
      currentCardTuples: [], // Not needed for completed state
      incorrectGuesses,
      guessHistory,
      hintsUsed,
      hintedCardIds: [],
      won,
    },
  };
  savePuzzleState(puzzleNumber, state, puzzleId);
}
