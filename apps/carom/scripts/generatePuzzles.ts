/**
 * Offline puzzle generation script for Carom
 *
 * Generates a pool of pre-computed puzzles with quality validation.
 *
 * Usage:
 *   npm run generate-puzzles -w @grid-games/carom           # Generate 200 puzzles (default)
 *   npm run generate-puzzles -w @grid-games/carom -- 100    # Generate 100 puzzles
 *
 * Output:
 *   public/puzzles/pool.json - Contains only UNASSIGNED puzzles
 *
 * Use assignPuzzles.ts to assign puzzles from the pool to specific dates.
 */

import seedrandom from 'seedrandom';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Types (duplicated to avoid module resolution issues in script)
type Direction = 'up' | 'right' | 'down' | 'left';
type PieceType = 'target' | 'blocker';
type WallFlags = number;
type LWallOrientation = 'NE' | 'NW' | 'SE' | 'SW';

const WALL_TOP = 0b0001;
const WALL_RIGHT = 0b0010;
const WALL_BOTTOM = 0b0100;
const WALL_LEFT = 0b1000;

interface Position {
  row: number;
  col: number;
}

interface Piece {
  id: string;
  type: PieceType;
  position: Position;
}

interface Board {
  size: number;
  walls: WallFlags[][];
  goal: Position;
  obstacles: Position[];
}

interface Move {
  pieceId: string;
  direction: Direction;
  from: Position;
  to: Position;
}

// Pool puzzle format with unique ID
export interface PoolPuzzle {
  id: string;
  walls: WallFlags[][];
  goal: { row: number; col: number };
  pieces: { id: string; type: PieceType; row: number; col: number }[];
  optimalMoves: number;
  solutionPath?: { pieceId: string; direction: Direction }[];
}

interface PoolFile {
  generatedAt: string;
  puzzles: PoolPuzzle[];
}

// Configuration
const BOARD_SIZE = 8;
const NUM_BLOCKERS = 3;
const MIN_OPTIMAL_SOLUTION = 10;
const MAX_OPTIMAL_SOLUTION = 20;
const L_WALLS_TOTAL_MIN = 6;
const L_WALLS_TOTAL_MAX = 8;
const PIECE_PLACEMENT_ATTEMPTS = 30;
const BOARD_GENERATION_ATTEMPTS = 15;
const TARGET_PUZZLES = 200;
const EARLY_EXIT_THRESHOLD = 18; // Raised from 12 to allow harder puzzles

type RNG = () => number;

// =====================
// Game Logic
// =====================

function hasWallInDirection(board: Board, pos: Position, direction: Direction): boolean {
  const walls = board.walls[pos.row][pos.col];
  switch (direction) {
    case 'up':
      return (walls & WALL_TOP) !== 0;
    case 'right':
      return (walls & WALL_RIGHT) !== 0;
    case 'down':
      return (walls & WALL_BOTTOM) !== 0;
    case 'left':
      return (walls & WALL_LEFT) !== 0;
  }
}

function isOutOfBounds(board: Board, pos: Position): boolean {
  return pos.row < 0 || pos.row >= board.size || pos.col < 0 || pos.col >= board.size;
}

function hasObstacle(board: Board, pos: Position): boolean {
  return board.obstacles.some((o) => o.row === pos.row && o.col === pos.col);
}

function hasPieceAt(pieces: Piece[], pos: Position): boolean {
  return pieces.some((p) => p.position.row === pos.row && p.position.col === pos.col);
}

function getNextPosition(pos: Position, direction: Direction): Position {
  switch (direction) {
    case 'up':
      return { row: pos.row - 1, col: pos.col };
    case 'right':
      return { row: pos.row, col: pos.col + 1 };
    case 'down':
      return { row: pos.row + 1, col: pos.col };
    case 'left':
      return { row: pos.row, col: pos.col - 1 };
  }
}

function getOppositeWall(direction: Direction): number {
  switch (direction) {
    case 'up':
      return WALL_BOTTOM;
    case 'right':
      return WALL_LEFT;
    case 'down':
      return WALL_TOP;
    case 'left':
      return WALL_RIGHT;
  }
}

