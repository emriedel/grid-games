/**
 * Hardcoded info for Jumble puzzle #1 (2026-02-01).
 * Puzzle ID: hwgi8zze
 *
 * Board:
 * N F D T N
 * E T I I F
 * A I U E B
 * U W R O S
 * R H E E T
 *
 * Note: Jumble is timed and has many valid words, so we just
 * provide some known valid words with their paths for testing.
 */

export const JUMBLE_PUZZLE_1_ID = 'hwgi8zze';

export const JUMBLE_PUZZLE_1_BOARD = [
  ['N', 'F', 'D', 'T', 'N'],
  ['E', 'T', 'I', 'I', 'F'],
  ['A', 'I', 'U', 'E', 'B'],
  ['U', 'W', 'R', 'O', 'S'],
  ['R', 'H', 'E', 'E', 'T'],
];

export interface WordPath {
  word: string;
  path: Array<{ row: number; col: number }>;
}

/**
 * Sample valid words with their board paths.
 * These are easier/shorter words for reliable testing.
 */
export const JUMBLE_PUZZLE_1_SAMPLE_WORDS: WordPath[] = [
  {
    word: 'FIT',
    path: [
      { row: 0, col: 1 }, // F
      { row: 1, col: 2 }, // I
      { row: 1, col: 1 }, // T
    ],
  },
  {
    word: 'HEW',
    path: [
      { row: 4, col: 1 }, // H
      { row: 4, col: 2 }, // E
      { row: 3, col: 1 }, // W
    ],
  },
  {
    word: 'SORE',
    path: [
      { row: 3, col: 4 }, // S
      { row: 3, col: 3 }, // O
      { row: 3, col: 2 }, // R
      { row: 4, col: 2 }, // E
    ],
  },
  {
    word: 'HERO',
    path: [
      { row: 4, col: 1 }, // H
      { row: 4, col: 2 }, // E
      { row: 3, col: 2 }, // R
      { row: 3, col: 3 }, // O
    ],
  },
];

export const JUMBLE_PUZZLE_1_TIMER_SECONDS = 90;

/**
 * Star thresholds for puzzle #1
 */
export const JUMBLE_PUZZLE_1_THRESHOLDS = {
  star1: 18,
  star2: 32,
  star3: 45,
};
