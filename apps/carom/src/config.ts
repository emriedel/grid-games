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

// Launch date for Carom - puzzle #1 starts on this date
export const CAROM_LAUNCH_DATE = new Date('2026-01-30');

export const caromConfig = defineGameConfig({
  id: 'carom',
  name: 'Carom',
  icon: 'https://nerdcube.games/icons/carom.png',
  description: 'Reach the goal in the fewest moves',
  theme: caromTheme,
  homeUrl: '/',
  getPuzzleInfo: () => {
    const dateStr = getTodayDateString();
    const puzzleNumber = getPuzzleNumber(CAROM_LAUNCH_DATE);
    return {
      number: puzzleNumber,
      date: formatDisplayDate(dateStr),
    };
  },
});
