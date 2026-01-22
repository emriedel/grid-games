export const BOARD_SIZE = 4; // 4x4 grid
export const TIMER_DURATION = 180; // 3 minutes in seconds
export const MIN_WORD_LENGTH = 3;

export const SCORING_TABLE: Record<number, number> = {
  3: 1,
  4: 1,
  5: 2,
  6: 3,
  7: 5,
  8: 11,
};

// Standard Boggle dice (16 dice for 4x4 grid)
export const BOGGLE_DICE = [
  'AAEEGN',
  'ABBJOO',
  'ACHOPS',
  'AFFKPS',
  'AOOTTW',
  'CIMOTU',
  'DEILRX',
  'DELRVY',
  'DISTTY',
  'EEGHNW',
  'EEINSU',
  'EHRTVW',
  'EIOSST',
  'ELRTTY',
  'HIMNQU',
  'HLNNRZ',
];

// For display purposes, Qu is shown as a single tile
export const QU_DISPLAY = 'Qu';
