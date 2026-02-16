/**
 * Find valid base configurations for Trio puzzles.
 *
 * A valid base configuration is a set of 15 tuples in GF(3)^4 that:
 * 1. Contains exactly 5 valid sets (trios)
 * 2. Sets don't overlap - each tuple belongs to exactly one set
 * 3. No other valid sets exist among the 15 tuples
 *
 * This is a one-time computation. Once we find valid configurations,
 * we store them and use them for daily puzzle generation.
 */

import * as fs from 'fs';
import * as path from 'path';

type Tuple = [number, number, number, number];

/**
 * Check if three tuples form a valid set.
 * Sum of each component must be 0 mod 3.
 */
function isValidSet(a: Tuple, b: Tuple, c: Tuple): boolean {
  for (let i = 0; i < 4; i++) {
    if ((a[i] + b[i] + c[i]) % 3 !== 0) {
      return false;
    }
  }
  return true;
}

/**
 * Convert tuple to key for hashing.
 */
function tupleToKey(t: Tuple): number {
  return t[0] * 27 + t[1] * 9 + t[2] * 3 + t[3];
}

/**
 * Convert key back to tuple.
 */
function keyToTuple(key: number): Tuple {
  return [
    Math.floor(key / 27) % 3,
    Math.floor(key / 9) % 3,
    Math.floor(key / 3) % 3,
    key % 3,
  ];
}

/**
 * Given two tuples, find the third that completes the set.
 */
function findThird(a: Tuple, b: Tuple): Tuple {
  return [
    (6 - a[0] - b[0]) % 3,
    (6 - a[1] - b[1]) % 3,
    (6 - a[2] - b[2]) % 3,
    (6 - a[3] - b[3]) % 3,
  ] as Tuple;
}

/**
 * Find all valid sets in a list of tuples.
 */
function findAllSets(tuples: Tuple[]): [number, number, number][] {
  const sets: [number, number, number][] = [];
  const n = tuples.length;

  for (let i = 0; i < n - 2; i++) {
    for (let j = i + 1; j < n - 1; j++) {
      for (let k = j + 1; k < n; k++) {
        if (isValidSet(tuples[i], tuples[j], tuples[k])) {
          sets.push([i, j, k]);
        }
      }
    }
  }

  return sets;
}

/**
 * Calculate diversity score for a configuration.
 * Higher score = more interesting puzzle.
 *
 * MATHEMATICAL CONSTRAINT: Every valid 5-set config has AT LEAST 3 "boring" sets
 * (where 3+ attributes are "all same"). This is unavoidable in GF(3)^4.
 *
 * Scoring strategy:
 * 1. REQUIRE exactly 3 boring sets (the minimum possible)
 * 2. Require all 3 values used for each attribute
 * 3. Maximize diversity in the 2 non-boring sets
 */
function calculateDiversityScore(tuples: Tuple[], sets: [number, number, number][]): number {
  // Count boring sets (3+ attributes are "all same")
  let boringCount = 0;
  let nonBoringDiversity = 0;

  for (const [i, j, k] of sets) {
    let allSameCount = 0;
    let allDiffCount = 0;

    for (let attr = 0; attr < 4; attr++) {
      const values = [tuples[i][attr], tuples[j][attr], tuples[k][attr]];
      const unique = new Set(values).size;
      if (unique === 1) allSameCount++;
      else if (unique === 3) allDiffCount++;
    }

    if (allSameCount >= 3) {
      boringCount++;
    } else {
      // Non-boring set: maximize "all different" attributes
      nonBoringDiversity += allDiffCount * 10;
    }
  }

  // HARD FILTER: Only accept configs with exactly 3 boring sets (minimum)
  if (boringCount !== 3) {
    return -1000; // Reject configs with 4 or 5 boring sets
  }

  // Check that all 3 values are used for each attribute
  let attributeScore = 0;
  for (let attr = 0; attr < 4; attr++) {
    const valuesUsed = new Set<number>();
    for (const tuple of tuples) {
      valuesUsed.add(tuple[attr]);
    }
    if (valuesUsed.size === 3) {
      attributeScore += 20;
    } else if (valuesUsed.size === 2) {
      attributeScore -= 50; // Strongly penalize missing values
    } else {
      return -1000; // Reject configs with only 1 value for any attribute
    }
  }

  return attributeScore + nonBoringDiversity;
}

/**
 * Generate all 81 possible tuples in GF(3)^4.
 */
function generateAllTuples(): Tuple[] {
  const tuples: Tuple[] = [];
  for (let i = 0; i < 81; i++) {
    tuples.push(keyToTuple(i));
  }
  return tuples;
}

/**
 * Check if a configuration is valid:
 * - Exactly 5 non-overlapping sets
 * - All 15 tuples are used
 * - No other valid sets exist
 */
function isValidConfiguration(
  tuples: Tuple[],
  sets: [number, number, number][]
): boolean {
  // Must have exactly 5 sets
  if (sets.length !== 5) return false;

  // Check non-overlapping
  const used = new Set<number>();
  for (const [i, j, k] of sets) {
    if (used.has(i) || used.has(j) || used.has(k)) return false;
    used.add(i);
    used.add(j);
    used.add(k);
  }

  // All 15 tuples must be used
  return used.size === 15;
}

/**
 * Main search algorithm.
 * Uses backtracking to find valid configurations.
 *
 * Strategy:
 * 1. Start with 5 non-overlapping valid sets (15 tuples)
 * 2. Check that no additional valid sets exist among the 15
 * 3. Score configs by diversity and keep the best ones
 */
