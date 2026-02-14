/**
 * Shared validation functions for Edgewise puzzles
 *
 * These functions validate that puzzles have exactly one unique solution
 * by checking all possible tile position and rotation combinations.
 */

import type { PoolPuzzleSquare, WordIndex } from './types';

// Category to edge mapping (which squares contribute to each category)
export const CATEGORY_EDGE_MAP: Record<string, Array<{ square: number; edge: string }>> = {
  top: [
    { square: 0, edge: 'top' },
    { square: 1, edge: 'top' },
  ],
  right: [
    { square: 1, edge: 'right' },
    { square: 2, edge: 'right' },
  ],
  bottom: [
    { square: 2, edge: 'bottom' },
    { square: 3, edge: 'bottom' },
  ],
  left: [
    { square: 3, edge: 'left' },
    { square: 0, edge: 'left' },
  ],
};

export type Rotation = 0 | 1 | 2 | 3;

export interface SolutionConfig {
  positions: number[];
  rotations: Rotation[];
}

export interface CategorySet {
  [categoryPosition: string]: Set<string>;
}

/**
 * Get the word at a visual edge after applying rotation
 * @param square The puzzle square
 * @param visualEdge The edge index after rotation (0=top, 1=right, 2=bottom, 3=left)
 * @param rotation The rotation applied (0-3, each increment = 90° clockwise)
 */
export function getWordAtEdge(
  square: PoolPuzzleSquare,
  visualEdge: number,
  rotation: Rotation
): string {
  const edges = ['top', 'right', 'bottom', 'left'] as const;
  const originalIndex = ((visualEdge - rotation + 4) % 4) as 0 | 1 | 2 | 3;
  return square[edges[originalIndex]];
}

/**
 * Generate all permutations of an array
 */
export function getPermutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    const perms = getPermutations(rest);
    for (const perm of perms) {
      result.push([arr[i], ...perm]);
    }
  }
  return result;
}

/**
 * Check if a specific configuration solves the puzzle
 * @param squares The 4 puzzle squares
 * @param categories Category names keyed by position (top, right, bottom, left)
 * @param positions Array mapping original square index to grid position [0,1,2,3]
 * @param rotations Array of rotations for each original square
 * @param categoryWords Maps category name to set of valid words
 */
export function checkSolution(
  squares: [PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare],
  categories: { top: string; right: string; bottom: string; left: string },
  positions: number[],
  rotations: Rotation[],
  categoryWords: CategorySet
): boolean {
  for (const [catPosition, catName] of Object.entries(categories)) {
    const edges = CATEGORY_EDGE_MAP[catPosition];
    const words: string[] = [];

    for (const { square: squarePos, edge } of edges) {
      // Find which original square is at this grid position
      const originalSquareIdx = positions.indexOf(squarePos);
      if (originalSquareIdx === -1) return false;

      const square = squares[originalSquareIdx];
      const rotation = rotations[originalSquareIdx];
      const edgeIndex = ['top', 'right', 'bottom', 'left'].indexOf(edge);
      words.push(getWordAtEdge(square, edgeIndex, rotation));
    }

    const validWords = categoryWords[catName];
    if (!validWords) return false;

    for (const word of words) {
      if (!validWords.has(word)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Check if a solution is valid using a WordIndex (for generatePuzzles.ts compatibility)
 */
export function checkSolutionWithIndex(
  squares: [PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare],
  categories: { top: string; right: string; bottom: string; left: string },
  positions: number[],
  rotations: Rotation[],
  index: WordIndex
): boolean {
  for (const [catPosition, catName] of Object.entries(categories)) {
    const edges = CATEGORY_EDGE_MAP[catPosition];
    const words: string[] = [];

    for (const { square: squarePos, edge } of edges) {
      const originalSquareIdx = positions.indexOf(squarePos);
      if (originalSquareIdx === -1) return false;

      const square = squares[originalSquareIdx];
      const rotation = rotations[originalSquareIdx];
      const edgeIndex = ['top', 'right', 'bottom', 'left'].indexOf(edge);
      words.push(getWordAtEdge(square, edgeIndex, rotation));
    }

    const categoryWordsArr = index.categoryToWords.get(catName) || [];
    for (const word of words) {
      if (!categoryWordsArr.includes(word)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Generate all rotation combinations for 4 squares
 */
export function getAllRotationCombos(): Rotation[][] {
  const combos: Rotation[][] = [];
  for (let r0 = 0; r0 < 4; r0++) {
    for (let r1 = 0; r1 < 4; r1++) {
      for (let r2 = 0; r2 < 4; r2++) {
        for (let r3 = 0; r3 < 4; r3++) {
          combos.push([r0, r1, r2, r3] as Rotation[]);
        }
      }
    }
  }
  return combos;
}

/**
 * Find all valid solutions for a puzzle
 * @returns Array of all valid solution configurations
 */
export function findAllSolutions(
  squares: [PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare],
  categories: { top: string; right: string; bottom: string; left: string },
  categoryWords: CategorySet
): SolutionConfig[] {
  const solutions: SolutionConfig[] = [];
  const positionPerms = getPermutations([0, 1, 2, 3]);
  const rotationCombos = getAllRotationCombos();

  for (const positions of positionPerms) {
    for (const rotations of rotationCombos) {
      if (checkSolution(squares, categories, positions, rotations, categoryWords)) {
        solutions.push({ positions, rotations });
      }
    }
  }

  return solutions;
}

/**
 * Check if a puzzle has exactly one unique solution
 * Uses WordIndex for compatibility with generatePuzzles.ts
 */
export function hasUniqueSolution(
  squares: [PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare],
  categories: { top: string; right: string; bottom: string; left: string },
  index: WordIndex
): boolean {
  let solutionCount = 0;
  const positionPerms = getPermutations([0, 1, 2, 3]);
  const rotationCombos = getAllRotationCombos();

  for (const positions of positionPerms) {
    for (const rotations of rotationCombos) {
      if (checkSolutionWithIndex(squares, categories, positions, rotations, index)) {
        solutionCount++;
        if (solutionCount > 1) {
          return false;
        }
      }
    }
  }

  return solutionCount === 1;
}

/**
 * Count total solutions for a puzzle
 */
export function countSolutions(
  squares: [PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare],
  categories: { top: string; right: string; bottom: string; left: string },
  categoryWords: CategorySet
): number {
  return findAllSolutions(squares, categories, categoryWords).length;
}

/**
 * Build a CategorySet from derived-categories.json format
 */
export function buildCategorySetFromDerived(
  derivedCategories: Array<{ name: string; words: string[] }>,
  categoryNames: string[]
): CategorySet {
  const result: CategorySet = {};

  for (const catName of categoryNames) {
    const category = derivedCategories.find(c => c.name === catName);
    if (category) {
      result[catName] = new Set(category.words.map(w => w.toUpperCase()));
    }
  }

  return result;
}

/**
 * Build a CategorySet from a puzzle's squares (for standalone validation)
 * This extracts all words from the puzzle and groups by category position
 */
export function buildCategorySetFromPuzzle(
  squares: [PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare],
  categories: { top: string; right: string; bottom: string; left: string },
  derivedCategories: Array<{ name: string; words: string[] }>
): CategorySet {
  const categoryNames = [categories.top, categories.right, categories.bottom, categories.left];
  return buildCategorySetFromDerived(derivedCategories, categoryNames);
}
