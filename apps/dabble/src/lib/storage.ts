import { getTodayDateString } from '@grid-games/shared';
import type { GameBoard, PlacedTile, Word } from '@/types';

const COMPLETION_KEY = 'dabble-completion';
const IN_PROGRESS_KEY = 'dabble-in-progress';

/** Completion state saved when game is finished */
export interface DabbleCompletionState {
  date: string;
  board: GameBoard;
  submittedWords: Word[];
  lockedRackIndices: number[];
  totalScore: number;
}

/** In-progress state saved during gameplay */
export interface DabbleInProgressState {
  date: string;
  board: GameBoard;
  rackLetters: string[];
  placedTiles: PlacedTile[];
  usedRackIndices: number[];
  lockedRackIndices: number[];
  submittedWords: Word[];
  turnCount: number;
  totalScore: number;
}

// ============ Completion State ============

export function getCompletionState(): DabbleCompletionState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(COMPLETION_KEY);
    if (stored) {
      const state = JSON.parse(stored) as DabbleCompletionState;
      if (state.date === getTodayDateString()) {
        return state;
      }
    }
  } catch (error) {
    console.warn('Failed to load completion state:', error);
  }
  return null;
}

export function saveCompletionState(state: DabbleCompletionState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(COMPLETION_KEY, JSON.stringify(state));
    // Clear in-progress when completed
    localStorage.removeItem(IN_PROGRESS_KEY);
  } catch (error) {
    console.warn('Failed to save completion state:', error);
  }
}

export function hasCompletedToday(): boolean {
  return getCompletionState() !== null;
}

// ============ In-Progress State ============

export function getInProgressState(): DabbleInProgressState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(IN_PROGRESS_KEY);
    if (stored) {
      const state = JSON.parse(stored) as DabbleInProgressState;
      if (state.date === getTodayDateString()) {
        return state;
      }
    }
  } catch (error) {
    console.warn('Failed to load in-progress state:', error);
  }
  return null;
}

export function saveInProgressState(state: Omit<DabbleInProgressState, 'date'>): void {
  if (typeof window === 'undefined') return;

  try {
    const fullState: DabbleInProgressState = {
      ...state,
      date: getTodayDateString(),
    };
    localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify(fullState));
  } catch (error) {
    console.warn('Failed to save in-progress state:', error);
  }
}

export function clearInProgressState(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(IN_PROGRESS_KEY);
  } catch (error) {
    console.warn('Failed to clear in-progress state:', error);
  }
}

export function hasInProgressGame(): boolean {
  return getInProgressState() !== null;
}

// ============ Utilities ============

export function clearAllState(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(COMPLETION_KEY);
    localStorage.removeItem(IN_PROGRESS_KEY);
  } catch (error) {
    console.warn('Failed to clear all state:', error);
  }
}
