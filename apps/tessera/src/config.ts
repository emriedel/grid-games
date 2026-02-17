import { defineGameConfig, tesseraTheme } from '@grid-games/config';
import { formatDisplayDate, getTodayDateString, getPuzzleNumber } from '@grid-games/shared';

// Base date for puzzle numbering (first puzzle date)
// Exported in both formats for different use cases
export const PUZZLE_BASE_DATE_STRING = '2026-03-01';
export const PUZZLE_BASE_DATE = new Date(PUZZLE_BASE_DATE_STRING + 'T00:00:00');

export const tesseraConfig = defineGameConfig({
  id: 'tessera',
  name: 'Tessera',
  icon: 'https://nerdcube.games/icons/tessera.png',
  description: 'Fill the target shape using pentomino pieces',
  theme: tesseraTheme,
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
