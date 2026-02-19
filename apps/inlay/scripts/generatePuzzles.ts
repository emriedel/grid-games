/**
 * Inlay Puzzle Generator
 *
 * Generates pentomino puzzles into pool.json. Each puzzle gets a unique ID.
 * Use assignPuzzles.ts to assign puzzles from the pool to specific dates.
 *
 * Usage:
 *   npx tsx scripts/generatePuzzles.ts [count]
 *
 * Examples:
 *   npx tsx scripts/generatePuzzles.ts           # Generate 50 puzzles
 *   npx tsx scripts/generatePuzzles.ts 100       # Generate 100 puzzles
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import seedrandom from 'seedrandom';
import { solvePuzzle, verifySolution } from './solver';
import type { PentominoId, PlacedPiece } from '../src/types';

// ============ Types ============

export interface PoolPuzzle {
  id: string;
  shape: boolean[][];
  shapeName: string;
  pentominoIds: PentominoId[];
  solution: PlacedPiece[];
}

interface PoolFile {
  gameId: string;
  generatedAt: string;
  puzzles: PoolPuzzle[];
}

// ============ All Pentomino IDs ============

const ALL_PENTOMINO_IDS: PentominoId[] = ['F', 'I', 'L', 'N', 'P', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

// ============ Shape Definitions ============

interface ShapeDefinition {
  name: string;
  shape: boolean[][];
  pieceCount: number; // Number of pentominoes needed (shape cells / 5)
}

/**
 * Create a rectangular shape
 */
function createRectangle(rows: number, cols: number, name: string): ShapeDefinition {
  const shape: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    shape.push(Array(cols).fill(true));
  }
  const cells = rows * cols;
  if (cells % 5 !== 0) {
    throw new Error(`Rectangle ${rows}x${cols} has ${cells} cells, not divisible by 5`);
  }
  return { name, shape, pieceCount: cells / 5 };
}

/**
 * Check if a shape would create disconnected regions if we mark a cell as dead
 * Returns true if marking the cell creates multiple disconnected regions
 */
function wouldCreateDisconnectedRegions(shape: boolean[][]): boolean {
  const rows = shape.length;
  const cols = shape[0].length;
  const visited: boolean[][] = shape.map((row) => row.map(() => false));

  function floodFill(startR: number, startC: number): number {
    const stack: Array<[number, number]> = [[startR, startC]];
    let count = 0;

    while (stack.length > 0) {
      const [r, c] = stack.pop()!;
      if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
      if (visited[r][c] || !shape[r][c]) continue;

      visited[r][c] = true;
      count++;

      stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }

    return count;
  }

  // Count total playable cells
  let totalPlayable = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (shape[r][c]) totalPlayable++;
    }
  }

  // Find first playable cell and flood fill
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (shape[r][c]) {
        const reachable = floodFill(r, c);
        // If we can't reach all playable cells, we have disconnected regions
        return reachable !== totalPlayable;
      }
    }
  }

  return false; // No playable cells (shouldn't happen)
}

/**
 * Create a rectangle with random dead spaces (holes)
 * Ensures:
 * - Total playable cells divisible by 5
 * - No isolated regions
 * - Max 6 pieces (30 cells)
 */
function createRectangleWithRandomHoles(
  rng: () => number,
  baseRows: number,
  baseCols: number,
  deadCellCount: number,
  variantId: number
): ShapeDefinition | null {
  // Start with full rectangle
  const shape: boolean[][] = [];
  for (let r = 0; r < baseRows; r++) {
    shape.push(Array(baseCols).fill(true));
  }

  const totalCells = baseRows * baseCols;
  const targetPlayable = totalCells - deadCellCount;

  // Must be divisible by 5 and result in max 6 pieces
  if (targetPlayable % 5 !== 0 || targetPlayable > 30 || targetPlayable < 20) {
    return null;
  }

  // Create list of candidate cells to make dead (avoid corners for stability)
  const candidates: Array<[number, number]> = [];
  for (let r = 0; r < baseRows; r++) {
    for (let c = 0; c < baseCols; c++) {
      // Skip corners to keep shape more interesting
      const isCorner =
        (r === 0 || r === baseRows - 1) && (c === 0 || c === baseCols - 1);
      if (!isCorner) {
        candidates.push([r, c]);
      }
    }
  }

  // Shuffle candidates
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  // Try to mark cells as dead one by one
  let deadCount = 0;
  for (const [r, c] of candidates) {
    if (deadCount >= deadCellCount) break;

    // Tentatively mark as dead
    shape[r][c] = false;

    // Check if this creates disconnected regions
    if (wouldCreateDisconnectedRegions(shape)) {
      // Revert
      shape[r][c] = true;
    } else {
      deadCount++;
    }
  }

  // Verify we got enough dead cells
  if (deadCount !== deadCellCount) {
    return null;
  }

  const playableCells = shape.flat().filter((c) => c).length;
  const pieceCount = playableCells / 5;

  return {
    name: `Rectangle Variant ${variantId}`,
    shape,
    pieceCount,
  };
}

