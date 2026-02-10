import { defineGameConfig, jumbleTheme } from '@grid-games/config';
import { formatDisplayDate, getTodayDateString, getPuzzleNumber } from '@grid-games/shared';

// Base date for puzzle numbering (first puzzle date)
// IMPORTANT: Use 'T00:00:00' to force local timezone interpretation
export const PUZZLE_BASE_DATE_STRING = '2026-02-01';
export const PUZZLE_BASE_DATE = new Date(PUZZLE_BASE_DATE_STRING + 'T00:00:00');

export const jumbleConfig = defineGameConfig({
  id: 'jumble',
  name: 'Jumble',
  icon: 'https://nerdcube.games/icons/jumble.png',
  description: 'Find as many words as you can before time runs out',
  theme: jumbleTheme,
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
