/**
 * Dabble Puzzle Pre-Generation Script
 *
 * Generates puzzles into pool.json. Each puzzle gets a unique ID.
 * Use assignPuzzles.ts to assign puzzles from the pool to specific dates.
 *
 * Usage:
 *   npx tsx scripts/generatePuzzles.ts [count]
 *
 * Examples:
 *   npx tsx scripts/generatePuzzles.ts           # Generate 100 puzzles
 *   npx tsx scripts/generatePuzzles.ts 200       # Generate 200 puzzles
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { generateDailyPuzzle, solveWithBeamSearch, calculateStarThresholds, loadDictionary } from './solver';
import type { StarThresholds } from './solver';

// Quality filtering thresholds - reject puzzles outside this range
const MIN_HEURISTIC_MAX = 60;
const MAX_HEURISTIC_MAX = 200;

export interface PoolPuzzle {
  id: string;
  archetype: string;
  letters: string[];
  board: {
    size: number;
    cells: {
      row: number;
      col: number;
      bonus: string | null;
      isPlayable: boolean;
    }[][];
  };
  thresholds: StarThresholds;
}

interface PoolFile {
  generatedAt: string;
  puzzles: PoolPuzzle[];
}

function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

async function main() {
  const countArg = process.argv[2];
  const count = countArg ? parseInt(countArg, 10) : 100;

  console.log(`\nDabble Puzzle Pool Generator`);
  console.log(`============================\n`);
  console.log(`Puzzles to generate: ${count}\n`);

  await loadDictionary();

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
      pool = { generatedAt: '', puzzles: [] };
    }
  } else {
    pool = { generatedAt: '', puzzles: [] };
  }

  const startingCount = pool.puzzles.length;

  // Generate new puzzles using random seeds
  let rejectedCount = 0;
  for (let i = 0; i < count; i++) {
    const seed = `puzzle-${Date.now()}-${i}-${Math.random()}-${rejectedCount}`;

    process.stdout.write(`Generating puzzle ${i + 1}/${count}...`);

    const puzzle = generateDailyPuzzle(seed);
    const { bestScore } = solveWithBeamSearch(puzzle);

    // Quality filtering: reject puzzles outside acceptable range
    if (bestScore < MIN_HEURISTIC_MAX || bestScore > MAX_HEURISTIC_MAX) {
      console.log(` REJECTED (score ${bestScore} outside ${MIN_HEURISTIC_MAX}-${MAX_HEURISTIC_MAX})`);
      rejectedCount++;
      i--; // Retry this slot
      continue;
    }

    const thresholds = calculateStarThresholds(bestScore);

    const poolPuzzle: PoolPuzzle = {
      id: generateId(),
      archetype: puzzle.archetype,
      letters: puzzle.letters,
      board: {
        size: puzzle.board.size,
        cells: puzzle.board.cells.map(row =>
          row.map(cell => ({
            row: cell.row,
            col: cell.col,
            bonus: cell.bonus,
            isPlayable: cell.isPlayable,
          }))
        ),
      },
      thresholds,
    };

    pool.puzzles.push(poolPuzzle);
    console.log(` ${puzzle.archetype}, max=${bestScore}, id=${poolPuzzle.id}`);
  }

  if (rejectedCount > 0) {
    console.log(`\nRejected ${rejectedCount} puzzles outside quality range (${MIN_HEURISTIC_MAX}-${MAX_HEURISTIC_MAX})`);
  }

  // Save pool
  pool.generatedAt = new Date().toISOString();
  fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2));

  console.log(`\nSaved pool to ${poolPath}`);
  console.log(`  Previous count: ${startingCount}`);
  console.log(`  Added: ${count}`);
  console.log(`  Total: ${pool.puzzles.length}`);

  // Print stats
  const archetypeCounts: Record<string, number> = {};
  let totalMax = 0;

  for (const p of pool.puzzles) {
    archetypeCounts[p.archetype] = (archetypeCounts[p.archetype] || 0) + 1;
    totalMax += p.thresholds.heuristicMax;
  }

  console.log(`\nArchetype distribution (full pool):`);
  for (const [arch, cnt] of Object.entries(archetypeCounts).sort()) {
    console.log(`  ${arch}: ${cnt}`);
  }

  console.log(`\nAverage heuristic max: ${Math.round(totalMax / pool.puzzles.length)}`);
}

main().catch(console.error);
