export * from './shapes';
export * from './colors';
export * from './patterns';

// Game configuration for Sequential Draw Mode
export const GAME_CONFIG = {
  // Number of cards on the board at any time
  CARD_COUNT: 9,

  // Number of rounds per puzzle (find 1 set per round)
  ROUND_COUNT: 5,

  // Board dimensions (3 columns x 3 rows - square layout)
  BOARD_COLS: 3,
  BOARD_ROWS: 3,

  // Cards replaced after finding a set
  REPLACEMENT_COUNT: 3,

  // Animation durations (ms)
  ANIMATION: {
    CARD_REMOVE: 300,
    CARD_ADD: 300,
    BETWEEN_ROUNDS: 400,
    REVEAL_CORRECT: 1500, // Time to show correct answer after miss
  },
} as const;
