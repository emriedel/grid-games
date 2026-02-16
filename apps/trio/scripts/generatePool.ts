/**
 * LEGACY - Generate Trio puzzles into the pool (old 15-card format).
 *
 * This script is kept for reference but is no longer used.
 * Use generateSequential.ts instead for the new 12-card, 5-round format.
 *
 * Each puzzle:
 * 1. Selects a base configuration (15 tuples with exactly 5 valid sets)
 * 2. Maps tuple values to visual attributes (shapes, colors, patterns)
 * 3. Shuffles card positions on the board
 *
 * Usage:
 *   npx tsx scripts/generatePool.ts [count]
 */

import * as fs from 'fs';
import * as path from 'path';
import seedrandom from 'seedrandom';
import { BASE_CONFIGS } from '../src/lib/baseConfigs';
import type { ShapeId, ColorId, PatternId, VisualMapping, StarThresholds } from '../src/types';
import { SHAPES } from '../src/constants/shapes';
import { COLORS } from '../src/constants/colors';
import { PATTERNS } from '../src/constants/patterns';

// Legacy Puzzle type for the old 15-card format
interface LegacyPuzzle {
  id: string;
  puzzleNumber?: number;
  baseConfigId: string;
  visualMapping: VisualMapping;
  cardOrder: number[];
  thresholds: StarThresholds;
}

// Pool file path
const POOL_PATH = path.join(__dirname, '..', 'public', 'puzzles', 'pool-legacy.json');

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Fisher-Yates shuffle with seeded RNG
function shuffle<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Select 3 random items from an array
function selectThree<T>(items: T[], rng: () => number): [T, T, T] {
  const shuffled = shuffle(items, rng);
  return [shuffled[0], shuffled[1], shuffled[2]];
}

// Generate visual mapping for a puzzle
function generateVisualMapping(rng: () => number): VisualMapping {
  const shapeIds = SHAPES.map(s => s.id);
  const colorIds = COLORS.map(c => c.id);
  const patternIds = PATTERNS.map(p => p.id);

  return {
    shapes: selectThree(shapeIds, rng) as [ShapeId, ShapeId, ShapeId],
    colors: selectThree(colorIds, rng) as [ColorId, ColorId, ColorId],
    patterns: selectThree(patternIds, rng) as [PatternId, PatternId, PatternId],
  };
}

// Generate card order (shuffle positions)
function generateCardOrder(rng: () => number): number[] {
  const order = Array.from({ length: 15 }, (_, i) => i);
  return shuffle(order, rng);
}

// Generate star thresholds based on configuration complexity
// For now, use default thresholds. Can be refined later based on testing.
function generateThresholds(): StarThresholds {
  return {
    threeStar: 60,  // Under 1 minute
    twoStar: 120,   // Under 2 minutes
  };
}

// Generate a single puzzle
function generatePuzzle(seed: string): LegacyPuzzle {
  const rng = seedrandom(seed);

  // Select a random base configuration
  const configIndex = Math.floor(rng() * BASE_CONFIGS.length);
  const baseConfig = BASE_CONFIGS[configIndex];

  return {
    id: generateId(),
    baseConfigId: baseConfig.id,
    visualMapping: generateVisualMapping(rng),
    cardOrder: generateCardOrder(rng),
    thresholds: generateThresholds(),
  };
}

// Load existing pool
function loadPool(): LegacyPuzzle[] {
  try {
    const content = fs.readFileSync(POOL_PATH, 'utf-8');
    const data = JSON.parse(content);
    return data.puzzles || [];
  } catch {
    return [];
  }
}

// Save pool
function savePool(puzzles: LegacyPuzzle[]): void {
  const data = {
    gameId: 'trio',
    generatedAt: new Date().toISOString(),
    puzzles,
  };

  const dir = path.dirname(POOL_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(POOL_PATH, JSON.stringify(data, null, 2));
}

// Main
async function main() {
  console.log('WARNING: This is the LEGACY puzzle generator (15-card format).');
  console.log('Use generateSequential.ts for the new 12-card, 5-round format.\n');

  const count = parseInt(process.argv[2] || '100', 10);

  console.log(`Generating ${count} Trio puzzles (legacy format)...`);

  // Load existing pool
  const existingPuzzles = loadPool();
  const existingIds = new Set(existingPuzzles.map(p => p.id));

  console.log(`Existing pool has ${existingPuzzles.length} puzzles`);

  // Generate new puzzles
  const newPuzzles: LegacyPuzzle[] = [];
  let attempts = 0;
  const maxAttempts = count * 10;

  while (newPuzzles.length < count && attempts < maxAttempts) {
    const seed = `trio-gen-${Date.now()}-${attempts}`;
    const puzzle = generatePuzzle(seed);

    // Ensure unique ID
    if (!existingIds.has(puzzle.id)) {
      newPuzzles.push(puzzle);
      existingIds.add(puzzle.id);
    }

    attempts++;
  }

  console.log(`Generated ${newPuzzles.length} new puzzles`);

  // Combine and save
  const allPuzzles = [...existingPuzzles, ...newPuzzles];
  savePool(allPuzzles);

  console.log(`Total pool size: ${allPuzzles.length} puzzles`);
  console.log(`Saved to ${POOL_PATH}`);
}

main().catch(console.error);
