/**
 * Storage utilities for Trio game state persistence.
 *
 * Uses the createArchiveStorage factory from @grid-games/shared.
 *
 * Sequential Draw Mode storage:
 * - Saves current round, round outcomes, and current board state
 * - Tracks hint usage per round and all trios (found + missed)
 */

import { createArchiveStorage, type BasePuzzleState } from '@grid-games/shared';
import type { Tuple, RoundOutcome } from '@/types';

// Define Trio-specific puzzle state
export interface TrioPuzzleState extends BasePuzzleState {
  puzzleNumber: number;
  puzzleId?: string;
  status: 'in-progress' | 'completed';
  data: {
    currentRound: number;
    currentCardTuples: Tuple[];      // Current 9 cards as tuples (in position order 0-8)
    roundOutcomes: RoundOutcome[];   // 5 outcomes (one per round)
    hintUsedInRound: boolean[];      // 5 booleans (one per round)
    allTrioTuples: Tuple[][];        // All trios' tuples (found + missed)
    selectedCardIds?: string[];
    lastFoundSetTuples?: Tuple[];    // Last found trio's tuples (for resume display)
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
  currentCardTuples: Tuple[],
  roundOutcomes: RoundOutcome[],
  hintUsedInRound: boolean[],
  allTrioTuples: Tuple[][],
  selectedCardIds: string[],
  puzzleId?: string,
  lastFoundSetTuples?: Tuple[]
): void {
  const state: TrioPuzzleState = {
    puzzleNumber,
    puzzleId,
    status: 'in-progress',
    data: {
      currentRound,
      currentCardTuples,
      roundOutcomes,
      hintUsedInRound,
      allTrioTuples,
      selectedCardIds,
      lastFoundSetTuples,
    },
  };
  savePuzzleState(puzzleNumber, state, puzzleId);
}

/**
 * Save completed game state.
 */
export function saveCompletedState(
  puzzleNumber: number,
  roundOutcomes: RoundOutcome[],
  hintUsedInRound: boolean[],
  allTrioTuples: Tuple[][],
  puzzleId?: string
): void {
  const state: TrioPuzzleState = {
    puzzleNumber,
    puzzleId,
    status: 'completed',
    data: {
      currentRound: 5,
      currentCardTuples: [], // Not needed for completed state
      roundOutcomes,
      hintUsedInRound,
      allTrioTuples,
    },
  };
  savePuzzleState(puzzleNumber, state, puzzleId);
}
