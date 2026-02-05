/**
 * Shared game storage utilities
 * Provides type-safe, date-based localStorage persistence for daily puzzle games
 */

import { getTodayDateString } from './date';

/**
 * Generic interface for game storage operations
 */
export interface GameStorage<TInProgress, TCompletion> {
  /** Get today's in-progress state, or null if none exists */
  getInProgressState(): TInProgress | null;
  /** Save in-progress state for today */
  saveInProgressState(state: TInProgress): void;
  /** Clear in-progress state (called when game finishes) */
  clearInProgressState(): void;

  /** Get today's completion state, or null if not completed */
  getCompletionState(): TCompletion | null;
  /** Save completion state for today */
  saveCompletionState(state: TCompletion): void;
  /** Clear completion state (for try-again or debug) */
  clearCompletionState(): void;

  /** Check if there's an in-progress game for today */
  hasInProgressGame(): boolean;
  /** Check if today's puzzle was completed */
  hasCompletedToday(): boolean;
}

/**
 * Configuration for creating game storage
 */
export interface GameStorageConfig {
  /** Unique game identifier (e.g., 'dabble', 'carom') */
  gameId: string;
  /** localStorage key for in-progress state */
  inProgressKey: string;
  /** localStorage key for completion state */
  completionKey: string;
}

/** Wrapper that adds date field to state */
interface DatedState<T> {
  date: string;
  data: T;
}

/**
 * Creates a type-safe game storage instance
 *
 * Features:
 * - Automatic date-based isolation (only returns today's data)
 * - SSR-safe (checks for window/localStorage)
 * - Error handling with console warnings
 *
 * @example
 * ```ts
 * interface MyInProgress { board: string[][]; score: number; }
 * interface MyCompletion { finalScore: number; time: number; }
 *
 * const storage = createGameStorage<MyInProgress, MyCompletion>({
 *   gameId: 'mygame',
 *   inProgressKey: 'mygame-in-progress',
 *   completionKey: 'mygame-completion',
 * });
 *
 * // Save state
 * storage.saveInProgressState({ board: [...], score: 100 });
 *
 * // Restore state (returns null if no saved state or different day)
 * const saved = storage.getInProgressState();
 * ```
 */
export function createGameStorage<TInProgress, TCompletion>(
  config: GameStorageConfig
): GameStorage<TInProgress, TCompletion> {
  const { inProgressKey, completionKey } = config;

  // SSR-safe check
  const isClient = typeof window !== 'undefined';

  function getItem<T>(key: string): DatedState<T> | null {
    if (!isClient) return null;

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const parsed = JSON.parse(stored) as DatedState<T>;

      // Only return if it's today's data
      if (parsed.date === getTodayDateString()) {
        return parsed;
      }

      return null;
    } catch (error) {
      console.warn(`[${config.gameId}] Failed to load ${key}:`, error);
      return null;
    }
  }

  function setItem<T>(key: string, data: T): void {
    if (!isClient) return;

    try {
      const dated: DatedState<T> = {
        date: getTodayDateString(),
        data,
      };
      localStorage.setItem(key, JSON.stringify(dated));
    } catch (error) {
      console.warn(`[${config.gameId}] Failed to save ${key}:`, error);
    }
  }

  function removeItem(key: string): void {
    if (!isClient) return;

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[${config.gameId}] Failed to clear ${key}:`, error);
    }
  }

  return {
    getInProgressState(): TInProgress | null {
      const result = getItem<TInProgress>(inProgressKey);
      return result?.data ?? null;
    },

    saveInProgressState(state: TInProgress): void {
      setItem(inProgressKey, state);
    },

    clearInProgressState(): void {
      removeItem(inProgressKey);
    },

    getCompletionState(): TCompletion | null {
      const result = getItem<TCompletion>(completionKey);
      return result?.data ?? null;
    },

    saveCompletionState(state: TCompletion): void {
      setItem(completionKey, state);
    },

    clearCompletionState(): void {
      removeItem(completionKey);
    },

    hasInProgressGame(): boolean {
      return this.getInProgressState() !== null;
    },

    hasCompletedToday(): boolean {
      return this.getCompletionState() !== null;
    },
  };
}
