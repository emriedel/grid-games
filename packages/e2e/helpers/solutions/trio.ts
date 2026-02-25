/**
 * Hardcoded solution for Trio puzzle #1 (2026-02-01).
 * Puzzle ID: vskeqa71
 * 5 rounds with validSetIndices for each round.
 *
 * The validSetIndices are positions in the current 9-card array
 * where the valid trio can be found.
 */

export const TRIO_PUZZLE_1_ID = 'vskeqa71';

/**
 * For each round, these are the indices (0-8) of the cards
 * that form the valid trio.
 *
 * Round 1: indices 0, 1, 7
 * Round 2: indices 0, 6, 8 (after round 1 cards replaced)
 * Round 3: indices 1, 7, 8
 * Round 4: indices 5, 6, 8
 * Round 5: indices 3, 5, 6
 */
export const TRIO_PUZZLE_1_SOLUTION: number[][] = [
  [0, 1, 7],  // Round 1 valid set indices
  [0, 6, 8],  // Round 2 valid set indices
  [1, 7, 8],  // Round 3 valid set indices
  [5, 6, 8],  // Round 4 valid set indices
  [3, 5, 6],  // Round 5 valid set indices
];

export const TRIO_PUZZLE_1_ROUNDS = 5;