function simulateSlide(board: Board, pieces: Piece[], pieceId: string, direction: Direction): Position {
  const piece = pieces.find((p) => p.id === pieceId);
  if (!piece) return { row: -1, col: -1 };

  let current = { ...piece.position };
  const otherPieces = pieces.filter((p) => p.id !== pieceId);

  while (true) {
    if (hasWallInDirection(board, current, direction)) break;
    const next = getNextPosition(current, direction);
    if (isOutOfBounds(board, next)) break;
    if ((board.walls[next.row][next.col] & getOppositeWall(direction)) !== 0) break;
    if (hasObstacle(board, next)) break;
    if (hasPieceAt(otherPieces, next)) break;
    current = next;
  }

  return current;
}

function applyMove(pieces: Piece[], pieceId: string, newPosition: Position): Piece[] {
  return pieces.map((p) => (p.id === pieceId ? { ...p, position: newPosition } : p));
}

function isTargetOnGoal(pieces: Piece[], goal: Position): boolean {
  const target = pieces.find((p) => p.type === 'target');
  return target ? target.position.row === goal.row && target.position.col === goal.col : false;
}

// =====================
// Solver
// =====================

interface SolverState {
  pieces: Piece[];
  moves: number;
  path: Move[];
}

function createStateKey(pieces: Piece[]): string {
  const sorted = [...pieces].sort((a, b) => a.id.localeCompare(b.id));
  return sorted.map((p) => `${p.id}:${p.position.row},${p.position.col}`).join('|');
}

function getSolutionPath(board: Board, initialPieces: Piece[], maxMoves: number = 25): Move[] | null {
  const directions: Direction[] = ['up', 'right', 'down', 'left'];
  const visited = new Set<string>();
  const queue: SolverState[] = [{ pieces: initialPieces, moves: 0, path: [] }];

  visited.add(createStateKey(initialPieces));

  if (isTargetOnGoal(initialPieces, board.goal)) {
    return [];
  }

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.moves >= maxMoves) {
      continue;
    }

    for (const piece of current.pieces) {
      for (const dir of directions) {
        const newPos = simulateSlide(board, current.pieces, piece.id, dir);

        if (newPos.row === piece.position.row && newPos.col === piece.position.col) {
          continue;
        }

        const newPieces = applyMove(current.pieces, piece.id, newPos);
        const stateKey = createStateKey(newPieces);

        if (visited.has(stateKey)) {
          continue;
        }

        visited.add(stateKey);

        const move: Move = {
          pieceId: piece.id,
          direction: dir,
          from: piece.position,
          to: newPos,
        };

        const newState: SolverState = {
          pieces: newPieces,
          moves: current.moves + 1,
          path: [...current.path, move],
        };

        if (isTargetOnGoal(newPieces, board.goal)) {
          return newState.path;
        }

        queue.push(newState);
      }
    }
  }

  return null;
}

// =====================
// Board Generation
// =====================

function createEmptyBoard(size: number): Board {
  const walls: WallFlags[][] = [];
  for (let row = 0; row < size; row++) {
    walls.push(new Array(size).fill(0));
  }
  return {
    size,
    walls,
    goal: { row: 0, col: 0 },
    obstacles: [],
  };
}

function addWallBetween(board: Board, pos1: Position, pos2: Position): void {
  const rowDiff = pos2.row - pos1.row;
  const colDiff = pos2.col - pos1.col;

  if (Math.abs(rowDiff) + Math.abs(colDiff) !== 1) return;

  if (rowDiff === -1) {
    board.walls[pos1.row][pos1.col] |= WALL_TOP;
    board.walls[pos2.row][pos2.col] |= WALL_BOTTOM;
  } else if (rowDiff === 1) {
    board.walls[pos1.row][pos1.col] |= WALL_BOTTOM;
    board.walls[pos2.row][pos2.col] |= WALL_TOP;
  } else if (colDiff === -1) {
    board.walls[pos1.row][pos1.col] |= WALL_LEFT;
    board.walls[pos2.row][pos2.col] |= WALL_RIGHT;
  } else if (colDiff === 1) {
    board.walls[pos1.row][pos1.col] |= WALL_RIGHT;
    board.walls[pos2.row][pos2.col] |= WALL_LEFT;
  }
}

interface LWallPlacement {
  center: Position;
  orientation: LWallOrientation;
}

