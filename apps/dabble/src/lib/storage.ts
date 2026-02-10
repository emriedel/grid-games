import { createArchiveStorage, type BasePuzzleState } from '@grid-games/shared';
import type { GameBoard, PlacedTile, Word, StarThresholds } from '@/types';
import { STAR_THRESHOLDS, getLetterUsageBonus } from '@/constants/gameConfig';
import { PUZZLE_BASE_DATE } from '@/config';

/**
 * Unified puzzle state - works for both daily and archive puzzles
 */
export interface DabblePuzzleState extends BasePuzzleState {
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

// Create the storage instance using the shared factory
const storage = createArchiveStorage<DabblePuzzleState>({
  gameId: 'dabble',
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

// ============ Game-Specific Functions ============

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