/**
 * Create an L-shape
 */
function createLShape(longSide: number, shortSide: number, thickness: number): ShapeDefinition {
  const shape: boolean[][] = [];

  // Vertical part
  for (let r = 0; r < longSide; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < longSide; c++) {
      if (c < thickness || r >= longSide - thickness) {
        row.push(true);
      } else {
        row.push(false);
      }
    }
    shape.push(row);
  }

  const cells = shape.flat().filter((c) => c).length;
  return { name: 'L-Shape', shape, pieceCount: cells / 5 };
}

/**
 * Create a plus/cross shape
 */
function createPlusShape(armLength: number, armThickness: number): ShapeDefinition {
  const size = armLength * 2 + armThickness;
  const shape: boolean[][] = [];

  for (let r = 0; r < size; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < size; c++) {
      const inVertical = c >= armLength && c < armLength + armThickness;
      const inHorizontal = r >= armLength && r < armLength + armThickness;
      row.push(inVertical || inHorizontal);
    }
    shape.push(row);
  }

  const cells = shape.flat().filter((c) => c).length;
  return { name: 'Plus', shape, pieceCount: cells / 5 };
}

/**
 * Create a staircase shape
 */
function createStaircase(steps: number, stepHeight: number, stepWidth: number): ShapeDefinition {
  const totalRows = steps * stepHeight;
  const maxCols = steps * stepWidth;
  const shape: boolean[][] = [];

  for (let r = 0; r < totalRows; r++) {
    const row: boolean[] = [];
    const step = Math.floor(r / stepHeight);
    const activeCols = (step + 1) * stepWidth;
    for (let c = 0; c < maxCols; c++) {
      row.push(c < activeCols);
    }
    shape.push(row);
  }

  const cells = shape.flat().filter((c) => c).length;
  return { name: 'Staircase', shape, pieceCount: cells / 5 };
}

/**
 * Create a rectangle with center hole
 */
function createRectangleWithHole(
  rows: number,
  cols: number,
  holeRows: number,
  holeCols: number
): ShapeDefinition {
  const shape: boolean[][] = [];
  const holeStartR = Math.floor((rows - holeRows) / 2);
  const holeStartC = Math.floor((cols - holeCols) / 2);

  for (let r = 0; r < rows; r++) {
    const row: boolean[] = [];
    for (let c = 0; c < cols; c++) {
      const inHole =
        r >= holeStartR && r < holeStartR + holeRows && c >= holeStartC && c < holeStartC + holeCols;
      row.push(!inHole);
    }
    shape.push(row);
  }

  const cells = shape.flat().filter((c) => c).length;
  return { name: 'Frame', shape, pieceCount: cells / 5 };
}

// ============ Themed Shape Definitions ============

/**
 * Helper to create a shape from a string pattern
 * '█' or '#' = playable, '.' or ' ' = dead
 */
function createShapeFromPattern(pattern: string[], name: string): ShapeDefinition {
  const shape: boolean[][] = [];
  for (const row of pattern) {
    const boolRow: boolean[] = [];
    for (const char of row) {
      boolRow.push(char === '█' || char === '#');
    }
    shape.push(boolRow);
  }
  const cells = shape.flat().filter((c) => c).length;
  if (cells % 5 !== 0) {
    throw new Error(`Shape ${name} has ${cells} cells, not divisible by 5`);
  }
  return { name, shape, pieceCount: cells / 5 };
}