function addLWall(board: Board, row: number, col: number, orientation: LWallOrientation): void {
  switch (orientation) {
    case 'NE':
      if (row < board.size - 1) addWallBetween(board, { row, col }, { row: row + 1, col });
      if (col > 0) addWallBetween(board, { row, col }, { row, col: col - 1 });
      break;
    case 'NW':
      if (row < board.size - 1) addWallBetween(board, { row, col }, { row: row + 1, col });
      if (col < board.size - 1) addWallBetween(board, { row, col }, { row, col: col + 1 });
      break;
    case 'SE':
      if (row > 0) addWallBetween(board, { row, col }, { row: row - 1, col });
      if (col > 0) addWallBetween(board, { row, col }, { row, col: col - 1 });
      break;
    case 'SW':
      if (row > 0) addWallBetween(board, { row, col }, { row: row - 1, col });
      if (col < board.size - 1) addWallBetween(board, { row, col }, { row, col: col + 1 });
      break;
  }
}

function addEdgeWall(
  board: Board,
  edge: 'top' | 'right' | 'bottom' | 'left',
  position: number
): Position[] {
  if (position <= 1 || position >= board.size - 2) return [];

  const affectedCells: Position[] = [];

  switch (edge) {
    case 'top':
      addWallBetween(board, { row: 0, col: position - 1 }, { row: 0, col: position });
      affectedCells.push({ row: 0, col: position - 1 }, { row: 0, col: position });
      break;
    case 'bottom':
      addWallBetween(
        board,
        { row: board.size - 1, col: position - 1 },
        { row: board.size - 1, col: position }
      );
      affectedCells.push(
        { row: board.size - 1, col: position - 1 },
        { row: board.size - 1, col: position }
      );
      break;
    case 'left':
      addWallBetween(board, { row: position - 1, col: 0 }, { row: position, col: 0 });
      affectedCells.push({ row: position - 1, col: 0 }, { row: position, col: 0 });
      break;
    case 'right':
      addWallBetween(
        board,
        { row: position - 1, col: board.size - 1 },
        { row: position, col: board.size - 1 }
      );
      affectedCells.push(
        { row: position - 1, col: board.size - 1 },
        { row: position, col: board.size - 1 }
      );
      break;
  }

  return affectedCells;
}

function areWithinDistance(a: Position, b: Position, distance: number): boolean {
  return Math.abs(a.row - b.row) <= distance && Math.abs(a.col - b.col) <= distance;
}

function isNearAny(pos: Position, positions: Position[], distance: number): boolean {
  return positions.some((p) => areWithinDistance(pos, p, distance));
}

function generateBoardStructure(board: Board, rng: RNG): LWallPlacement[] {
  const orientations: LWallOrientation[] = ['NE', 'NW', 'SE', 'SW'];
  const lWallPlacements: LWallPlacement[] = [];
  const lWallPositions: Position[] = [];
  const edgeWallCells: Position[] = [];

  const edges: ('top' | 'right' | 'bottom' | 'left')[] = ['top', 'right', 'bottom', 'left'];
  for (const edge of edges) {
    const rangeStart = Math.floor(board.size / 3);
    const rangeEnd = Math.floor((2 * board.size) / 3);
    const position = rangeStart + Math.floor(rng() * (rangeEnd - rangeStart + 1));
    const cells = addEdgeWall(board, edge, position);
    edgeWallCells.push(...cells);
  }

  const targetLWalls =
    L_WALLS_TOTAL_MIN + Math.floor(rng() * (L_WALLS_TOTAL_MAX - L_WALLS_TOTAL_MIN + 1));

  const midRow = Math.floor(board.size / 2);
  const midCol = Math.floor(board.size / 2);
  const quadrants = [
    { rowMin: 1, rowMax: midRow - 1, colMin: 1, colMax: midCol - 1 },
    { rowMin: 1, rowMax: midRow - 1, colMin: midCol, colMax: board.size - 2 },
    { rowMin: midRow, rowMax: board.size - 2, colMin: 1, colMax: midCol - 1 },
    { rowMin: midRow, rowMax: board.size - 2, colMin: midCol, colMax: board.size - 2 },
  ];

  let placed = 0;
  let attempts = 0;
  const maxAttempts = 200;

  while (placed < targetLWalls && attempts < maxAttempts) {
    attempts++;

    const quadrant = quadrants[placed % 4];
    const row = quadrant.rowMin + Math.floor(rng() * (quadrant.rowMax - quadrant.rowMin + 1));
    const col = quadrant.colMin + Math.floor(rng() * (quadrant.colMax - quadrant.colMin + 1));
    const pos = { row, col };

    if (isNearAny(pos, lWallPositions, 1)) continue;
    if (isNearAny(pos, edgeWallCells, 1)) continue;

    const orientation = orientations[Math.floor(rng() * orientations.length)];
    addLWall(board, row, col, orientation);
    lWallPositions.push(pos);
    lWallPlacements.push({ center: pos, orientation });
    placed++;
  }

  return lWallPlacements;
}

