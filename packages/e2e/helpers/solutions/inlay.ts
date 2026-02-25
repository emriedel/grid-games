/**
 * Hardcoded solution for Inlay puzzle #1 (2026-02-01).
 * Puzzle ID: e1c0707b9dad7f04
 * Shape: Rounded Rectangle (6 pentominoes)
 */

type Rotation = 0 | 1 | 2 | 3;

export interface InlayPlacement {
  pentominoId: string;
  row: number;
  col: number;
  rotation: Rotation;
}

export const INLAY_PUZZLE_1_ID = 'e1c0707b9dad7f04';

export const INLAY_PUZZLE_1_SOLUTION: InlayPlacement[] = [
  { pentominoId: 'X', row: 0, col: 0, rotation: 0 },
  { pentominoId: 'L', row: 1, col: 4, rotation: 2 },
  { pentominoId: 'N', row: 4, col: 0, rotation: 1 },
  { pentominoId: 'P', row: 2, col: 3, rotation: 2 },
  { pentominoId: 'T', row: 0, col: 2, rotation: 0 },
  { pentominoId: 'U', row: 2, col: 0, rotation: 0 },
];

export const INLAY_PUZZLE_1_PENTOMINOES = ['L', 'N', 'P', 'T', 'U', 'X'];
