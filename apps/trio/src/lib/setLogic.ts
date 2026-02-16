/**
 * Set (Trio) validation logic using GF(3)^4 math.
 *
 * A valid set (trio) consists of 3 cards where each attribute
 * (shape, color, pattern, count) is either ALL SAME or ALL DIFFERENT
 * across the three cards.
 *
 * Mathematical insight:
 * - Each card is a tuple in GF(3)^4 (4 attributes, each with 3 values: 0, 1, 2)
 * - Three cards form a valid set iff their sum is (0,0,0,0) mod 3
 * - This is equivalent to the "all same or all different" rule
 */

import type { Card, Tuple } from '@/types';

/**
 * Check if three cards form a valid set.
 * For each attribute, the values must be all the same or all different.
 */
export function isValidSet(cards: [Card, Card, Card]): boolean {
  return isValidSetFromTuples([cards[0].tuple, cards[1].tuple, cards[2].tuple]);
}

/**
 * Check if three tuples form a valid set using GF(3)^4 math.
 * Three tuples form a valid set iff their component-wise sum is 0 mod 3.
 */
export function isValidSetFromTuples(tuples: [Tuple, Tuple, Tuple]): boolean {
  for (let i = 0; i < 4; i++) {
    const sum = (tuples[0][i] + tuples[1][i] + tuples[2][i]) % 3;
    if (sum !== 0) {
      return false;
    }
  }
  return true;
}

/**
 * Given a set of tuples, find all valid sets.
 * Returns indices of tuples forming valid sets.
 */
export function findAllValidSets(tuples: Tuple[]): [number, number, number][] {
  const validSets: [number, number, number][] = [];
  const n = tuples.length;

  for (let i = 0; i < n - 2; i++) {
    for (let j = i + 1; j < n - 1; j++) {
      for (let k = j + 1; k < n; k++) {
        if (isValidSetFromTuples([tuples[i], tuples[j], tuples[k]])) {
          validSets.push([i, j, k]);
        }
      }
    }
  }

  return validSets;
}

/**
 * Given two tuples, find the third tuple that completes the set.
 * In GF(3), if a + b + c = 0 (mod 3), then c = -(a + b) = (6 - a - b) mod 3
 */
export function findCompletingTuple(a: Tuple, b: Tuple): Tuple {
  return [
    (6 - a[0] - b[0]) % 3,
    (6 - a[1] - b[1]) % 3,
    (6 - a[2] - b[2]) % 3,
    (6 - a[3] - b[3]) % 3,
  ] as Tuple;
}

/**
 * Generate all possible tuples in GF(3)^4.
 * There are 3^4 = 81 possible tuples.
 */
export function generateAllTuples(): Tuple[] {
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

/**
 * Convert a tuple to a unique integer key (for hashing).
 * Value range: 0 to 80 (3^4 - 1)
 */
export function tupleToKey(tuple: Tuple): number {
  return tuple[0] * 27 + tuple[1] * 9 + tuple[2] * 3 + tuple[3];
}

/**
 * Convert a key back to a tuple.
 */
export function keyToTuple(key: number): Tuple {
  return [
    Math.floor(key / 27) % 3,
    Math.floor(key / 9) % 3,
    Math.floor(key / 3) % 3,
    key % 3,
  ] as Tuple;
}

/**
 * Check if a set of tuples forms exactly N non-overlapping valid sets.
 * This is the key constraint for puzzle generation.
 *
 * @param tuples Array of tuples (e.g., 15 for our game)
 * @param expectedSetCount Number of valid sets expected (e.g., 5)
 * @returns Object with validation result and the sets found
 */
export function validatePuzzleConfiguration(
  tuples: Tuple[],
  expectedSetCount: number
): { valid: boolean; sets: [number, number, number][]; reason?: string } {
  const allSets = findAllValidSets(tuples);

  // Must have exactly the expected number of sets
  if (allSets.length !== expectedSetCount) {
    return {
      valid: false,
      sets: allSets,
      reason: `Found ${allSets.length} sets, expected ${expectedSetCount}`,
    };
  }

  // Check that sets don't overlap (each card belongs to exactly one set)
  const usedIndices = new Set<number>();
  for (const [i, j, k] of allSets) {
    if (usedIndices.has(i) || usedIndices.has(j) || usedIndices.has(k)) {
      return {
        valid: false,
        sets: allSets,
        reason: 'Sets overlap - some cards belong to multiple sets',
      };
    }
    usedIndices.add(i);
    usedIndices.add(j);
    usedIndices.add(k);
  }

  // Check that all tuples are used in exactly one set
  if (usedIndices.size !== tuples.length) {
    return {
      valid: false,
      sets: allSets,
      reason: `Only ${usedIndices.size} of ${tuples.length} cards are used in sets`,
    };
  }

  return { valid: true, sets: allSets };
}

/**
 * Check if an attribute is "all same" across three values.
 */
export function isAllSame(a: number, b: number, c: number): boolean {
  return a === b && b === c;
}

/**
 * Check if an attribute is "all different" across three values.
 */
export function isAllDifferent(a: number, b: number, c: number): boolean {
  return a !== b && b !== c && a !== c;
}

/**
 * Describe why three cards form a valid set (for UI/debugging).
 */
export function describeSet(cards: [Card, Card, Card]): string {
  const attrs = ['shape', 'color', 'pattern', 'count'] as const;
  const descriptions: string[] = [];

  for (const attr of attrs) {
    const values = cards.map(c => attr === 'count' ? c.count : c.tuple[attrs.indexOf(attr)]);
    const [a, b, c] = values;

    if (isAllSame(a, b, c)) {
      descriptions.push(`${attr}: all same`);
    } else if (isAllDifferent(a, b, c)) {
      descriptions.push(`${attr}: all different`);
    } else {
      descriptions.push(`${attr}: INVALID`);
    }
  }

  return descriptions.join(', ');
}
