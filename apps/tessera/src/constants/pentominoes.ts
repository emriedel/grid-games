/**
 * Pentomino Definitions
 *
 * Each pentomino has 12 standard pieces, each covering exactly 5 squares.
 * Rotations are pre-computed for O(1) lookup.
 *
 * Cell offsets are relative to (0,0) as the anchor point.
 * Rotations: 0 = 0°, 1 = 90° CW, 2 = 180°, 3 = 270° CW
 */

import type { PentominoDefinition, PentominoId, CellOffset, Rotation } from '@/types';

/**
 * Rotate a single cell offset 90° clockwise
 */
function rotateCW(cell: CellOffset): CellOffset {
  return { row: cell.col, col: -cell.row };
}

/**
 * Normalize offsets so minimum row and col are 0
 */
function normalizeOffsets(offsets: CellOffset[]): CellOffset[] {
  const minRow = Math.min(...offsets.map(c => c.row));
  const minCol = Math.min(...offsets.map(c => c.col));
  return offsets.map(c => ({ row: c.row - minRow, col: c.col - minCol }));
}

/**
 * Generate all 4 rotations from base shape
 */
function generateRotations(base: CellOffset[]): [CellOffset[], CellOffset[], CellOffset[], CellOffset[]] {
  const r0 = normalizeOffsets(base);
  const r1 = normalizeOffsets(base.map(rotateCW));
  const r2 = normalizeOffsets(r1.map(c => rotateCW({ row: c.row, col: c.col })));
  const r3 = normalizeOffsets(r2.map(c => rotateCW({ row: c.row, col: c.col })));
  return [r0, r1, r2, r3];
}

/**
 * The 12 standard pentominoes
 *
 * Base shapes defined with (0,0) as anchor:
 *
 * F:  .X.    I: XXXXX    L: X...    N: .X..    P: XX.
 *     XX.                   X...       XX..       XX.
 *     .X.                   X...       X...       X..
 *                           XX..       X...
 *
 * T: XXX    U: X.X    V: X..    W: X..    X: .X.
 *    .X.       XXX       X..       XX.       XXX
 *    .X.                 XXX       .XX       .X.
 *
 * Y: .X..    Z: XX.
 *    XX..       .X.
 *    .X..       .XX
 *    .X..
 */

const pentominoData: { id: PentominoId; name: string; color: string; base: CellOffset[] }[] = [
  {
    id: 'F',
    name: 'F-pentomino',
    color: 'var(--piece-F)',
    base: [
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 1 },
    ],
  },
  {
    id: 'I',
    name: 'I-pentomino',
    color: 'var(--piece-I)',
    base: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 0, col: 4 },
    ],
  },
  {
    id: 'L',
    name: 'L-pentomino',
    color: 'var(--piece-L)',
    base: [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 3, col: 0 },
      { row: 3, col: 1 },
    ],
  },
  {
    id: 'N',
    name: 'N-pentomino',
    color: 'var(--piece-N)',
    base: [
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 0 },
      { row: 3, col: 0 },
    ],
  },
  {
    id: 'P',
    name: 'P-pentomino',
    color: 'var(--piece-P)',
    base: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 0 },
    ],
  },
  {
    id: 'T',
    name: 'T-pentomino',
    color: 'var(--piece-T)',
    base: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 1, col: 1 },
      { row: 2, col: 1 },
    ],
  },
  {
    id: 'U',
    name: 'U-pentomino',
    color: 'var(--piece-U)',
    base: [
      { row: 0, col: 0 },
      { row: 0, col: 2 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
    ],
  },
  {
    id: 'V',
    name: 'V-pentomino',
    color: 'var(--piece-V)',
    base: [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 2, col: 0 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ],
  },
  {
    id: 'W',
    name: 'W-pentomino',
    color: 'var(--piece-W)',
    base: [
      { row: 0, col: 0 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ],
  },
  {
    id: 'X',
    name: 'X-pentomino',
    color: 'var(--piece-X)',
    base: [
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 1, col: 2 },
      { row: 2, col: 1 },
    ],
  },
  {
    id: 'Y',
    name: 'Y-pentomino',
    color: 'var(--piece-Y)',
    base: [
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: 1, col: 1 },
      { row: 2, col: 1 },
      { row: 3, col: 1 },
    ],
  },
  {
    id: 'Z',
    name: 'Z-pentomino',
    color: 'var(--piece-Z)',
    base: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ],
  },
];

/** All pentomino definitions with pre-computed rotations */
export const PENTOMINOES: Record<PentominoId, PentominoDefinition> = Object.fromEntries(
  pentominoData.map(({ id, name, color, base }) => [
    id,
    {
      id,
      name,
      color,
      rotations: generateRotations(base),
    },
  ])
) as Record<PentominoId, PentominoDefinition>;

/** Get all pentomino IDs */
export const ALL_PENTOMINO_IDS: PentominoId[] = ['F', 'I', 'L', 'N', 'P', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

/** Get pentomino cell offsets for a given rotation */
export function getPentominoCells(id: PentominoId, rotation: Rotation): CellOffset[] {
  return PENTOMINOES[id].rotations[rotation];
}

/** Get the bounding box dimensions for a pentomino at a given rotation */
export function getPentominoBounds(id: PentominoId, rotation: Rotation): { rows: number; cols: number } {
  const cells = getPentominoCells(id, rotation);
  const maxRow = Math.max(...cells.map(c => c.row));
  const maxCol = Math.max(...cells.map(c => c.col));
  return { rows: maxRow + 1, cols: maxCol + 1 };
}

/** Cycle to the next rotation */
export function nextRotation(rotation: Rotation): Rotation {
  return ((rotation + 1) % 4) as Rotation;
}
