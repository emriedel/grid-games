import { defineGameConfig } from '@grid-games/config';
import { getTodayDateString, getPuzzleNumber, formatDisplayDate } from '@grid-games/shared';

export const caromTheme = {
  accent: '#f59e0b',
  accentForeground: '#000000',
  accentSecondary: '#d97706',
  tileBg: '#1c1917',
  tileBgSelected: '#292524',
  tileBorder: '#44403c',
};

// Base date for puzzle numbering (first puzzle date)
// IMPORTANT: Use 'T00:00:00' to force local timezone interpretation
export const CAROM_PUZZLE_BASE_DATE_STRING = '2026-02-01';
export const CAROM_PUZZLE_BASE_DATE = new Date(CAROM_PUZZLE_BASE_DATE_STRING + 'T00:00:00');

export const caromConfig = defineGameConfig({
  id: 'carom',
  name: 'Carom',
  icon: 'https://nerdcube.games/icons/carom.png',
  description: 'Reach the goal in the fewest moves',
  theme: caromTheme,
  homeUrl: '/',
  getPuzzleInfo: () => {
    const dateStr = getTodayDateString();
    const puzzleNumber = getPuzzleNumber(CAROM_PUZZLE_BASE_DATE);
    return {
      number: puzzleNumber,
      date: formatDisplayDate(dateStr),
    };
  },
});
