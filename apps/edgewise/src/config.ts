import { defineGameConfig } from '@grid-games/config';
import { formatDisplayDate, getTodayDateString, getPuzzleNumber } from '@grid-games/shared';
import { PUZZLE_BASE_DATE } from './constants/gameConfig';

// Define the purple theme for Edgewise
export const edgewiseTheme = {
  accent: '#a855f7',
  accentForeground: '#faf5ff',
  accentSecondary: '#7e22ce',
  tileBg: '#1e1b4b',
  tileBgSelected: '#312e81',
  tileBorder: '#4c1d95',
};

// Base path for assets (set via NEXT_PUBLIC_BASE_PATH on Vercel)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const edgewiseConfig = defineGameConfig({
  id: 'edgewise',
  name: 'Edgewise',
  icon: `${basePath}/icon.png`,
  description: 'Rotate tiles to match word pairs with categories.',
  theme: edgewiseTheme,
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
