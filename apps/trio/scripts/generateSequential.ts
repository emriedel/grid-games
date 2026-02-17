/**
 * Generate Sequential Trio puzzles.
 *
 * Sequential Draw Mode:
 * - 9 cards on board with exactly 1 valid set
 * - Player finds it, 3 new cards replace the found set
 * - New board again has exactly 1 valid set
 * - 5 rounds total
 *
 * Usage:
 *   npx tsx scripts/generateSequential.ts [count]
 */

import * as fs from 'fs';
import * as path from 'path';
import seedrandom from 'seedrandom';
import type {
  ShapeId,
  ColorId,
  PatternId,
  VisualMapping,
  SequentialPuzzle,
  PuzzleRound,
  StarThresholds,
  Tuple,
} from '../src/types';
import { SHAPES, SHAPE_CONFLICT_GROUPS } from '../src/constants/shapes';
import { COLORS } from '../src/constants/colors';
import { PATTERNS } from '../src/constants/patterns';
import { GAME_CONFIG } from '../src/constants';

// Pool file path
const POOL_PATH = path.join(__dirname, '..', 'public', 'puzzles', 'pool.json');

// All 81 possible tuples in GF(3)^4
function generateAllTuples(): Tuple[] {
  const tuples: Tuple[] = [];
  for (let a = 0; a < 3; a++) {
    for (let b = 0; b < 3; b++) {
      for (let c = 0; c < 3; c++) {
        for (let d = 0; d < 3; d++) {
          tuples.push([a, b, c, d]);
        }
      }
    }
  }
  return tuples;
}

const ALL_TUPLES = generateAllTuples();

// Convert tuple to unique key (0-80)
function tupleToKey(tuple: Tuple): number {
  return tuple[0] * 27 + tuple[1] * 9 + tuple[2] * 3 + tuple[3];
}

// Check if three tuples form a valid set (sum = 0 mod 3 for each attribute)
function isValidSetFromTuples(a: Tuple, b: Tuple, c: Tuple): boolean {
  for (let i = 0; i < 4; i++) {
    if ((a[i] + b[i] + c[i]) % 3 !== 0) {
      return false;
    }
  }
  return true;
}

// Find all valid sets in a list of tuples
function findAllValidSets(tuples: Tuple[]): [number, number, number][] {
  const validSets: [number, number, number][] = [];
  const n = tuples.length;

  for (let i = 0; i < n - 2; i++) {
    for (let j = i + 1; j < n - 1; j++) {
      for (let k = j + 1; k < n; k++) {
        if (isValidSetFromTuples(tuples[i], tuples[j], tuples[k])) {
          validSets.push([i, j, k]);
        }
      }
    }
  }

  return validSets;
}

// Given two tuples, find the third that completes the set
function findCompletingTuple(a: Tuple, b: Tuple): Tuple {
  return [
    (6 - a[0] - b[0]) % 3,
    (6 - a[1] - b[1]) % 3,
    (6 - a[2] - b[2]) % 3,
    (6 - a[3] - b[3]) % 3,
  ] as Tuple;
}

// Generate a unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Fisher-Yates shuffle
function shuffle<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Select n random items from an array
function selectN<T>(items: T[], n: number, rng: () => number): T[] {
  const shuffled = shuffle(items, rng);
  return shuffled.slice(0, n);
}

/**
 * Check if a set of shapes has any conflicts (similar shapes together).
 */
function hasShapeConflict(shapes: ShapeId[]): boolean {
  for (const group of SHAPE_CONFLICT_GROUPS) {
    const matchCount = shapes.filter(s => group.includes(s)).length;
    if (matchCount > 1) {
      return true; // More than one shape from the same conflict group
    }
  }
  return false;
}


/**
 * Select 3 shapes that don't conflict with each other.
 */
function selectNonConflictingShapes(rng: () => number, maxAttempts: number = 100): [ShapeId, ShapeId, ShapeId] {
  const shapeIds = SHAPES.map(s => s.id);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const selected = selectN(shapeIds, 3, rng) as [ShapeId, ShapeId, ShapeId];
    if (!hasShapeConflict(selected)) {
      return selected;
    }
  }

  // Fallback: just return any 3 shapes (shouldn't happen often)
  console.warn('Could not find non-conflicting shapes, using fallback');
  return selectN(shapeIds, 3, rng) as [ShapeId, ShapeId, ShapeId];
}

/**
 * Get all 3 colors (we now have exactly 3 distinct colors).
 */
