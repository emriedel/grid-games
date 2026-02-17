/**
 * Tessera Storage Module
 *
 * Handles persistence of game state using the shared archive storage pattern.
 */

import { createArchiveStorage, type BasePuzzleState } from '@grid-games/shared';
import type { PlacedPiece, Rotation, GameState } from '@/types';

export interface TesseraPuzzleState extends BasePuzzleState {
  puzzleNumber: number;
  puzzleId?: string;
  status: 'in-progress' | 'completed';
  data: {
    placedPieces: PlacedPiece[];
    pieceRotations: Record<string, Rotation>;
  };
}

const LAUNCH_DATE = new Date('2026-03-01T00:00:00');

const storage = createArchiveStorage<TesseraPuzzleState>({
  gameId: 'tessera',
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

  savePuzzleState(puzzleNumber, {
    puzzleNumber,
    puzzleId,
    status: 'in-progress',
    data: {
      placedPieces: state.placedPieces,
      pieceRotations,
    },
  });
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

  savePuzzleState(puzzleNumber, {
    puzzleNumber,
    puzzleId,
    status: 'completed',
    data: {
      placedPieces: state.placedPieces,
      pieceRotations,
    },
  });
}

/**
 * Check if a puzzle is completed (any version)
 */
export function hasCompletedPuzzle(puzzleNumber: number, puzzleId?: string): boolean {
  return isPuzzleCompleted(puzzleNumber, puzzleId);
}

/**
 * Check if there's an in-progress game (any version)
 */
export function hasInProgressGame(puzzleNumber: number, puzzleId?: string): boolean {
  return isPuzzleInProgress(puzzleNumber, puzzleId);
}

/**
 * Get saved puzzle state
 */
export function getSavedState(puzzleNumber: number, puzzleId?: string): TesseraPuzzleState | null {
  return getPuzzleState(puzzleNumber, puzzleId);
}
