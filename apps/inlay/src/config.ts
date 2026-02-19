import { defineGameConfig, inlayTheme } from '@grid-games/config';
import { formatDisplayDate, getTodayDateString, getPuzzleNumber } from '@grid-games/shared';

// Base date for puzzle numbering (first puzzle date)
// Exported in both formats for different use cases
export const PUZZLE_BASE_DATE_STRING = '2026-02-15';
export const PUZZLE_BASE_DATE = new Date(PUZZLE_BASE_DATE_STRING + 'T00:00:00');

export const inlayConfig = defineGameConfig({
  id: 'inlay',
  name: 'Inlay',
  icon: 'https://nerdcube.games/icons/inlay.png',
  description: 'Fill the target shape using pentomino pieces',
  theme: inlayTheme,
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