function selectAllColors(rng: () => number): [ColorId, ColorId, ColorId] {
  const colorIds = COLORS.map(c => c.id);
  // Shuffle to randomize which tuple value maps to which color
  return shuffle(colorIds, rng) as [ColorId, ColorId, ColorId];
}

// Generate visual mapping
function generateVisualMapping(rng: () => number): VisualMapping {
  const patternIds = PATTERNS.map(p => p.id);

  return {
    shapes: selectNonConflictingShapes(rng),
    colors: selectAllColors(rng),
    patterns: selectN(patternIds, 3, rng) as [PatternId, PatternId, PatternId],
  };
}

// Generate thresholds (legacy - kept for backwards compatibility with puzzle files)
function generateThresholds(): StarThresholds {
  return {
    threeStar: 45,  // Legacy: under 45 seconds was 3 stars
    twoStar: 90,    // Legacy: under 90 seconds was 2 stars
  };
}

/**
 * Check if a "boring" set (3+ attributes are "all same").
 * A boring set has shape, color, AND pattern all same, with only count different.
 */
function isBoringSet(tuples: [Tuple, Tuple, Tuple]): boolean {
  let sameCount = 0;
  for (let i = 0; i < 4; i++) {
    if (tuples[0][i] === tuples[1][i] && tuples[1][i] === tuples[2][i]) {
      sameCount++;
    }
  }
  // A set is "boring" if 3+ attributes are all same
  // This means only 0-1 attributes are "all different"
  return sameCount >= 3;
}

/**
 * Try to find a 9-card board with exactly 1 valid set.
 *
 * Strategy:
 * 1. Pick 3 tuples that form a valid (preferably non-boring) set
 * 2. Pick 9 more tuples that don't form any additional sets with each other
 *    or with the chosen 3
 *
 * Returns null if unsuccessful after maxAttempts.
 */
function findSingleSetBoard(
  usedKeys: Set<number>,
  rng: () => number,
  maxAttempts: number = 500,
  preferNonBoring: boolean = true
): { board: Tuple[]; validSet: [number, number, number] } | null {
  const availableTuples = ALL_TUPLES.filter(t => !usedKeys.has(tupleToKey(t)));

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Step 1: Pick 3 tuples that form a valid set
    const shuffled = shuffle(availableTuples, rng);
    let setTuples: [Tuple, Tuple, Tuple] | null = null;

    // Try to find a non-boring set first
    for (let i = 0; i < shuffled.length - 2 && !setTuples; i++) {
      for (let j = i + 1; j < shuffled.length - 1 && !setTuples; j++) {
        const third = findCompletingTuple(shuffled[i], shuffled[j]);
        const thirdKey = tupleToKey(third);

        // Check if third is available
        if (!usedKeys.has(thirdKey)) {
          const thirdIdx = shuffled.findIndex(
            t => tupleToKey(t) === thirdKey
          );
          if (thirdIdx > j) {
            const candidate: [Tuple, Tuple, Tuple] = [
              shuffled[i],
              shuffled[j],
              shuffled[thirdIdx],
            ];
            if (!preferNonBoring || !isBoringSet(candidate)) {
              setTuples = candidate;
            }
          }
        }
      }
    }

    // If no non-boring set found and we prefer non-boring, try any set
    if (!setTuples && preferNonBoring) {
      for (let i = 0; i < shuffled.length - 2 && !setTuples; i++) {
        for (let j = i + 1; j < shuffled.length - 1 && !setTuples; j++) {
          const third = findCompletingTuple(shuffled[i], shuffled[j]);
          const thirdKey = tupleToKey(third);

          if (!usedKeys.has(thirdKey)) {
            const thirdIdx = shuffled.findIndex(
              t => tupleToKey(t) === thirdKey
            );
            if (thirdIdx > j) {
              setTuples = [shuffled[i], shuffled[j], shuffled[thirdIdx]];
            }
          }
        }
      }
    }

    if (!setTuples) {
      continue; // No valid set found with available tuples
    }

    const setKeys = new Set(setTuples.map(tupleToKey));

    // Step 2: Find 9 more tuples that don't create additional sets
    const remaining = shuffled.filter(t => !setKeys.has(tupleToKey(t)));
    const fillers: Tuple[] = [];

    for (const candidate of remaining) {
      if (fillers.length >= 6) break;

      // Check if adding this tuple creates any new valid sets
      const testBoard = [...setTuples, ...fillers, candidate];
      const sets = findAllValidSets(testBoard);

      // Should have exactly 1 set (the original 3)
      if (sets.length === 1) {
        fillers.push(candidate);
      }
    }

    if (fillers.length === 6) {
      // Success! Combine and shuffle positions
      const board = shuffle([...setTuples, ...fillers], rng);

      // Find the indices of the valid set in the shuffled board
      const setKeySet = new Set(setTuples.map(tupleToKey));
      const validSetIndices: number[] = [];
      for (let i = 0; i < board.length; i++) {
        if (setKeySet.has(tupleToKey(board[i]))) {
          validSetIndices.push(i);
        }
      }

      // Verify exactly 1 set exists
      const finalSets = findAllValidSets(board);
      if (finalSets.length !== 1) {
        continue; // Something went wrong, try again
      }

      return {
        board,
        validSet: validSetIndices.sort((a, b) => a - b) as [number, number, number],
      };
    }
  }

  return null;
}