function searchConfigurations(maxConfigs: number = 10, searchLimit: number = 500): {
  tuples: Tuple[];
  sets: [number, number, number][];
  diversityScore: number;
}[] {
  const allTuples = generateAllTuples();
  const configs: { tuples: Tuple[]; sets: [number, number, number][]; diversityScore: number }[] = [];

  // Find all valid sets among all 81 tuples
  // There are C(81,3) = 85320 possible combinations
  // Valid sets: those where sum of each component is 0 mod 3
  console.log('Finding all valid sets among 81 tuples...');
  const allSets: [number, number, number][] = findAllSets(allTuples);
  console.log(`Found ${allSets.length} valid sets`);

  // Now we need to find 5 sets that:
  // 1. Don't share any tuples (non-overlapping)
  // 2. The 15 tuples they use don't form any OTHER valid sets

  function backtrack(
    selectedSets: [number, number, number][],
    usedIndices: Set<number>,
    startIdx: number
  ) {
    // Collect more configs than needed to filter by diversity
    if (configs.length >= searchLimit) return;

    if (selectedSets.length === 5) {
      // We have 5 non-overlapping sets
      // Extract the 15 tuples and verify no other sets exist
      const selected15 = Array.from(usedIndices);
      const subset = selected15.map(i => allTuples[i]);
      const setsInSubset = findAllSets(subset);

      if (setsInSubset.length === 5) {
        // Valid configuration! Calculate diversity score
        const diversityScore = calculateDiversityScore(subset, setsInSubset);
        configs.push({
          tuples: subset,
          sets: setsInSubset,
          diversityScore,
        });
        if (configs.length % 50 === 0) {
          console.log(`Found ${configs.length} configs so far...`);
        }
      }
      return;
    }

    // Try adding more sets
    for (let i = startIdx; i < allSets.length; i++) {
      const [a, b, c] = allSets[i];

      // Skip if any index is already used
      if (usedIndices.has(a) || usedIndices.has(b) || usedIndices.has(c)) {
        continue;
      }

      // Add this set
      selectedSets.push(allSets[i]);
      usedIndices.add(a);
      usedIndices.add(b);
      usedIndices.add(c);

      backtrack(selectedSets, usedIndices, i + 1);

      // Remove this set
      selectedSets.pop();
      usedIndices.delete(a);
      usedIndices.delete(b);
      usedIndices.delete(c);

      if (configs.length >= searchLimit) return;
    }
  }

  console.log(`Searching for up to ${searchLimit} configurations to find the ${maxConfigs} most diverse...`);
  backtrack([], new Set(), 0);

  // Sort by diversity score (highest first) and take top N
  configs.sort((a, b) => b.diversityScore - a.diversityScore);

  console.log(`\nDiversity score range: ${configs[configs.length - 1]?.diversityScore || 0} to ${configs[0]?.diversityScore || 0}`);

  return configs.slice(0, maxConfigs);
}

/**
 * Main entry point
 */
async function main() {
  const numConfigs = parseInt(process.argv[2] || '20', 10);
  const searchLimit = parseInt(process.argv[3] || '500', 10);
  console.log(`Searching for the ${numConfigs} most diverse base configurations (searching up to ${searchLimit})...`);
  console.log('');

  const startTime = Date.now();
  const configs = searchConfigurations(numConfigs, searchLimit);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log(`Selected ${configs.length} most diverse configurations in ${elapsed}s`);

  // Format for storage
  const baseConfigs = configs.map((config, i) => ({
    id: `config-${String.fromCharCode(65 + i)}`, // config-A, config-B, etc.
    tuples: config.tuples,
    sets: config.sets,
  }));

  // Write to lib/baseConfigs.ts
  const output = `/**
 * Pre-computed base configurations for Trio puzzles.
 *
 * Each configuration is a set of 15 tuples in GF(3)^4 that:
 * - Contains exactly 5 valid sets (trios)
 * - Sets don't overlap - each tuple belongs to exactly one set
 * - No other valid sets exist among the 15 tuples
 *
 * These configs are selected for diversity:
 * - All 3 values used for each attribute (all shapes, colors, etc.)
 * - Sets prefer "all different" attributes over "all same"
 *
 * Generated by scripts/findBaseConfigs.ts
 */

import type { Tuple } from '@/types';

export interface BaseConfig {
  id: string;
  tuples: Tuple[];
  sets: [number, number, number][];
}

export const BASE_CONFIGS: BaseConfig[] = ${JSON.stringify(baseConfigs, null, 2)};

export function getBaseConfig(id: string): BaseConfig | undefined {
  return BASE_CONFIGS.find(c => c.id === id);
}

export function getRandomBaseConfig(rng: () => number): BaseConfig {
  const index = Math.floor(rng() * BASE_CONFIGS.length);
  return BASE_CONFIGS[index];
}
`;

  const outputPath = path.join(__dirname, '..', 'src', 'lib', 'baseConfigs.ts');
  fs.writeFileSync(outputPath, output);
  console.log(`Wrote ${configs.length} configurations to ${outputPath}`);

  // Also show a summary with diversity scores
  console.log('');
  console.log('Configuration summary (sorted by diversity):');
  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const baseConfig = baseConfigs[i];

    // Analyze set diversity for display
    let totalAllDiff = 0;
    let totalAllSame = 0;
    for (const [a, b, c] of config.sets) {
      for (let attr = 0; attr < 4; attr++) {
        const values = [config.tuples[a][attr], config.tuples[b][attr], config.tuples[c][attr]];
        const unique = new Set(values).size;
        if (unique === 3) totalAllDiff++;
        else if (unique === 1) totalAllSame++;
      }
    }

    console.log(`  ${baseConfig.id}: score=${config.diversityScore}, all-diff=${totalAllDiff}, all-same=${totalAllSame}`);
  }
}

main().catch(console.error);
