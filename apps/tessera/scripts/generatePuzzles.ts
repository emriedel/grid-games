/**
 * Tessera Puzzle Generator
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

/**
 * Get all valid shape definitions (cells divisible by 5)
 */
function getShapeDefinitions(): ShapeDefinition[] {
  const shapes: ShapeDefinition[] = [];

  // Simple rectangles
  shapes.push(createRectangle(5, 6, '5x6 Rectangle')); // 30 cells = 6 pieces
  shapes.push(createRectangle(6, 5, '6x5 Rectangle')); // 30 cells = 6 pieces
  shapes.push(createRectangle(5, 8, '5x8 Rectangle')); // 40 cells = 8 pieces
  shapes.push(createRectangle(8, 5, '8x5 Rectangle')); // 40 cells = 8 pieces
  shapes.push(createRectangle(4, 10, '4x10 Rectangle')); // 40 cells = 8 pieces
  shapes.push(createRectangle(10, 4, '10x4 Rectangle')); // 40 cells = 8 pieces
  shapes.push(createRectangle(5, 10, '5x10 Rectangle')); // 50 cells = 10 pieces
  shapes.push(createRectangle(10, 5, '10x5 Rectangle')); // 50 cells = 10 pieces
  shapes.push(createRectangle(6, 10, '6x10 Rectangle')); // 60 cells = 12 pieces (all!)
  shapes.push(createRectangle(10, 6, '10x6 Rectangle')); // 60 cells = 12 pieces (all!)

  // Staircases
  shapes.push(createStaircase(5, 2, 3)); // 5 steps, 2 high each, 3 wide each = 90 cells? verify
  shapes.push(createStaircase(4, 2, 2)); // smaller staircase

  // Plus shapes
  const plus = createPlusShape(2, 1); // 5 arms of length 2, thickness 1
  if (plus.pieceCount >= 3 && plus.pieceCount <= 12) {
    shapes.push(plus);
  }

  // Rectangles with holes
  const frame = createRectangleWithHole(7, 7, 2, 2); // 7x7 with 2x2 hole = 49 - 4 = 45 cells = 9 pieces
  if (frame.pieceCount >= 3 && frame.pieceCount <= 12) {
    shapes.push(frame);
  }

  // Filter to only valid shapes (3-12 pieces, cells divisible by 5)
  return shapes.filter((s) => {
    const cells = s.shape.flat().filter((c) => c).length;
    return cells % 5 === 0 && s.pieceCount >= 3 && s.pieceCount <= 12;
  });
}

// ============ Puzzle Generation ============

function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
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
 */
function generatePuzzle(rng: () => number, shapes: ShapeDefinition[]): PoolPuzzle | null {
  // Pick a random shape
  const shapeIndex = Math.floor(rng() * shapes.length);
  const shapeDef = shapes[shapeIndex];

  // Pick random pieces
  const shuffledPieces = shuffle(rng, ALL_PENTOMINO_IDS);
  const selectedPieces = shuffledPieces.slice(0, shapeDef.pieceCount);

  // Sort for consistency
  selectedPieces.sort();

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

  console.log(`\nTessera Puzzle Generator`);
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
      pool = { gameId: 'tessera', generatedAt: '', puzzles: [] };
    }
  } else {
    pool = { gameId: 'tessera', generatedAt: '', puzzles: [] };
  }

  const startingCount = pool.puzzles.length;
  const shapes = getShapeDefinitions();
  console.log(`Available shapes: ${shapes.length}`);
  for (const s of shapes) {
    const cells = s.shape.flat().filter((c) => c).length;
    console.log(`  - ${s.name}: ${cells} cells, ${s.pieceCount} pieces`);
  }
  console.log();

  // Generate puzzles
  let generated = 0;
  let attempts = 0;
  const maxAttempts = targetCount * 20; // Allow many attempts since some combos are unsolvable

  while (generated < targetCount && attempts < maxAttempts) {
    attempts++;
    const seed = `tessera-${Date.now()}-${attempts}-${Math.random()}`;
    const rng = seedrandom(seed);

    process.stdout.write(`Attempt ${attempts}: `);

    const puzzle = generatePuzzle(rng, shapes);

    if (puzzle) {
      pool.puzzles.push(puzzle);
      generated++;
      console.log(
        `${puzzle.shapeName} with ${puzzle.pentominoIds.join(',')} - SUCCESS (${generated}/${targetCount})`
      );
    } else {
      console.log(`no solution found`);
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
