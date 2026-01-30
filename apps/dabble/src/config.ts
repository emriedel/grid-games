import { defineGameConfig, dabbleTheme } from '@grid-games/config';
import { formatDisplayDate, getTodayDateString, getPuzzleNumber } from '@grid-games/shared';

// Base date for puzzle numbering (first puzzle date)
const PUZZLE_BASE_DATE = new Date('2026-01-01');

// Base path for assets (set via NEXT_PUBLIC_BASE_PATH on Vercel)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const dabbleConfig = defineGameConfig({
  id: 'dabble',
  name: 'Dabble',
  icon: `${basePath}/icon.png`,
  description: 'Place tiles to form words and maximize your score',
  theme: dabbleTheme,
  homeUrl: '/',
  getPuzzleInfo: () => {
    const dateStr = getTodayDateString();
    const puzzleNumber = getPuzzleNumber(PUZZLE_BASE_DATE);
    return {
      number: puzzleNumber,
      date: formatDisplayDate(dateStr),
    };
  },
});