/**
 * Find 3 replacement cards that create exactly 1 valid set on the new board.
 *
 * @param remainingTuples The 6 tuples that remain after removing the found set
 * @param remainingPositions The original board positions of the remaining tuples
 * @param replacementPositions The positions where replacement cards will go
 * @param usedKeys Tuples that have been used in previous rounds
 */
function findValidReplacements(
  remainingTuples: Tuple[],
  remainingPositions: number[],
  replacementPositions: [number, number, number],
  usedKeys: Set<number>,
  rng: () => number,
  maxAttempts: number = 500,
  preferNonBoring: boolean = true
): { replacements: Tuple[]; validSet: [number, number, number] } | null {
  const availableTuples = ALL_TUPLES.filter(
    t =>
      !usedKeys.has(tupleToKey(t)) &&
      !remainingTuples.some(r => tupleToKey(r) === tupleToKey(t))
  );

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shuffled = shuffle(availableTuples, rng);

    // Try different combinations of 3 replacement cards
    for (let i = 0; i < Math.min(shuffled.length - 2, 50); i++) {
      for (let j = i + 1; j < Math.min(shuffled.length - 1, 60); j++) {
        for (let k = j + 1; k < Math.min(shuffled.length, 70); k++) {
          const replacements = [shuffled[i], shuffled[j], shuffled[k]];
          const newBoard = [...remainingTuples, ...replacements];

          const sets = findAllValidSets(newBoard);
          if (sets.length === 1) {
            // Check if set is non-boring if preferred
            const setTuples = sets[0].map(idx => newBoard[idx]) as [Tuple, Tuple, Tuple];
            if (preferNonBoring && isBoringSet(setTuples)) {
              continue;
            }

            // Map indices from newBoard context to actual board positions
            // newBoard = [...remainingTuples, ...replacements]
            // indices 0-5 map to remainingPositions
            // indices 6-8 map to replacementPositions
            const mappedIndices = sets[0].map(idx => {
              if (idx < remainingTuples.length) {
                return remainingPositions[idx];
              } else {
                return replacementPositions[idx - remainingTuples.length];
              }
            }).sort((a, b) => a - b) as [number, number, number];

            return {
              replacements,
              validSet: mappedIndices,
            };
          }
        }
      }
    }

    // If preferNonBoring failed, try any valid configuration
    if (preferNonBoring) {
      for (let i = 0; i < Math.min(shuffled.length - 2, 50); i++) {
        for (let j = i + 1; j < Math.min(shuffled.length - 1, 60); j++) {
          for (let k = j + 1; k < Math.min(shuffled.length, 70); k++) {
            const replacements = [shuffled[i], shuffled[j], shuffled[k]];
            const newBoard = [...remainingTuples, ...replacements];

            const sets = findAllValidSets(newBoard);
            if (sets.length === 1) {
              // Map indices to actual board positions
              const mappedIndices = sets[0].map(idx => {
                if (idx < remainingTuples.length) {
                  return remainingPositions[idx];
                } else {
                  return replacementPositions[idx - remainingTuples.length];
                }
              }).sort((a, b) => a - b) as [number, number, number];

              return {
                replacements,
                validSet: mappedIndices,
              };
            }
          }
        }
      }
    }
  }

  return null;
}

/**
 * Generate a complete 5-round sequential puzzle.
 */
