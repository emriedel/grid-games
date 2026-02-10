export const BOARD_SIZE = 5; // 5x5 grid (Big Boggle)
export const TIMER_DURATION = 90; // 1.5 minutes in seconds
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

// Star thresholds - fixed score values for each star level
export const STAR_THRESHOLDS = {
  star1: 15,
  star2: 30,
  star3: 45,
};

/**
 * Calculate star rating based on score
 */
export function calculateStars(score: number): number {
  if (score >= STAR_THRESHOLDS.star3) return 3;
  if (score >= STAR_THRESHOLDS.star2) return 2;
  if (score >= STAR_THRESHOLDS.star1) return 1;
  return 0;
}

/**
 * Format stars as emoji string
 */
export function formatStars(stars: number, maxStars = 3): string {
  return '★'.repeat(stars) + '☆'.repeat(maxStars - stars);
}
