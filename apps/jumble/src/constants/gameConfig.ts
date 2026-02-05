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
