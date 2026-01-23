import { defineGameConfig, jumbleTheme } from '@grid-games/config';
import { formatDisplayDate, getTodayDateString, getPuzzleNumber } from '@grid-games/shared';

// Base date for puzzle numbering (first puzzle date)
const PUZZLE_BASE_DATE = new Date('2026-01-01');

export const jumbleConfig = defineGameConfig({
  id: 'jumble',
  name: 'Jumble',
  emoji: '🔠',
  description: 'Find words in a letter grid before time runs out. Connect adjacent tiles to form words.',
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