function getValidPiecePositions(
  board: Board,
  pieces: Piece[],
  excludeGoal: boolean = false
): Position[] {
  const positions: Position[] = [];

  for (let row = 0; row < board.size; row++) {
    for (let col = 0; col < board.size; col++) {
      const pos = { row, col };

      if ((row === 0 || row === board.size - 1) && (col === 0 || col === board.size - 1)) continue;
      if (hasPieceAt(pieces, pos)) continue;
      if (hasObstacle(board, pos)) continue;
      if (excludeGoal && board.goal.row === row && board.goal.col === col) continue;

      positions.push(pos);
    }
  }

  return positions;
}

function scoreSolution(path: Move[]): { score: number; piecesUsed: Set<string> } {
  const piecesUsed = new Set<string>();
  for (const move of path) {
    piecesUsed.add(move.pieceId);
  }

  let score = 0;
  score += piecesUsed.size * 10;
  score += path.length * 3; // No cap, increased weight to favor longer solutions

  const blockersUsed = [...piecesUsed].filter((id) => id !== 'target').length;
  score += blockersUsed * 15;

  return { score, piecesUsed };
}

function tryGeneratePuzzle(
  board: Board,
  lWallPlacements: LWallPlacement[],
  rng: RNG
): { pieces: Piece[]; optimalMoves: number; piecesUsed: number; solutionPath: Move[] } | null {
  if (lWallPlacements.length === 0) return null;

  const shuffledLWalls = [...lWallPlacements].sort(() => rng() - 0.5);
  const goalLWall = shuffledLWalls[0];
  board.goal = { ...goalLWall.center };

  let bestResult: {
    pieces: Piece[];
    optimalMoves: number;
    piecesUsed: number;
    score: number;
    solutionPath: Move[];
  } | null = null;

  for (let attempt = 0; attempt < PIECE_PLACEMENT_ATTEMPTS; attempt++) {
    const validPositions = getValidPiecePositions(board, [], true);
    if (validPositions.length < NUM_BLOCKERS + 1) continue;

    for (let i = validPositions.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [validPositions[i], validPositions[j]] = [validPositions[j], validPositions[i]];
    }

    const targetCandidates = validPositions.filter((pos) => {
      const dist = Math.abs(pos.row - board.goal.row) + Math.abs(pos.col - board.goal.col);
      return dist >= 3;
    });

    if (targetCandidates.length === 0) continue;

    const targetPos = targetCandidates[Math.floor(rng() * targetCandidates.length)];
    const pieces: Piece[] = [{ id: 'target', type: 'target', position: targetPos }];

    const remainingPositions = validPositions.filter(
      (pos) => pos.row !== targetPos.row || pos.col !== targetPos.col
    );

    for (let i = 0; i < NUM_BLOCKERS && i < remainingPositions.length; i++) {
      pieces.push({
        id: `blocker-${i}`,
        type: 'blocker',
        position: remainingPositions[i],
      });
    }

    if (pieces.length < NUM_BLOCKERS + 1) continue;

    const solution = getSolutionPath(board, pieces, MAX_OPTIMAL_SOLUTION + 5);

    if (!solution) continue;
    if (solution.length < MIN_OPTIMAL_SOLUTION) continue;
    if (solution.length > MAX_OPTIMAL_SOLUTION) continue;

    const { score, piecesUsed } = scoreSolution(solution);

    if (piecesUsed.size < 2) continue;

    if (!bestResult || score > bestResult.score) {
      bestResult = {
        pieces,
        optimalMoves: solution.length,
        piecesUsed: piecesUsed.size,
        score,
        solutionPath: solution,
      };

      // Raised early exit threshold from 12 to 18
      if (piecesUsed.size >= 3 && solution.length >= EARLY_EXIT_THRESHOLD) {
        break;
      }
    }
  }

  return bestResult;
}

