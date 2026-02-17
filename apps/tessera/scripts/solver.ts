/**
 * Tessera Pentomino Solver
 *
 * Backtracking solver to find valid pentomino placements.
 * Used by the puzzle generator to verify that puzzles are solvable.
 *
 * Usage:
 *   npx tsx scripts/solver.ts
 *
 * Algorithm:
 * 1. Find all valid placements for each piece at each rotation
 * 2. Use backtracking with Most Constrained Variable (MCV) heuristic
 * 3. Prune when remaining cells != remaining pieces × 5
 * 4. Additionally prune unreachable regions (islands smaller than 5 cells)
 */

import type { Rotation, Position, PentominoId, PlacedPiece, CellOffset } from '../src/types';

// ============ Pentomino Definitions (copied from constants) ============

function rotateCW(cell: CellOffset): CellOffset {
  return { row: cell.col, col: -cell.row };
}

function normalizeOffsets(offsets: CellOffset[]): CellOffset[] {
  const minRow = Math.min(...offsets.map((c) => c.row));
  const minCol = Math.min(...offsets.map((c) => c.col));
  return offsets.map((c) => ({ row: c.row - minRow, col: c.col - minCol }));
}

function generateRotations(
  base: CellOffset[]
): [CellOffset[], CellOffset[], CellOffset[], CellOffset[]] {
  const r0 = normalizeOffsets(base);
  const r1 = normalizeOffsets(base.map(rotateCW));
  const r2 = normalizeOffsets(r1.map((c) => rotateCW({ row: c.row, col: c.col })));
  const r3 = normalizeOffsets(r2.map((c) => rotateCW({ row: c.row, col: c.col })));
  return [r0, r1, r2, r3];
}

const pentominoData: { id: PentominoId; base: CellOffset[] }[] = [
  {
    id: 'F',
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
    base: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 1 },
      { row: 2, col: 1 },
      { row: 2, col: 2 },
    ],
  },
];

const PENTOMINO_ROTATIONS: Record<PentominoId, CellOffset[][]> = {} as Record<
  PentominoId,
  CellOffset[][]
>;
for (const { id, base } of pentominoData) {
  PENTOMINO_ROTATIONS[id] = generateRotations(base);
}

function getPentominoCells(id: PentominoId, rotation: Rotation): CellOffset[] {
  return PENTOMINO_ROTATIONS[id][rotation];
}

// ============ Board Representation ============

interface SolverBoard {
  cells: boolean[][]; // true = empty playable, false = dead or filled
  rows: number;
  cols: number;
  emptyCellCount: number;
}

function createSolverBoard(shape: boolean[][]): SolverBoard {
  const rows = shape.length;
  const cols = shape[0]?.length ?? 0;
  let emptyCellCount = 0;

  const cells: boolean[][] = shape.map((row) =>
    row.map((isPlayable) => {
      if (isPlayable) {
        emptyCellCount++;
        return true;
      }
      return false;
    })
  );

  return { cells, rows, cols, emptyCellCount };
}

function cloneBoard(board: SolverBoard): SolverBoard {
  return {
    cells: board.cells.map((row) => [...row]),
    rows: board.rows,
    cols: board.cols,
    emptyCellCount: board.emptyCellCount,
  };
}

// ============ Placement Logic ============

function getPieceCells(pentominoId: PentominoId, position: Position, rotation: Rotation): Position[] {
  const offsets = getPentominoCells(pentominoId, rotation);
  return offsets.map((offset) => ({
    row: position.row + offset.row,
    col: position.col + offset.col,
  }));
}

function canPlacePiece(
  board: SolverBoard,
  pentominoId: PentominoId,
  position: Position,
  rotation: Rotation
): boolean {
  const cells = getPieceCells(pentominoId, position, rotation);

  for (const cell of cells) {
    // Check bounds
    if (cell.row < 0 || cell.row >= board.rows || cell.col < 0 || cell.col >= board.cols) {
      return false;
    }
    // Check if cell is available (empty playable)
    if (!board.cells[cell.row][cell.col]) {
      return false;
    }
  }

  return true;
}

function placePiece(
  board: SolverBoard,
  pentominoId: PentominoId,
  position: Position,
  rotation: Rotation
): void {
  const cells = getPieceCells(pentominoId, position, rotation);
  for (const cell of cells) {
    board.cells[cell.row][cell.col] = false;
  }
  board.emptyCellCount -= 5;
}

