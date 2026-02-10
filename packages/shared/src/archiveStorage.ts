/**
 * Archive-enabled game storage factory
 *
 * Provides a standardized storage pattern for games that support:
 * - Daily puzzles with puzzle numbering
 * - Archive pages showing past puzzle completion status
 * - PuzzleId-based storage keys for regeneration safety
 *
 * @example
 * ```ts
 * import { createArchiveStorage } from '@grid-games/shared';
 *
 * interface MyPuzzleState {
 *   puzzleNumber: number;
 *   puzzleId?: string;
 *   status: 'in-progress' | 'completed';
 *   data: { score: number; moves: string[] };
 * }
 *
 * const storage = createArchiveStorage<MyPuzzleState>({
 *   gameId: 'mygame',
 *   launchDate: new Date('2026-02-01T00:00:00'),
 * });
 *
 * // Use the storage functions
 * storage.savePuzzleState(1, state, 'puzzle-id-123');
 * const loaded = storage.getPuzzleState(1, 'puzzle-id-123');
 * ```
 */

import { getPuzzleNumber } from './date';

/**
 * Configuration for creating archive storage
 */
export interface ArchiveStorageConfig {
  /** Unique game identifier (e.g., 'dabble', 'carom') - used as storage key prefix */
  gameId: string;
  /** Launch date for the game - puzzle #1 starts on this date */
  launchDate: Date;
}

/**
 * Base interface for puzzle state - all archive-enabled games should extend this
 */
export interface BasePuzzleState {
  puzzleNumber: number;
  puzzleId?: string;
  status: 'in-progress' | 'completed';
  data: unknown;
}

/**
 * Archive storage instance returned by createArchiveStorage
 */
export interface ArchiveStorage<TState extends BasePuzzleState> {
  /**
   * Get storage key for a puzzle
   * If puzzleId is provided, uses new format: {gameId}-{puzzleNumber}-{puzzleId}
   * Otherwise uses legacy format: {gameId}-{puzzleNumber}
   */
  getStorageKey(puzzleNumber: number, puzzleId?: string): string;

  /**
   * Get puzzle state by puzzle number and optional puzzleId
   * If puzzleId is provided, looks for that specific key
   */
  getPuzzleState(puzzleNumber: number, puzzleId?: string): TState | null;

  /**
   * Find puzzle state by scanning localStorage for any matching key pattern
   * Used by archive pages to check completion status regardless of puzzleId
   */
  findPuzzleState(puzzleNumber: number): TState | null;

  /**
   * Save puzzle state
   */
  savePuzzleState(puzzleNumber: number, state: TState, puzzleId?: string): void;

  /**
   * Clear puzzle state
   */
  clearPuzzleState(puzzleNumber: number, puzzleId?: string): void;

  /**
   * Check if a puzzle is completed (with specific puzzleId)
   */
  isPuzzleCompleted(puzzleNumber: number, puzzleId?: string): boolean;

  /**
   * Check if a puzzle is completed (scanning for any matching key)
   * @deprecated Use isPuzzleCompleted with specific puzzleId for accuracy after puzzle regeneration
   */
  isPuzzleCompletedAny(puzzleNumber: number): boolean;

  /**
   * Get the puzzleId from saved state for a puzzle number
   * Used by archive pages to verify completion is for the current puzzle version
   */
  getSavedPuzzleId(puzzleNumber: number): string | undefined;

  /**
   * Check if a puzzle is in progress (with specific puzzleId)
   */
  isPuzzleInProgress(puzzleNumber: number, puzzleId?: string): boolean;

  /**
   * Check if a puzzle is in progress (scanning for any matching key)
   * @deprecated Use isPuzzleInProgress with specific puzzleId for accuracy after puzzle regeneration
   */
  isPuzzleInProgressAny(puzzleNumber: number): boolean;

  /**
   * Get today's puzzle number based on launch date
   */
  getTodayPuzzleNumber(): number;
}

/**
 * Creates an archive storage instance for a game
 *
 * @param config - Configuration including gameId and launchDate
 * @returns Storage functions for managing puzzle state
 */
export function createArchiveStorage<TState extends BasePuzzleState>(
  config: ArchiveStorageConfig
): ArchiveStorage<TState> {
  const { gameId, launchDate } = config;

  function getStorageKey(puzzleNumber: number, puzzleId?: string): string {
    if (puzzleId) {
      return `${gameId}-${puzzleNumber}-${puzzleId}`;
    }
    return `${gameId}-${puzzleNumber}`;
  }

  function getPuzzleState(puzzleNumber: number, puzzleId?: string): TState | null {
    if (typeof window === 'undefined') return null;

    try {
      const key = getStorageKey(puzzleNumber, puzzleId);
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      return JSON.parse(stored) as TState;
    } catch (error) {
      console.warn(`[${gameId}] Failed to load puzzle state:`, error);
      return null;
    }
  }

  function findPuzzleState(puzzleNumber: number): TState | null {
    if (typeof window === 'undefined') return null;

    try {
      // Look for keys matching {gameId}-{puzzleNumber} or {gameId}-{puzzleNumber}-*
      const prefix = `${gameId}-${puzzleNumber}`;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key === prefix || key.startsWith(`${prefix}-`))) {
          const stored = localStorage.getItem(key);
          if (stored) {
            return JSON.parse(stored) as TState;
          }
        }
      }
      return null;
    } catch (error) {
      console.warn(`[${gameId}] Failed to find puzzle state:`, error);
      return null;
    }
  }

  function savePuzzleState(puzzleNumber: number, state: TState, puzzleId?: string): void {
    if (typeof window === 'undefined') return;

    try {
      const key = getStorageKey(puzzleNumber, puzzleId);
      // Include puzzleId in state for consistency
      const stateWithId = { ...state, puzzleId };
      localStorage.setItem(key, JSON.stringify(stateWithId));
    } catch (error) {
      console.warn(`[${gameId}] Failed to save puzzle state:`, error);
    }
  }

  function clearPuzzleState(puzzleNumber: number, puzzleId?: string): void {
    if (typeof window === 'undefined') return;

    try {
      const key = getStorageKey(puzzleNumber, puzzleId);
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[${gameId}] Failed to clear puzzle state:`, error);
    }
  }

  function isPuzzleCompleted(puzzleNumber: number, puzzleId?: string): boolean {
    const state = getPuzzleState(puzzleNumber, puzzleId);
    return state?.status === 'completed';
  }

  function isPuzzleCompletedAny(puzzleNumber: number): boolean {
    const state = findPuzzleState(puzzleNumber);
    return state?.status === 'completed';
  }

  function getSavedPuzzleId(puzzleNumber: number): string | undefined {
    const state = findPuzzleState(puzzleNumber);
    return state?.puzzleId;
  }

  function isPuzzleInProgress(puzzleNumber: number, puzzleId?: string): boolean {
    const state = getPuzzleState(puzzleNumber, puzzleId);
    return state?.status === 'in-progress';
  }

  function isPuzzleInProgressAny(puzzleNumber: number): boolean {
    const state = findPuzzleState(puzzleNumber);
    return state?.status === 'in-progress';
  }

  function getTodayPuzzleNumber(): number {
    return getPuzzleNumber(launchDate);
  }

  return {
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
  };
}
