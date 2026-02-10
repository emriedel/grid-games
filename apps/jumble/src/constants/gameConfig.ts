export const BOARD_SIZE = 5; // 5x5 grid (Big Boggle)
export const TIMER_DURATION = 90; // 1.5 minutes in seconds
export const MIN_WORD_LENGTH = 3;

export const SCORING_TABLE: Record<number, number> = {
  3: 1,
  4: 1,
  5: 2,
  6: 3,
  7: 5,
  8: 11,
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

// Star thresholds - percentage of max possible score needed for each star
// Jumble's maxPossibleScore is the sum of ALL valid word scores on the board
// More lenient thresholds make 3 stars attainable for dedicated players
// In 90 seconds, even expert players rarely exceed 60% of possible words
export const STAR_THRESHOLDS = {
  star1Percent: 0.15, // 15% of max possible score
  star2Percent: 0.35, // 35% of max possible score
  star3Percent: 0.55, // 55% of max possible score
};

/**
 * Calculate star rating based on score and max possible score
 */
export function calculateStars(score: number, maxPossibleScore: number): number {
  if (maxPossibleScore === 0) return 0;
  const percentage = score / maxPossibleScore;
  if (percentage >= STAR_THRESHOLDS.star3Percent) return 3;
  if (percentage >= STAR_THRESHOLDS.star2Percent) return 2;
  if (percentage >= STAR_THRESHOLDS.star1Percent) return 1;
  return 0;
}

/**
 * Format stars as emoji string
 */
export function formatStars(stars: number, maxStars = 3): string {
  return '★'.repeat(stars) + '☆'.repeat(maxStars - stars);
}
