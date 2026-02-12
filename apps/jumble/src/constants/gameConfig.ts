import type { StarThresholds } from '@/types';

export const BOARD_SIZE = 5; // 5x5 grid (Big Boggle)
export const TIMER_DURATION = 120; // 2 minutes in seconds
export const MIN_WORD_LENGTH = 3;

export const SCORING_TABLE: Record<number, number> = {
  3: 1,
  4: 2,
  5: 4,
  6: 8,
};

// Standard Big Boggle dice (25 dice for 5x5 grid)
export const BOGGLE_DICE = [
  'AAAFRS',
  'AAEEEE',
  'AAFIRS',
  'ADENNN',
  'AEEEEM',
  'AEEGMU',
  'AEGMNN',
  'AFIRSY',
  'BJKQXZ',
  'CCENST',
  'CEIILT',
  'CEILPT',
  'CEIPST',
  'DDHNOT',
  'DHHLOR',
  'DHLNOR',
  'DHLNOR',
  'EIIITT',
  'EMOTTT',
  'ENSSSU',
  'FIPRSY',
  'GORRVW',
  'IPRRRY',
  'NOOTUW',
  'OOOTTU',
];

// For display purposes, Qu is shown as a single tile
export const QU_DISPLAY = 'Qu';

// Threshold configuration with linear scaling and floor/ceiling bounds
export const THRESHOLD_CONFIG = {
  star1: { percent: 0.08, floor: 12, ceiling: 18 },
  star2: { percent: 0.15, floor: 22, ceiling: 32 },
  star3: { percent: 0.25, floor: 35, ceiling: 45 },
};

/**
 * Calculate star thresholds based on max possible score
 * Uses linear scaling with aggressive floor/ceiling to keep variance tight
 */
export function calculateThresholds(maxPossibleScore: number): StarThresholds {
  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, Math.round(val)));
  const { star1, star2, star3 } = THRESHOLD_CONFIG;
  return {
    star1: clamp(maxPossibleScore * star1.percent, star1.floor, star1.ceiling),
    star2: clamp(maxPossibleScore * star2.percent, star2.floor, star2.ceiling),
    star3: clamp(maxPossibleScore * star3.percent, star3.floor, star3.ceiling),
  };
}

/**
 * Calculate star rating based on score and thresholds
 */
export function calculateStars(score: number, thresholds: StarThresholds): number {
  if (score >= thresholds.star3) return 3;
  if (score >= thresholds.star2) return 2;
  if (score >= thresholds.star1) return 1;
  return 0;
}

// Legacy default thresholds (fallback only)
export const STAR_THRESHOLDS: StarThresholds = { star1: 15, star2: 25, star3: 40 };

/**
 * Format stars as emoji string
 */
export function formatStars(stars: number, maxStars = 3): string {
  return '★'.repeat(stars) + '☆'.repeat(maxStars - stars);
}
