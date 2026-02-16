import { defineGameConfig, trioTheme } from '@grid-games/config';
import { formatDisplayDate, getTodayDateString, getPuzzleNumber } from '@grid-games/shared';

// Base date for puzzle numbering (first puzzle date)
// Exported in both formats for different use cases
export const PUZZLE_BASE_DATE_STRING = '2026-02-01';
export const PUZZLE_BASE_DATE = new Date(PUZZLE_BASE_DATE_STRING + 'T00:00:00');

export const trioConfig = defineGameConfig({
  id: 'trio',
  name: 'Trio',
  icon: 'https://nerdcube.games/icons/trio.png',
  description: 'Find all five sets of three matching cards',
  theme: trioTheme,
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
