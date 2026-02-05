import { DailyResult, FoundWord } from '@/types';
import { getTodayDateString } from './boardGenerator';

const DAILY_RESULT_KEY = 'jumble-daily-result';
const IN_PROGRESS_KEY = 'jumble-in-progress';

/** In-progress state saved during gameplay */
interface InProgressState {
  date: string;
  foundWords: FoundWord[];
  timeRemaining: number;
}

// ============ Completion State ============

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

export function saveDailyResult(result: DailyResult): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(DAILY_RESULT_KEY, JSON.stringify(result));
    // Clear in-progress when completed
    localStorage.removeItem(IN_PROGRESS_KEY);
  } catch (error) {
    console.error('Failed to save daily result:', error);
  }
}

export function hasPlayedToday(): boolean {
  return getTodayResult() !== null;
}

// ============ In-Progress State ============

export function getInProgressState(): InProgressState | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(IN_PROGRESS_KEY);
    if (stored) {
      const state = JSON.parse(stored) as InProgressState;
      if (state.date === getTodayDateString()) {
        return state;
      }
    }
  } catch (error) {
    console.error('Failed to load in-progress state:', error);
  }
  return null;
}

export function saveInProgressState(foundWords: FoundWord[], timeRemaining: number): void {
  if (typeof window === 'undefined') return;

  try {
    const state: InProgressState = {
      date: getTodayDateString(),
      foundWords,
      timeRemaining,
    };
    localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save in-progress state:', error);
  }
}

export function clearInProgressState(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(IN_PROGRESS_KEY);
  } catch (error) {
    console.error('Failed to clear in-progress state:', error);
  }
}

export function hasInProgressGame(): boolean {
  return getInProgressState() !== null;
}
