import { DailyResult } from '@/types';
import { getTodayDateString } from './boardGenerator';

const DAILY_RESULT_KEY = 'jumble-daily-result';

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
  } catch (error) {
    console.error('Failed to save daily result:', error);
  }
}

export function hasPlayedToday(): boolean {
  return getTodayResult() !== null;
}