/**
 * Create a heart shape (25 cells = 5 pieces)
 * 4+5+5+5+3+3 = 25
 */
function createHeart(): ShapeDefinition {
  const pattern = [
    '.██.██.',
    '.█████.',
    '.█████.',
    '.█████.',
    '..███..',
    '..███..',
  ];
  return createShapeFromPattern(pattern, 'Heart');
}

/**
 * Create an upward arrow shape (25 cells = 5 pieces)
 * 1+3+5+1+1+1+5+5+3 = 25
 */
function createArrowUp(): ShapeDefinition {
  const pattern = [
    '..█..',
    '.███.',
    '█████',
    '..█..',
    '..█..',
    '..█..',
    '█████',
    '█████',
    '.███.',
  ];
  return createShapeFromPattern(pattern, 'Arrow Up');
}

/**
 * Create a tall diamond shape (25 cells = 5 pieces)
 * 1+3+5+5+5+3+3 = 25
 */
function createDiamond(): ShapeDefinition {
  const pattern = [
    '..█..',
    '.███.',
    '█████',
    '█████',
    '█████',
    '.███.',
    '.███.',
  ];
  return createShapeFromPattern(pattern, 'Diamond');
}

/**
 * Create a crown shape (25 cells = 5 pieces)
 * 3+5+5+5+5+2 = 25
 */
function createCrown(): ShapeDefinition {
  const pattern = [
    '█.█.█',
    '█████',
    '█████',
    '█████',
    '█████',
    '.█.█.',
  ];
  return createShapeFromPattern(pattern, 'Crown');
}

/**
 * Create a trophy shape (25 cells = 5 pieces)
 * 5+3+1+1+1+1+3+5+5 = 25
 */
function createTrophy(): ShapeDefinition {
  const pattern = [
    '█████',
    '.███.',
    '..█..',
    '..█..',
    '..█..',
    '..█..',
    '.███.',
    '█████',
    '█████',
  ];
  return createShapeFromPattern(pattern, 'Trophy');
}

/**
 * Create a house shape with door hole (30 cells = 6 pieces)
 * 1+3+5+5+5+4+4+3 = 30
 */
function createHouse(): ShapeDefinition {
  const pattern = [
    '..█..',
    '.███.',
    '█████',
    '█████',
    '█████',
    '██.██',
    '██.██',
    '.███.',
  ];
  return createShapeFromPattern(pattern, 'House');
}

/**
 * Create a letter T shape (35 cells = 7 pieces)
 * 7+7+3+3+3+3+3+3+3 = 35
 */
function createLetterT(): ShapeDefinition {
  const pattern = [
    '███████',
    '███████',
    '..███..',
    '..███..',
    '..███..',
    '..███..',
    '..███..',
    '..███..',
    '..███..',
  ];
  return createShapeFromPattern(pattern, 'Letter T');
}

/**
 * Create a star shape (20 cells = 4 pieces)
 * 1+3+4+5+4+3 = 20
 */
function createStar(): ShapeDefinition {
  const pattern = [
    '..█..',
    '.███.',
    '██.██',
    '█████',
    '██.██',
    '.███.',
  ];
  return createShapeFromPattern(pattern, 'Star');
}

/**
 * Create a vertical key shape (30 cells = 6 pieces)
 * 3+5+4+5+3+1+1+1+3+1+3 = 30
 */
function createKey(): ShapeDefinition {
  const pattern = [
    '.███.',
    '█████',
    '██.██',
    '█████',
    '.███.',
    '..█..',
    '..█..',
    '..█..',
    '.███.',
    '..█..',
    '.███.',
  ];
  return createShapeFromPattern(pattern, 'Key');
}

/**
 * Create a candle/torch shape (25 cells = 5 pieces)
 * 1+3+3+1+3+3+3+3+5 = 25
 */
function createCandle(): ShapeDefinition {
  const pattern = [
    '..█..',
    '.███.',
    '.███.',
    '..█..',
    '.███.',
    '.███.',
    '.███.',
    '.███.',
    '█████',
  ];
  return createShapeFromPattern(pattern, 'Candle');
}

