import { GameStats, DailyResult } from '@/types';
import { getTodayDateString } from './boardGenerator';

const STATS_KEY = 'jumble-stats';
const DAILY_RESULT_KEY = 'jumble-daily-result';

const DEFAULT_STATS: GameStats = {
  gamesPlayed: 0,
  totalScore: 0,
  totalWords: 0,
  bestScore: 0,
  bestWordCount: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastPlayedDate: null,
};

export function getStats(): GameStats {
  if (typeof window === 'undefined') return DEFAULT_STATS;

  try {
    const stored = localStorage.getItem(STATS_KEY);
    if (stored) {
      return { ...DEFAULT_STATS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
  return DEFAULT_STATS;
}

export function saveStats(stats: GameStats): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to save stats:', error);
  }
}

export function updateStatsAfterGame(
  wordsFound: number,
  score: number,
  totalPossibleWords: number,
  maxPossibleScore: number
): GameStats {
  const stats = getStats();
  const today = getTodayDateString();

  // Check if this is a new day
  const isNewDay = stats.lastPlayedDate !== today;

  if (isNewDay) {
    // Calculate streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (stats.lastPlayedDate === yesterdayStr) {
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }

    stats.maxStreak = Math.max(stats.maxStreak, stats.currentStreak);
    stats.gamesPlayed += 1;
    stats.totalScore += score;
    stats.totalWords += wordsFound;
    stats.bestScore = Math.max(stats.bestScore, score);
    stats.bestWordCount = Math.max(stats.bestWordCount, wordsFound);
    stats.lastPlayedDate = today;

    saveStats(stats);

    // Save daily result
    const dailyResult: DailyResult = {
      puzzleNumber: 0, // Will be set by caller
      date: today,
      wordsFound,
      totalPossibleWords,
      score,
      maxPossibleScore,
    };
    saveDailyResult(dailyResult);
  }

  return stats;
}

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
  const stats = getStats();
  return stats.lastPlayedDate === getTodayDateString();
}