function generatePuzzle(seed: string): PoolPuzzle | null {
  for (let boardAttempt = 0; boardAttempt < BOARD_GENERATION_ATTEMPTS; boardAttempt++) {
    const attemptSeed = `${seed}-board-${boardAttempt}`;
    const rng = seedrandom(attemptSeed);

    const board = createEmptyBoard(BOARD_SIZE);
    const lWallPlacements = generateBoardStructure(board, rng);

    const result = tryGeneratePuzzle(board, lWallPlacements, rng);

    if (result) {
      return {
        id: crypto.randomBytes(8).toString('hex'),
        walls: board.walls,
        goal: { row: board.goal.row, col: board.goal.col },
        pieces: result.pieces.map((p) => ({
          id: p.id,
          type: p.type,
          row: p.position.row,
          col: p.position.col,
        })),
        optimalMoves: result.optimalMoves,
        solutionPath: result.solutionPath.map((m) => ({
          pieceId: m.pieceId,
          direction: m.direction,
        })),
      };
    }
  }

  return null;
}

// =====================
// Main Generation Logic
// =====================

async function generatePuzzles(
  targetCount: number,
  existingCount: number
): Promise<{ puzzles: PoolPuzzle[]; failures: number }> {
  const puzzles: PoolPuzzle[] = [];
  let failures = 0;
  let seedOffset = 0;

  const startTime = Date.now();

  while (puzzles.length < targetCount) {
    const puzzleNumber = existingCount + puzzles.length + 1;
    const seed = `carom-puzzle-${puzzleNumber + seedOffset}`;

    const puzzle = generatePuzzle(seed);

    if (puzzle) {
      puzzles.push(puzzle);

      // Log progress every 10 puzzles
      if (puzzles.length % 10 === 0) {
        const elapsedSec = (Date.now() - startTime) / 1000;
        const rate = puzzles.length / elapsedSec;
        const remaining = (targetCount - puzzles.length) / rate;
        console.log(
          `  ${puzzles.length}/${targetCount} puzzles, ${failures} failures, ~${Math.ceil(remaining)}s remaining`
        );
      }
    } else {
      failures++;
      seedOffset++;
      if (failures > targetCount * 2) {
        console.error('\nToo many failures, aborting.');
        break;
      }
    }
  }

  return { puzzles, failures };
}

async function main() {
  const countArg = process.argv[2];
  const targetCount = countArg ? parseInt(countArg, 10) : TARGET_PUZZLES;

  console.log('Generating Carom puzzle pool...');
  console.log(`Target: ${targetCount} puzzles`);
  console.log(`Difficulty: ${MIN_OPTIMAL_SOLUTION}-${MAX_OPTIMAL_SOLUTION} moves`);
  console.log(`Early exit threshold: ${EARLY_EXIT_THRESHOLD} moves`);
  console.log('');

  const outputDir = path.join(__dirname, '..', 'public', 'puzzles');
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
      pool = { generatedAt: '', puzzles: [] };
    }
  } else {
    pool = { generatedAt: '', puzzles: [] };
  }

  const startingCount = pool.puzzles.length;
  const startTime = Date.now();

  const result = await generatePuzzles(targetCount, startingCount);

  pool.puzzles.push(...result.puzzles);

  const elapsed = (Date.now() - startTime) / 1000;
  console.log('\n');
  console.log('Generation complete!');
  console.log(`Time: ${elapsed.toFixed(1)}s`);
  console.log(`New puzzles: ${result.puzzles.length}`);
  console.log(`Total failures: ${result.failures}`);

  // Stats
  const moves = pool.puzzles.map((p) => p.optimalMoves);
  const avgMoves = moves.reduce((a, b) => a + b, 0) / moves.length;
  const minMoves = Math.min(...moves);
  const maxMoves = Math.max(...moves);

  console.log(`Move stats: min=${minMoves}, max=${maxMoves}, avg=${avgMoves.toFixed(1)}`);

  // Distribution
  const distribution: Record<number, number> = {};
  for (const m of moves) {
    distribution[m] = (distribution[m] || 0) + 1;
  }
  console.log('Move distribution:');
  for (let i = MIN_OPTIMAL_SOLUTION; i <= MAX_OPTIMAL_SOLUTION; i++) {
    const count = distribution[i] || 0;
    const bar = '█'.repeat(Math.ceil(count / 5));
    console.log(`  ${i.toString().padStart(2)}: ${count.toString().padStart(3)} ${bar}`);
  }

  // Save pool
  pool.generatedAt = new Date().toISOString();
  fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2));

  const fileSizeKB = (fs.statSync(poolPath).size / 1024).toFixed(1);
  console.log(`\nSaved pool to: ${poolPath}`);
  console.log(`  Previous count: ${startingCount}`);
  console.log(`  Added: ${result.puzzles.length}`);
  console.log(`  Total: ${pool.puzzles.length}`);
  console.log(`  File size: ${fileSizeKB} KB`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
