import { getTodayDateString } from '@grid-games/shared';

const STORAGE_KEY = 'carom-game-state';

interface StoredGameState {
  date: string;
  completed: boolean;
  moveCount: number;
  optimalMoves: number;
}

/**
 * Save game completion state
 */
export function saveGameCompletion(moveCount: number, optimalMoves: number): void {
  if (typeof window === 'undefined') return;

  const state: StoredGameState = {
    date: getTodayDateString(),
    completed: true,
    moveCount,
    optimalMoves,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save game state:', e);
  }
}

/**
 * Get today's game state if exists
 */
export function getTodayGameState(): StoredGameState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const state: StoredGameState = JSON.parse(stored);

    // Only return if it's today's game
    if (state.date === getTodayDateString()) {
      return state;
    }

    return null;
  } catch (e) {
    console.warn('Failed to load game state:', e);
    return null;
  }
}

/**
 * Check if today's puzzle was already completed
 */
export function isTodayCompleted(): boolean {
  const state = getTodayGameState();
  return state?.completed ?? false;
}

/**
 * Clear stored state (for testing)
 */
export function clearStoredState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}
