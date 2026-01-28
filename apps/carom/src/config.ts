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

export const caromConfig = defineGameConfig({
  id: 'carom',
  name: 'Carom',
  icon: '/icon.png',
  description: 'Slide pieces to reach the goal. A daily sliding puzzle.',
  theme: caromTheme,
  homeUrl: '/',
  getPuzzleInfo: () => {
    const dateStr = getTodayDateString();
    const puzzleNumber = getPuzzleNumber(new Date('2026-01-01'));
    return {
      number: puzzleNumber,
      date: formatDisplayDate(dateStr),
    };
  },
});