/**
 * Create a letter H shape (30 cells = 6 pieces)
 * 4+4+4+5+5+4+4 = 30
 */
function createLetterH(): ShapeDefinition {
  const pattern = [
    '██.██',
    '██.██',
    '██.██',
    '█████',
    '█████',
    '██.██',
    '██.██',
  ];
  return createShapeFromPattern(pattern, 'Letter H');
}

/**
 * Create a letter E shape (30 cells = 6 pieces)
 * 5+5+2+4+2+5+5+2 = 30
 */
function createLetterE(): ShapeDefinition {
  const pattern = [
    '█████',
    '█████',
    '██...',
    '████.',
    '██...',
    '█████',
    '█████',
    '██...',
  ];
  return createShapeFromPattern(pattern, 'Letter E');
}

/**
 * Create a tree shape (30 cells = 6 pieces)
 * 1+3+5+3+5+1+1+1+5+5 = 30
 */
function createTree(): ShapeDefinition {
  const pattern = [
    '..█..',
    '.███.',
    '█████',
    '.███.',
    '█████',
    '..█..',
    '..█..',
    '..█..',
    '█████',
    '█████',
  ];
  return createShapeFromPattern(pattern, 'Tree');
}

/**
 * Create a cross/plus shape (30 cells = 6 pieces)
 * 3+3+5+5+5+5+3+1 = 30
 */
function createCross(): ShapeDefinition {
  const pattern = [
    '.███.',
    '.███.',
    '█████',
    '█████',
    '█████',
    '█████',
    '.███.',
    '..█..',
  ];
  return createShapeFromPattern(pattern, 'Cross');
}

/**
 * Create a goblet/chalice shape (25 cells = 5 pieces)
 * 5+3+1+1+1+3+5+3+3 = 25
 */
function createGoblet(): ShapeDefinition {
  const pattern = [
    '█████',
    '.███.',
    '..█..',
    '..█..',
    '..█..',
    '.███.',
    '█████',
    '.███.',
    '.███.',
  ];
  return createShapeFromPattern(pattern, 'Goblet');
}

/**
 * Create a plus sign shape (25 cells = 5 pieces)
 * 1+1+5+5+5+5+1+1+1 = 25
 */
function createPlusSign(): ShapeDefinition {
  const pattern = [
    '..█..',
    '..█..',
    '█████',
    '█████',
    '█████',
    '█████',
    '..█..',
    '..█..',
    '..█..',
  ];
  return createShapeFromPattern(pattern, 'Plus Sign');
}

/**
 * Create a shield shape (30 cells = 6 pieces)
 * 5+5+5+5+5+3+1+1 = 30
 */
function createShield(): ShapeDefinition {
  const pattern = [
    '█████',
    '█████',
    '█████',
    '█████',
    '█████',
    '.███.',
    '..█..',
    '..█..',
  ];
  return createShapeFromPattern(pattern, 'Shield');
}

/**
 * Create an anchor shape (30 cells = 6 pieces)
 * 3+5+3+1+1+1+5+5+3+3 = 30
 */
function createAnchor(): ShapeDefinition {
  const pattern = [
    '.███.',
    '█████',
    '.███.',
    '..█..',
    '..█..',
    '..█..',
    '█████',
    '█████',
    '.███.',
    '.███.',
  ];
  return createShapeFromPattern(pattern, 'Anchor');
}

/**
 * Get all valid shape definitions (cells divisible by 5)
 * Includes randomly generated rectangle variants for variety
 */
