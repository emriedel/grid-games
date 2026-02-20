/**
 * Inlay Storage Module
 *
 * Handles persistence of game state using the shared archive storage pattern.
 */

import { createArchiveStorage, type BasePuzzleState } from '@grid-games/shared';
import type { PlacedPiece, Rotation, GameState } from '@/types';

export interface InlayPuzzleState extends BasePuzzleState {
  puzzleNumber: number;
  puzzleId?: string;
  status: 'in-progress' | 'completed';
  data: {
    placedPieces: PlacedPiece[];
    pieceRotations: Record<string, Rotation>;
  };
}

const LAUNCH_DATE = new Date('2026-02-01T00:00:00');

const storage = createArchiveStorage<InlayPuzzleState>({
  gameId: 'inlay',
  launchDate: LAUNCH_DATE,
});

// Re-export storage functions
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
 * Save in-progress game state
 */
export function saveInProgressState(
  puzzleNumber: number,
  state: GameState,
  puzzleId?: string
): void {
  if (!state.puzzle) return;

  const pieceRotations: Record<string, Rotation> = {};
  for (const piece of state.placedPieces) {
    pieceRotations[piece.pentominoId] = piece.rotation;
  }

  // Pass puzzleId as third argument so it's included in the storage key
  savePuzzleState(puzzleNumber, {
    puzzleNumber,
    puzzleId,
    status: 'in-progress',
    data: {
      placedPieces: state.placedPieces,
      pieceRotations,
    },
  }, puzzleId);
}

/**
 * Save completed game state
 */
export function saveCompletedState(
  puzzleNumber: number,
  state: GameState,
  puzzleId?: string
): void {
  if (!state.puzzle) return;

  const pieceRotations: Record<string, Rotation> = {};
  for (const piece of state.placedPieces) {
    pieceRotations[piece.pentominoId] = piece.rotation;
  }

  // Pass puzzleId as third argument so it's included in the storage key
  savePuzzleState(puzzleNumber, {
    puzzleNumber,
    puzzleId,
    status: 'completed',
    data: {
      placedPieces: state.placedPieces,
      pieceRotations,
    },
  }, puzzleId);
}

/**
 * Check if a puzzle is completed (any version)
 * Uses getSavedState for backward compatibility
 */
export function hasCompletedPuzzle(puzzleNumber: number, puzzleId?: string): boolean {
  const state = getSavedState(puzzleNumber, puzzleId);
  return state?.status === 'completed';
}

/**
 * Check if there's an in-progress game (any version)
 * Uses getSavedState for backward compatibility
 */
export function hasInProgressGame(puzzleNumber: number, puzzleId?: string): boolean {
  const state = getSavedState(puzzleNumber, puzzleId);
  return state?.status === 'in-progress';
}

/**
 * Get saved puzzle state
 * Uses findPuzzleState for backward compatibility with old saves that didn't include puzzleId in key
 */
export function getSavedState(puzzleNumber: number, puzzleId?: string): InlayPuzzleState | null {
  // First try exact match with puzzleId
  if (puzzleId) {
    const exactMatch = getPuzzleState(puzzleNumber, puzzleId);
    if (exactMatch) return exactMatch;
  }
  // Fall back to scanning for any matching key (backward compatibility)
  return findPuzzleState(puzzleNumber);
}
