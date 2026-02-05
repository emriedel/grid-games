import { getTodayDateString } from '@grid-games/shared';
import { Piece, Move } from '@/types';

const COMPLETION_KEY = 'carom-completion';
const IN_PROGRESS_KEY = 'carom-in-progress';

/** Completion state saved when puzzle is solved */
interface CompletionState {
  date: string;
  moveCount: number;
  optimalMoves: number;
  moveHistory: Move[];
}

/** In-progress state saved during gameplay */
interface InProgressState {
  date: string;
  pieces: Piece[];
  moveCount: number;
  moveHistory: Move[];
}

/**
 * Save game completion state
 */
export function saveGameCompletion(moveCount: number, optimalMoves: number, moveHistory: Move[]): void {
  if (typeof window === 'undefined') return;

  const state: CompletionState = {
    date: getTodayDateString(),
    moveCount,
    optimalMoves,
    moveHistory,
  };

  try {
    localStorage.setItem(COMPLETION_KEY, JSON.stringify(state));
    // Clear in-progress when completed
    localStorage.removeItem(IN_PROGRESS_KEY);
  } catch (e) {
    console.warn('Failed to save completion state:', e);
  }
}

/**
 * Get today's completion state if exists
 */
export function getCompletionState(): CompletionState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(COMPLETION_KEY);
    if (!stored) return null;

    const state: CompletionState = JSON.parse(stored);

    // Only return if it's today's game
    if (state.date === getTodayDateString()) {
      return state;
    }

    return null;
  } catch (e) {
    console.warn('Failed to load completion state:', e);
    return null;
  }
}

/**
 * Save in-progress game state
 */
export function saveInProgressState(pieces: Piece[], moveCount: number, moveHistory: Move[]): void {
  if (typeof window === 'undefined') return;

  const state: InProgressState = {
    date: getTodayDateString(),
    pieces,
    moveCount,
    moveHistory,
  };

  try {
    localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save in-progress state:', e);
  }
}

/**
 * Get today's in-progress state if exists
 */
export function getInProgressState(): InProgressState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(IN_PROGRESS_KEY);
    if (!stored) return null;

    const state: InProgressState = JSON.parse(stored);

    // Only return if it's today's game
    if (state.date === getTodayDateString()) {
      return state;
    }

    return null;
  } catch (e) {
    console.warn('Failed to load in-progress state:', e);
    return null;
  }
}

/**
 * Clear in-progress state
 */
export function clearInProgressState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(IN_PROGRESS_KEY);
  } catch (e) {
    console.warn('Failed to clear in-progress state:', e);
  }
}

/**
 * Check if today's puzzle was already completed
 */
export function isTodayCompleted(): boolean {
  return getCompletionState() !== null;
}

/**
 * Check if there's an in-progress game for today
 */
export function hasInProgressGame(): boolean {
  return getInProgressState() !== null;
}

/**
 * Clear all stored state (for testing/debug)
 */
export function clearStoredState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(COMPLETION_KEY);
  localStorage.removeItem(IN_PROGRESS_KEY);
}

// Legacy compatibility
export function getTodayGameState(): CompletionState | null {
  return getCompletionState();
}