function getShapeDefinitions(): ShapeDefinition[] {
  const shapes: ShapeDefinition[] = [];

  // Simple rectangles - only vertical 6x5 (6 rows tall, 5 cols wide)
  shapes.push(createRectangle(6, 5, '6x5 Rectangle')); // 30 cells = 6 pieces

  // Generate rectangle variants with dead cells
  // Using deterministic seeds for each variant so they're reproducible
  let variantId = 1;
  const variantConfigs = [
    // 7x5 = 35 cells, remove 5 cells = 30 cells = 6 pieces
    { rows: 7, cols: 5, deadCells: 5 },
    { rows: 7, cols: 5, deadCells: 5 },
    { rows: 7, cols: 5, deadCells: 5 },
    // 8x5 = 40 cells, remove 10 cells = 30 cells = 6 pieces
    { rows: 8, cols: 5, deadCells: 10 },
    { rows: 8, cols: 5, deadCells: 10 },
    // 7x5 = 35 cells, remove 10 cells = 25 cells = 5 pieces
    { rows: 7, cols: 5, deadCells: 10 },
    { rows: 7, cols: 5, deadCells: 10 },
    // 6x5 = 30 cells, remove 5 cells = 25 cells = 5 pieces
    { rows: 6, cols: 5, deadCells: 5 },
    { rows: 6, cols: 5, deadCells: 5 },
  ];

  for (const config of variantConfigs) {
    const rng = seedrandom(`rectangle-variant-${variantId}`);
    const variant = createRectangleWithRandomHoles(
      rng,
      config.rows,
      config.cols,
      config.deadCells,
      variantId
    );
    if (variant) {
      shapes.push(variant);
    }
    variantId++;
  }

  // Themed shapes - Symbols (portrait orientation)
  shapes.push(createHeart()); // 25 cells = 5 pieces
  shapes.push(createArrowUp()); // 25 cells = 5 pieces
  shapes.push(createDiamond()); // 25 cells = 5 pieces
  shapes.push(createStar()); // 20 cells = 4 pieces
  shapes.push(createCross()); // 30 cells = 6 pieces
  shapes.push(createPlusSign()); // 25 cells = 5 pieces

  // Themed shapes - Objects (portrait orientation)
  shapes.push(createCrown()); // 25 cells = 5 pieces
  shapes.push(createTrophy()); // 25 cells = 5 pieces
  shapes.push(createHouse()); // 30 cells = 6 pieces
  shapes.push(createKey()); // 30 cells = 6 pieces
  shapes.push(createCandle()); // 25 cells = 5 pieces
  shapes.push(createTree()); // 30 cells = 6 pieces
  shapes.push(createGoblet()); // 25 cells = 5 pieces
  shapes.push(createShield()); // 30 cells = 6 pieces
  shapes.push(createAnchor()); // 30 cells = 6 pieces

  // Themed shapes - Letters (portrait orientation)
  shapes.push(createLetterT()); // 35 cells = 7 pieces
  shapes.push(createLetterH()); // 30 cells = 6 pieces
  shapes.push(createLetterE()); // 30 cells = 6 pieces

  // Filter to only valid shapes (4-7 pieces for reasonable difficulty)
  return shapes.filter((s) => {
    const cells = s.shape.flat().filter((c) => c).length;
    return cells % 5 === 0 && s.pieceCount >= 4 && s.pieceCount <= 7;
  });
}

// ============ Puzzle Generation ============

function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Generate a unique key from shape pattern + sorted pieces
 * Used to detect duplicate puzzles
 */
function getPuzzleKey(shape: boolean[][], pieces: PentominoId[]): string {
  const shapeStr = shape.map((row) => row.map((c) => (c ? '1' : '0')).join('')).join('|');
  const piecesStr = [...pieces].sort().join(',');
  return `${shapeStr}::${piecesStr}`;
}

// ============ Pentomino Cell Helpers (for ASCII output) ============

// These must match the solver.ts definitions exactly
const PENTOMINO_BASE_CELLS: Record<PentominoId, Array<{ row: number; col: number }>> = {
  F: [
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
  ],
  I: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 0, col: 3 },
    { row: 0, col: 4 },
  ],
  L: [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 2, col: 0 },
    { row: 3, col: 0 },
    { row: 3, col: 1 },
  ],
  N: [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 0 },
    { row: 3, col: 0 },
  ],
  P: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 0 },
  ],
  T: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
  ],
  U: [
    { row: 0, col: 0 },
    { row: 0, col: 2 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
  ],
  V: [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 2, col: 0 },
    { row: 2, col: 1 },
    { row: 2, col: 2 },
  ],
  W: [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
    { row: 2, col: 2 },
  ],
  X: [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 2, col: 1 },
  ],
  Y: [
    { row: 0, col: 1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
    { row: 3, col: 1 },
  ],
  Z: [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 1, col: 1 },
    { row: 2, col: 1 },
    { row: 2, col: 2 },
  ],
};

