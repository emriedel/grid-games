import { defineGameConfig, dabbleTheme } from '@grid-games/config';
import { formatDisplayDate, getTodayDateString, getPuzzleNumber } from '@grid-games/shared';

// Base date for puzzle numbering (first puzzle date)
const PUZZLE_BASE_DATE = new Date('2026-02-01');

export const dabbleConfig = defineGameConfig({
  id: 'dabble',
  name: 'Dabble',
  icon: 'https://nerdcube.games/icons/dabble.png',
  description: 'Build the highest-scoring words in four turns',
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
