import { getPuzzleNumber } from '@grid-games/shared';
import { FoundWord } from '@/types';

// Base date for puzzle numbering (first puzzle date)
// IMPORTANT: Use 'T00:00:00' to force local timezone interpretation
const PUZZLE_BASE_DATE = new Date('2026-01-01T00:00:00');

/**
 * Get today's puzzle number
 */
export function getTodayPuzzleNumber(): number {
  return getPuzzleNumber(PUZZLE_BASE_DATE);
}

/**
 * Unified puzzle state - works for both daily and archive puzzles
 */
export interface JumblePuzzleState {
  puzzleNumber: number;
  status: 'in-progress' | 'completed';
  data: {
    foundWords: FoundWord[];
    // In-progress only
    timeRemaining?: number;
    // Completed only
    totalPossibleWords?: number;
    score?: number;
    maxPossibleScore?: number;
  };
}

/**
 * Get storage key for a puzzle
 */
function getStorageKey(puzzleNumber: number): string {
  return `jumble-${puzzleNumber}`;
}

/**
 * Get puzzle state by puzzle number
 */
export function getPuzzleState(puzzleNumber: number): JumblePuzzleState | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getStorageKey(puzzleNumber);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return JSON.parse(stored) as JumblePuzzleState;
  } catch (error) {
    console.warn('[jumble] Failed to load puzzle state:', error);
    return null;
  }
}

/**
 * Save puzzle state
 */
export function savePuzzleState(puzzleNumber: number, state: JumblePuzzleState): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getStorageKey(puzzleNumber);
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.warn('[jumble] Failed to save puzzle state:', error);
  }
}

/**
 * Clear puzzle state
 */
export function clearPuzzleState(puzzleNumber: number): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getStorageKey(puzzleNumber);
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('[jumble] Failed to clear puzzle state:', error);
  }
}

/**
 * Check if a puzzle is completed
 */
export function isPuzzleCompleted(puzzleNumber: number): boolean {
  const state = getPuzzleState(puzzleNumber);
  return state?.status === 'completed';
}

/**
 * Check if a puzzle is in progress
 */
export function isPuzzleInProgress(puzzleNumber: number): boolean {
  const state = getPuzzleState(puzzleNumber);
  return state?.status === 'in-progress';
}

// ============ Legacy compatibility wrappers ============

/** Legacy interface for daily results */
export interface DailyResult {
  puzzleNumber: number;
  date: string;
  foundWords: FoundWord[];
  totalPossibleWords: number;
  score: number;
  maxPossibleScore: number;
}

/** Legacy interface for in-progress state */
interface InProgressState {
  date: string;
  foundWords: FoundWord[];
  timeRemaining: number;
}

/**
 * Check if today has been played (legacy compatibility)
 */
export function hasPlayedToday(): boolean {
  return isPuzzleCompleted(getTodayPuzzleNumber());
}

/**
 * Check if there's an in-progress game (legacy compatibility)
 */
export function hasInProgressGame(): boolean {
  return isPuzzleInProgress(getTodayPuzzleNumber());
}

/**
 * Get today's result (legacy compatibility)
 */
export function getTodayResult(): DailyResult | null {
  const puzzleNumber = getTodayPuzzleNumber();
  const state = getPuzzleState(puzzleNumber);
  if (state?.status === 'completed') {
    return {
      puzzleNumber,
      date: '', // Date is not stored in new format
      foundWords: state.data.foundWords,
      totalPossibleWords: state.data.totalPossibleWords ?? 0,
      score: state.data.score ?? 0,
      maxPossibleScore: state.data.maxPossibleScore ?? 0,
    };
  }
  return null;
}

/**
 * Save daily result (legacy compatibility)
 */
export function saveDailyResult(result: DailyResult): void {
  const puzzleNumber = result.puzzleNumber || getTodayPuzzleNumber();
  savePuzzleState(puzzleNumber, {
    puzzleNumber,
    status: 'completed',
    data: {
      foundWords: result.foundWords,
      totalPossibleWords: result.totalPossibleWords,
      score: result.score,
      maxPossibleScore: result.maxPossibleScore,
    },
  });
}

/**
 * Get in-progress state (legacy compatibility)
 */
export function getInProgressState(): InProgressState | null {
  const puzzleNumber = getTodayPuzzleNumber();
  const state = getPuzzleState(puzzleNumber);
  if (state?.status === 'in-progress') {
    return {
      date: '', // Date is not stored in new format
      foundWords: state.data.foundWords,
      timeRemaining: state.data.timeRemaining ?? 0,
    };
  }
  return null;
}

/**
 * Save in-progress state (legacy compatibility)
 */
export function saveInProgressState(foundWords: FoundWord[], timeRemaining: number): void {
  const puzzleNumber = getTodayPuzzleNumber();
  savePuzzleState(puzzleNumber, {
    puzzleNumber,
    status: 'in-progress',
    data: {
      foundWords,
      timeRemaining,
    },
  });
}

/**
 * Clear in-progress state (legacy compatibility)
 */
export function clearInProgressState(): void {
  // Don't clear - the state transitions to 'completed'
  // This is called after saveDailyResult
}