function rotateCellCW(cell: { row: number; col: number }): { row: number; col: number } {
  return { row: cell.col, col: -cell.row };
}

function normalizeOffsets(
  offsets: Array<{ row: number; col: number }>
): Array<{ row: number; col: number }> {
  const minRow = Math.min(...offsets.map((c) => c.row));
  const minCol = Math.min(...offsets.map((c) => c.col));
  return offsets.map((c) => ({ row: c.row - minRow, col: c.col - minCol }));
}

function getRotatedCells(
  pentominoId: PentominoId,
  rotation: 0 | 1 | 2 | 3
): Array<{ row: number; col: number }> {
  let cells = PENTOMINO_BASE_CELLS[pentominoId];
  for (let i = 0; i < rotation; i++) {
    cells = normalizeOffsets(cells.map(rotateCellCW));
  }
  return cells;
}

function getPieceCellsAtPosition(
  placed: PlacedPiece
): Array<{ row: number; col: number }> {
  const offsets = getRotatedCells(placed.pentominoId, placed.rotation);
  return offsets.map((offset) => ({
    row: placed.position.row + offset.row,
    col: placed.position.col + offset.col,
  }));
}

/**
 * Print ASCII visualization of a solved puzzle
 */
function printPuzzleSolution(puzzle: PoolPuzzle): void {
  const rows = puzzle.shape.length;
  const cols = puzzle.shape[0].length;

  // Create grid: '#' for dead, '.' for empty playable
  const grid: string[][] = puzzle.shape.map((row) => row.map((cell) => (cell ? '.' : '#')));

  // Fill in pieces using their letter
  for (const placed of puzzle.solution) {
    const cells = getPieceCellsAtPosition(placed);
    for (const cell of cells) {
      if (cell.row >= 0 && cell.row < rows && cell.col >= 0 && cell.col < cols) {
        grid[cell.row][cell.col] = placed.pentominoId;
      }
    }
  }

  // Print with border
  console.log('┌' + '─'.repeat(cols) + '┐');
  for (const row of grid) {
    console.log('│' + row.join('') + '│');
  }
  console.log('└' + '─'.repeat(cols) + '┘');
  console.log(`Pieces: ${puzzle.pentominoIds.join(', ')}`);
}

/**
 * Get weighted random shape index
 * Rectangle variants: weight 1
 * Themed shapes: weight 3
 */
