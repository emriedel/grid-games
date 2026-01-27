import { DailyResult, SquareState, Rotation } from '@/types';
import { getTodayDateString } from '@grid-games/shared';

const DAILY_RESULT_KEY = 'edgewise-daily-result';
const GAME_STATE_KEY = 'edgewise-game-state';

/**
 * Get today's result from localStorage
 */
export function getTodayResult(): DailyResult | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(DAILY_RESULT_KEY);
    if (stored) {
      const result = JSON.parse(stored) as DailyResult;
      if (result.date === getTodayDateString()) {
        return result;
      }
    }
  } catch (error) {
    console.error('Failed to load daily result:', error);
  }
  return null;
}

/**
 * Save daily result to localStorage
 */
export function saveDailyResult(result: DailyResult): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(DAILY_RESULT_KEY, JSON.stringify(result));
  } catch (error) {
    console.error('Failed to save daily result:', error);
  }
}

/**
 * Check if the player has already completed today's puzzle
 */
export function hasPlayedToday(): boolean {
  return getTodayResult() !== null;
}

/**
 * Game state for persistence during play
 */
interface SavedGameState {
  date: string;
  squareRotations: Rotation[];
  squarePositions: number[]; // indices of squares in each position
  guessesUsed: number;
  feedbackHistory: number[][];
}

/**
 * Get saved game state for today
 */
export function getSavedGameState(): SavedGameState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(GAME_STATE_KEY);
    if (stored) {
      const state = JSON.parse(stored) as SavedGameState;
      if (state.date === getTodayDateString()) {
        return state;
      }
    }
  } catch (error) {
    console.error('Failed to load game state:', error);
  }
  return null;
}

/**
 * Save current game state
 */
export function saveGameState(
  squares: SquareState[],
  guessesUsed: number,
  feedbackHistory: number[][]
): void {
  if (typeof window === 'undefined') return;

  try {
    const state: SavedGameState = {
      date: getTodayDateString(),
      squareRotations: squares.map(s => s.rotation),
      squarePositions: squares.map((_, i) => i), // For now, positions are fixed
      guessesUsed,
      feedbackHistory,
    };
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save game state:', error);
  }
}

/**
 * Clear saved game state (called when game is finished)
 */
export function clearGameState(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(GAME_STATE_KEY);
  } catch (error) {
    console.error('Failed to clear game state:', error);
  }
}

/**
 * Clear daily result (for try again functionality)
 */
export function clearDailyResult(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(DAILY_RESULT_KEY);
  } catch (error) {
    console.error('Failed to clear daily result:', error);
  }
}

/**
 * Restore squares from saved state
 */
export function restoreSquaresFromState(
  baseSquares: SquareState[],
  savedState: SavedGameState
): SquareState[] {
  return baseSquares.map((square, index) => ({
    ...square,
    rotation: savedState.squareRotations[index] ?? square.rotation,
  }));
}