function removePiece(
  board: SolverBoard,
  pentominoId: PentominoId,
  position: Position,
  rotation: Rotation
): void {
  const cells = getPieceCells(pentominoId, position, rotation);
  for (const cell of cells) {
    board.cells[cell.row][cell.col] = true;
  }
  board.emptyCellCount += 5;
}

// ============ Pruning: Island Detection ============

/**
 * Find all connected regions of empty cells.
 * If any region has size not divisible by 5, it cannot be filled.
 */
function hasValidRegions(board: SolverBoard): boolean {
  const visited: boolean[][] = board.cells.map((row) => row.map(() => false));

  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (board.cells[r][c] && !visited[r][c]) {
        // BFS to find connected region
        const regionSize = bfsRegionSize(board, visited, r, c);
        // Region must be divisible by 5 to be fillable by pentominoes
        if (regionSize % 5 !== 0) {
          return false;
        }
      }
    }
  }

  return true;
}

function bfsRegionSize(board: SolverBoard, visited: boolean[][], startR: number, startC: number): number {
  const queue: [number, number][] = [[startR, startC]];
  visited[startR][startC] = true;
  let size = 0;

  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    size++;

    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      if (
        nr >= 0 &&
        nr < board.rows &&
        nc >= 0 &&
        nc < board.cols &&
        board.cells[nr][nc] &&
        !visited[nr][nc]
      ) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }

  return size;
}

// ============ Solver ============

interface Placement {
  pentominoId: PentominoId;
  position: Position;
  rotation: Rotation;
}

/**
 * Find all valid placements for a piece on the current board.
 */
function findValidPlacements(board: SolverBoard, pentominoId: PentominoId): Placement[] {
  const placements: Placement[] = [];
  const rotations: Rotation[] = [0, 1, 2, 3];

  // Get unique rotations (some pieces have rotational symmetry)
  const seenShapes = new Set<string>();
  const uniqueRotations: Rotation[] = [];

  for (const rotation of rotations) {
    const cells = getPentominoCells(pentominoId, rotation);
    const normalized = cells
      .map((c) => `${c.row},${c.col}`)
      .sort()
      .join('|');
    if (!seenShapes.has(normalized)) {
      seenShapes.add(normalized);
      uniqueRotations.push(rotation);
    }
  }

  // Try all positions with unique rotations
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      for (const rotation of uniqueRotations) {
        if (canPlacePiece(board, pentominoId, { row, col }, rotation)) {
          placements.push({ pentominoId, position: { row, col }, rotation });
        }
      }
    }
  }

  return placements;
}

/**
 * Backtracking solver with Most Constrained Variable heuristic.
 */
function solve(
  board: SolverBoard,
  remainingPieces: PentominoId[],
  solution: PlacedPiece[]
): PlacedPiece[] | null {
  // Base case: all pieces placed
  if (remainingPieces.length === 0) {
    // Verify board is completely filled
    if (board.emptyCellCount === 0) {
      return solution;
    }
    return null;
  }

  // Pruning: remaining cells must equal remaining pieces × 5
  const expectedCells = remainingPieces.length * 5;
  if (board.emptyCellCount !== expectedCells) {
    return null;
  }

  // Pruning: check for unfillable regions
  if (!hasValidRegions(board)) {
    return null;
  }

  // Most Constrained Variable: pick the piece with fewest valid placements
  let minPlacements = Infinity;
  let selectedPieceIndex = 0;
  let selectedPlacements: Placement[] = [];

  for (let i = 0; i < remainingPieces.length; i++) {
    const placements = findValidPlacements(board, remainingPieces[i]);
    if (placements.length === 0) {
      // No valid placements for this piece - backtrack
      return null;
    }
    if (placements.length < minPlacements) {
      minPlacements = placements.length;
      selectedPieceIndex = i;
      selectedPlacements = placements;
    }
  }

  // Try each placement for the selected piece
  const selectedPiece = remainingPieces[selectedPieceIndex];
  const newRemaining = remainingPieces.filter((_, i) => i !== selectedPieceIndex);

  for (const placement of selectedPlacements) {
    // Place the piece
    placePiece(board, placement.pentominoId, placement.position, placement.rotation);
    solution.push({
      pentominoId: placement.pentominoId,
      position: placement.position,
      rotation: placement.rotation,
    });

    // Recurse
    const result = solve(board, newRemaining, solution);
    if (result) {
      return result;
    }

    // Backtrack
    solution.pop();
    removePiece(board, placement.pentominoId, placement.position, placement.rotation);
  }

  return null;
}