function getWeightedShapeIndex(rng: () => number, shapes: ShapeDefinition[]): number {
  const weights = shapes.map((s) =>
    s.name.includes('Rectangle') || s.name.includes('Variant') ? 1 : 3
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let roll = rng() * totalWeight;

  for (let i = 0; i < shapes.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return i;
  }
  return shapes.length - 1;
}

function shuffle<T>(rng: () => number, array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Generate a single puzzle
 * @param seenPuzzles - Set of already seen puzzle keys for uniqueness checking
 */
function generatePuzzle(
  rng: () => number,
  shapes: ShapeDefinition[],
  seenPuzzles: Set<string>
): PoolPuzzle | null {
  // Pick a random shape using weighted selection (prefer themed shapes)
  const shapeIndex = getWeightedShapeIndex(rng, shapes);
  const shapeDef = shapes[shapeIndex];

  // Pick random pieces
  const shuffledPieces = shuffle(rng, ALL_PENTOMINO_IDS);
  const selectedPieces = shuffledPieces.slice(0, shapeDef.pieceCount);

  // Sort for consistency
  selectedPieces.sort();

  // Check uniqueness before solving (saves time)
  const puzzleKey = getPuzzleKey(shapeDef.shape, selectedPieces);
  if (seenPuzzles.has(puzzleKey)) {
    return null; // Duplicate puzzle
  }

  // Try to solve
  const result = solvePuzzle(shapeDef.shape, selectedPieces);

  if (!result.solvable || !result.solution) {
    return null;
  }

  // Verify solution
  if (!verifySolution(shapeDef.shape, result.solution)) {
    console.error('Solution verification failed!');
    return null;
  }

  // Mark as seen
  seenPuzzles.add(puzzleKey);

  return {
    id: generateId(),
    shape: shapeDef.shape,
    shapeName: shapeDef.name,
    pentominoIds: selectedPieces,
    solution: result.solution,
  };
}

// ============ Main ============

async function main() {
  const countArg = process.argv[2];
  const targetCount = countArg ? parseInt(countArg, 10) : 50;

  console.log(`\nInlay Puzzle Generator`);
  console.log(`========================\n`);
  console.log(`Target puzzles: ${targetCount}\n`);

  const outputDir = path.join(__dirname, '../public/puzzles');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Load existing pool
  const poolPath = path.join(outputDir, 'pool.json');
  let pool: PoolFile;
  if (fs.existsSync(poolPath)) {
    try {
      pool = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));
      console.log(`Loaded existing pool with ${pool.puzzles.length} puzzles\n`);
    } catch {
      pool = { gameId: 'inlay', generatedAt: '', puzzles: [] };
    }
  } else {
    pool = { gameId: 'inlay', generatedAt: '', puzzles: [] };
  }

  const startingCount = pool.puzzles.length;
  const shapes = getShapeDefinitions();
  console.log(`Available shapes: ${shapes.length}`);
  for (const s of shapes) {
    const cells = s.shape.flat().filter((c) => c).length;
    console.log(`  - ${s.name}: ${cells} cells, ${s.pieceCount} pieces`);
  }
  console.log();

  // Track seen puzzles for uniqueness (include existing pool puzzles)
  const seenPuzzles = new Set<string>();
  for (const p of pool.puzzles) {
    const key = getPuzzleKey(p.shape, p.pentominoIds);
    seenPuzzles.add(key);
  }
  console.log(`Tracking ${seenPuzzles.size} existing puzzle keys for uniqueness\n`);

  // Generate puzzles
  let generated = 0;
  let attempts = 0;
  let duplicates = 0;
  const maxAttempts = targetCount * 30; // Allow many attempts since some combos are unsolvable or duplicates

  while (generated < targetCount && attempts < maxAttempts) {
    attempts++;
    const seed = `inlay-${Date.now()}-${attempts}-${Math.random()}`;
    const rng = seedrandom(seed);

    process.stdout.write(`Attempt ${attempts}: `);

    const puzzle = generatePuzzle(rng, shapes, seenPuzzles);

    if (puzzle) {
      pool.puzzles.push(puzzle);
      generated++;
      console.log(
        `${puzzle.shapeName} with ${puzzle.pentominoIds.join(',')} - SUCCESS (${generated}/${targetCount})`
      );
      printPuzzleSolution(puzzle);
      console.log();
    } else {
      // Check if it was a duplicate (key already in seenPuzzles before this attempt)
      console.log(`no solution found or duplicate`);
    }
  }

  if (generated < targetCount) {
    console.log(`\nWarning: Only generated ${generated}/${targetCount} puzzles after ${attempts} attempts`);
  }

  // Save pool
  pool.generatedAt = new Date().toISOString();
  fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2));

  console.log(`\nSaved pool to ${poolPath}`);
  console.log(`  Previous count: ${startingCount}`);
  console.log(`  Added: ${generated}`);
  console.log(`  Total: ${pool.puzzles.length}`);

  // Print stats
  const shapeNameCounts: Record<string, number> = {};
  const pieceCountDistribution: Record<number, number> = {};

  for (const p of pool.puzzles) {
    shapeNameCounts[p.shapeName] = (shapeNameCounts[p.shapeName] || 0) + 1;
    pieceCountDistribution[p.pentominoIds.length] =
      (pieceCountDistribution[p.pentominoIds.length] || 0) + 1;
  }

  console.log(`\nShape distribution (full pool):`);
  for (const [name, cnt] of Object.entries(shapeNameCounts).sort()) {
    console.log(`  ${name}: ${cnt}`);
  }

  console.log(`\nPiece count distribution (full pool):`);
  for (const [cnt, num] of Object.entries(pieceCountDistribution).sort(
    (a, b) => Number(a[0]) - Number(b[0])
  )) {
    console.log(`  ${cnt} pieces: ${num} puzzles`);
  }
}

main().catch(console.error);