function generateSequentialPuzzle(seed: string): SequentialPuzzle | null {
  const rng = seedrandom(seed);
  const rounds: PuzzleRound[] = [];
  const usedKeys = new Set<number>();

  let currentBoard: Tuple[] = [];

  for (let round = 0; round < GAME_CONFIG.ROUND_COUNT; round++) {
    if (round === 0) {
      // Round 1: Generate initial 9-card board
      const result = findSingleSetBoard(usedKeys, rng);
      if (!result) {
        return null; // Failed to generate initial board
      }

      currentBoard = result.board;
      rounds.push({
        tuples: result.board,
        validSetIndices: result.validSet,
      });
    } else {
      // Rounds 2-5: Find replacement cards
      const prevSet = rounds[round - 1].validSetIndices;

      // Track which positions remain and which get replacements
      const remainingPositions: number[] = [];
      const remainingTuples: Tuple[] = [];
      for (let i = 0; i < GAME_CONFIG.CARD_COUNT; i++) {
        if (!prevSet.includes(i)) {
          remainingPositions.push(i);
          remainingTuples.push(currentBoard[i]);
        }
      }
      const replacementPositions = [...prevSet].sort((a, b) => a - b) as [number, number, number];

      // Mark the removed tuples as used
      for (const idx of prevSet) {
        usedKeys.add(tupleToKey(currentBoard[idx]));
      }

      const result = findValidReplacements(
        remainingTuples,
        remainingPositions,
        replacementPositions,
        usedKeys,
        rng
      );
      if (!result) {
        return null; // Failed to find valid replacements
      }

      // Build new board: remaining cards stay in same positions, new cards fill gaps
      const newBoard: Tuple[] = [];
      let replacementIdx = 0;
      for (let i = 0; i < GAME_CONFIG.CARD_COUNT; i++) {
        if (prevSet.includes(i)) {
          // This position gets a replacement card
          newBoard.push(result.replacements[replacementIdx++]);
        } else {
          // This position keeps its original card
          newBoard.push(currentBoard[i]);
        }
      }

      currentBoard = newBoard;
      rounds.push({
        tuples: result.replacements,
        validSetIndices: result.validSet,
      });
    }
  }

  // Mark final round's set as used (for completeness)
  const lastSet = rounds[rounds.length - 1].validSetIndices;
  for (const idx of lastSet) {
    usedKeys.add(tupleToKey(currentBoard[idx]));
  }

  return {
    id: generateId(),
    visualMapping: generateVisualMapping(rng),
    rounds,
    thresholds: generateThresholds(),
  };
}

// Load existing pool
function loadPool(): SequentialPuzzle[] {
  try {
    const content = fs.readFileSync(POOL_PATH, 'utf-8');
    const data = JSON.parse(content);
    return data.puzzles || [];
  } catch {
    return [];
  }
}

// Save pool
function savePool(puzzles: SequentialPuzzle[]): void {
  const data = {
    gameId: 'trio',
    version: 2, // Sequential format
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
  const count = parseInt(process.argv[2] || '100', 10);

  console.log(`Generating ${count} Sequential Trio puzzles...`);
  console.log(`Config: ${GAME_CONFIG.CARD_COUNT} cards, ${GAME_CONFIG.ROUND_COUNT} rounds`);

  // Start fresh (don't load existing pool since format changed)
  const puzzles: SequentialPuzzle[] = [];
  const existingIds = new Set<string>();
  let attempts = 0;
  let failures = 0;
  const maxAttempts = count * 20;

  while (puzzles.length < count && attempts < maxAttempts) {
    const seed = `trio-seq-${Date.now()}-${attempts}`;
    const puzzle = generateSequentialPuzzle(seed);

    if (puzzle && !existingIds.has(puzzle.id)) {
      puzzles.push(puzzle);
      existingIds.add(puzzle.id);

      if (puzzles.length % 10 === 0) {
        console.log(`  Generated ${puzzles.length}/${count} puzzles...`);
      }
    } else if (!puzzle) {
      failures++;
    }

    attempts++;
  }

  console.log(`\nGenerated ${puzzles.length} puzzles (${failures} failures)`);

  // Analyze boring set distribution
  let boringCount = 0;
  let totalSets = 0;
  for (const puzzle of puzzles) {
    for (const round of puzzle.rounds) {
      totalSets++;
      // Get the tuples for this round's valid set
      let roundTuples: Tuple[];
      if (round.tuples.length === 9) {
        // Round 1: tuples is the full board
        roundTuples = round.tuples;
      } else {
        // Rounds 2-5: need to reconstruct (skip for analysis simplicity)
        continue;
      }
      const setTuples = round.validSetIndices.map(i => roundTuples[i]) as [Tuple, Tuple, Tuple];
      if (isBoringSet(setTuples)) {
        boringCount++;
      }
    }
  }

  // Only count round 1 for analysis since we skipped others
  const round1Total = puzzles.length;
  console.log(`Boring sets in round 1: ${boringCount}/${round1Total} (${(boringCount / round1Total * 100).toFixed(1)}%)`);

  // Save pool
  savePool(puzzles);
  console.log(`\nSaved to ${POOL_PATH}`);
}

main().catch(console.error);
