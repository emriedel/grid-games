/**
 * Hardcoded solution for Carom puzzle #1 (2026-02-01).
 * Puzzle ID: b04fd6fa5ff342eb
 * Optimal moves: 10
 */

type Direction = 'up' | 'down' | 'left' | 'right';

export interface CaromMove {
  pieceId: string;
  direction: Direction;
}

export const CAROM_PUZZLE_1_ID = 'b04fd6fa5ff342eb';

export const CAROM_PUZZLE_1_SOLUTION: CaromMove[] = [
  { pieceId: 'target', direction: 'left' },
  { pieceId: 'target', direction: 'up' },
  { pieceId: 'target', direction: 'right' },
  { pieceId: 'blocker-1', direction: 'down' },
  { pieceId: 'blocker-1', direction: 'left' },
  { pieceId: 'target', direction: 'down' },
  { pieceId: 'blocker-1', direction: 'down' },
  { pieceId: 'target', direction: 'left' },
  { pieceId: 'target', direction: 'down' },
  { pieceId: 'target', direction: 'right' },
];

export const CAROM_PUZZLE_1_OPTIMAL_MOVES = 10;