// ============ Public API ============

export interface SolveResult {
  solvable: boolean;
  solution: PlacedPiece[] | null;
  searchTimeMs: number;
}

/**
 * Attempt to solve a pentomino puzzle.
 *
 * @param shape - The target shape (true = playable, false = dead)
 * @param pieces - The pentomino IDs to use
 * @returns SolveResult with solution if found
 */
export function solvePuzzle(shape: boolean[][], pieces: PentominoId[]): SolveResult {
  const startTime = Date.now();

  // Validation
  const board = createSolverBoard(shape);
  const expectedCells = pieces.length * 5;

  if (board.emptyCellCount !== expectedCells) {
    console.log(
      `Invalid puzzle: ${board.emptyCellCount} cells but ${pieces.length} pieces (need ${expectedCells} cells)`
    );
    return {
      solvable: false,
      solution: null,
      searchTimeMs: Date.now() - startTime,
    };
  }

  // Solve
  const solution: PlacedPiece[] = [];
  const result = solve(cloneBoard(board), [...pieces], solution);

  return {
    solvable: result !== null,
    solution: result,
    searchTimeMs: Date.now() - startTime,
  };
}

/**
 * Verify a solution is valid.
 */
export function verifySolution(shape: boolean[][], solution: PlacedPiece[]): boolean {
  const board = createSolverBoard(shape);

  for (const placed of solution) {
    if (!canPlacePiece(board, placed.pentominoId, placed.position, placed.rotation)) {
      return false;
    }
    placePiece(board, placed.pentominoId, placed.position, placed.rotation);
  }

  return board.emptyCellCount === 0;
}

// ============ CLI ============

function printShape(shape: boolean[][]): void {
  for (const row of shape) {
    console.log(row.map((c) => (c ? '.' : '#')).join(''));
  }
}

function printSolution(shape: boolean[][], solution: PlacedPiece[]): void {
  const display: string[][] = shape.map((row) => row.map((c) => (c ? '.' : '#')));

  for (const placed of solution) {
    const cells = getPieceCells(placed.pentominoId, placed.position, placed.rotation);
    for (const cell of cells) {
      if (cell.row >= 0 && cell.row < display.length && cell.col >= 0 && cell.col < display[0].length) {
        display[cell.row][cell.col] = placed.pentominoId;
      }
    }
  }

  for (const row of display) {
    console.log(row.join(''));
  }
}

async function main() {
  console.log('Tessera Pentomino Solver');
  console.log('========================\n');

  // Test puzzle: 6x5 rectangle (30 cells = 6 pieces)
  const testShape: boolean[][] = [
    [true, true, true, true, true, true],
    [true, true, true, true, true, true],
    [true, true, true, true, true, true],
    [true, true, true, true, true, true],
    [true, true, true, true, true, true],
  ];

  const testPieces: PentominoId[] = ['F', 'I', 'L', 'P', 'T', 'V'];

  console.log('Test puzzle: 6x5 rectangle with pieces F, I, L, P, T, V');
  console.log('Shape:');
  printShape(testShape);

  console.log('\nSolving...');
  const result = solvePuzzle(testShape, testPieces);

  console.log(`\nResult: ${result.solvable ? 'SOLVABLE' : 'NOT SOLVABLE'}`);
  console.log(`Search time: ${result.searchTimeMs}ms`);

  if (result.solution) {
    console.log('\nSolution:');
    printSolution(testShape, result.solution);

    console.log('\nPlacement details:');
    for (const placed of result.solution) {
      console.log(
        `  ${placed.pentominoId}: position (${placed.position.row}, ${placed.position.col}), rotation ${placed.rotation * 90}°`
      );
    }

    // Verify
    const valid = verifySolution(testShape, result.solution);
    console.log(`\nVerification: ${valid ? 'VALID' : 'INVALID'}`);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}
