#!/usr/bin/env npx tsx
/**
 * Generate Puzzles Script for Edgewise
 *
 * This script generates puzzles algorithmically from the category database:
 * 1. Reads categories from data/categories.json
 * 2. Builds a word index to find overlapping words
 * 3. Selects 4 compatible categories for each puzzle
 * 4. Assigns words to tiles ensuring unique solution
 * 5. Validates puzzles have exactly one solution
 * 6. Outputs to pool.json with pending status
 *
 * Usage:
 *   npx tsx scripts/generatePuzzles.ts           # Generate 10 puzzles (default)
 *   npx tsx scripts/generatePuzzles.ts 50        # Generate 50 puzzles
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type {
  CategoryDatabase,
  Category,
  CategoryType,
  PoolFile,
  PoolPuzzle,
  PoolPuzzleSquare,
  WordIndex,
} from './types';

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const CATEGORY_POSITIONS = ['top', 'right', 'bottom', 'left'] as const;

// Which edges of each square face outward (toward categories) vs inward (red herrings)
// In solved position:
// - Square 0 (top-left): top & left face categories, right & bottom face center
// - Square 1 (top-right): top & right face categories, left & bottom face center
// - Square 2 (bottom-right): bottom & right face categories, top & left face center
// - Square 3 (bottom-left): bottom & left face categories, top & right face center
const OUTWARD_EDGES: Record<number, [string, string]> = {
  0: ['top', 'left'],
  1: ['top', 'right'],
  2: ['bottom', 'right'],
  3: ['bottom', 'left'],
};

const INWARD_EDGES: Record<number, [string, string]> = {
  0: ['right', 'bottom'],
  1: ['left', 'bottom'],
  2: ['top', 'left'],
  3: ['top', 'right'],
};

// Category to edge mapping (which squares contribute to each category)
// TOP: Square 0 top + Square 1 top
// RIGHT: Square 1 right + Square 2 right
// BOTTOM: Square 2 bottom + Square 3 bottom
// LEFT: Square 3 left + Square 0 left
const CATEGORY_EDGE_MAP: Record<string, Array<{ square: number; edge: string }>> = {
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

// -----------------------------------------------------------------------------
// Word Index Building
// -----------------------------------------------------------------------------

function buildWordIndex(categories: Category[]): WordIndex {
  const wordToCategories = new Map<string, string[]>();
  const categoryToWords = new Map<string, string[]>();

  for (const category of categories) {
    const normalizedWords = category.words.map(w => w.toUpperCase());
    categoryToWords.set(category.name, normalizedWords);

    for (const word of normalizedWords) {
      const existing = wordToCategories.get(word) || [];
      existing.push(category.name);
      wordToCategories.set(word, existing);
    }
  }

  return { wordToCategories, categoryToWords };
}

function getMultiCategoryWords(index: WordIndex): string[] {
  const result: string[] = [];
  for (const [word, categories] of index.wordToCategories) {
    if (categories.length > 1) {
      result.push(word);
    }
  }
  return result;
}

// -----------------------------------------------------------------------------
// Category Selection
// -----------------------------------------------------------------------------

interface CategoryQuad {
  categories: [string, string, string, string]; // [top, right, bottom, left]
  categoryObjects: [Category, Category, Category, Category];
}

function findCategoryQuads(
  categories: Category[],
  index: WordIndex,
  maxQuads: number
): CategoryQuad[] {
  const quads: CategoryQuad[] = [];
  const usedCombinations = new Set<string>();

  // Shuffle categories for variety
  const shuffled = [...categories].sort(() => Math.random() - 0.5);

  // Try to find valid category combinations
  for (let i = 0; i < shuffled.length && quads.length < maxQuads * 10; i++) {
    for (let j = i + 1; j < shuffled.length; j++) {
      for (let k = j + 1; k < shuffled.length; k++) {
        for (let l = k + 1; l < shuffled.length; l++) {
          const fourCats = [shuffled[i], shuffled[j], shuffled[k], shuffled[l]];

          // Check if this combination has enough unique words
          const allWords = new Set<string>();
          let valid = true;

          for (const cat of fourCats) {
            const words = index.categoryToWords.get(cat.name) || [];
            if (words.length < 4) {
              valid = false;
              break;
            }
            words.forEach(w => allWords.add(w));
          }

          if (!valid || allWords.size < 16) continue;

          // Try different position assignments
          const permutations = getPermutations([0, 1, 2, 3]);
          for (const perm of permutations) {
            const catNames = perm.map(idx => fourCats[idx].name);
            const key = catNames.join('|');

            if (usedCombinations.has(key)) continue;
            usedCombinations.add(key);

            quads.push({
              categories: catNames as [string, string, string, string],
              categoryObjects: perm.map(idx => fourCats[idx]) as [Category, Category, Category, Category],
            });

            if (quads.length >= maxQuads * 10) break;
          }
          if (quads.length >= maxQuads * 10) break;
        }
        if (quads.length >= maxQuads * 10) break;
      }
      if (quads.length >= maxQuads * 10) break;
    }
  }

  // Shuffle and return
  return quads.sort(() => Math.random() - 0.5).slice(0, maxQuads);
}

function getPermutations<T>(arr: T[]): T[][] {
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

// -----------------------------------------------------------------------------
// Puzzle Generation
// -----------------------------------------------------------------------------

interface WordAssignment {
  squares: [PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare];
  overlapWords: string[];
}

function generateWordAssignment(
  quad: CategoryQuad,
  index: WordIndex
): WordAssignment | null {
  const [topCat, rightCat, bottomCat, leftCat] = quad.categories;

  // Get words for each category
  const topWords = [...(index.categoryToWords.get(topCat) || [])];
  const rightWords = [...(index.categoryToWords.get(rightCat) || [])];
  const bottomWords = [...(index.categoryToWords.get(bottomCat) || [])];
  const leftWords = [...(index.categoryToWords.get(leftCat) || [])];

  // Shuffle each category's words
  topWords.sort(() => Math.random() - 0.5);
  rightWords.sort(() => Math.random() - 0.5);
  bottomWords.sort(() => Math.random() - 0.5);
  leftWords.sort(() => Math.random() - 0.5);

  // Track used words to avoid duplicates
  const usedWords = new Set<string>();
  const overlapWords: string[] = [];

  // Pick 2 words for each category
  function pickWords(words: string[], count: number): string[] | null {
    const picked: string[] = [];
    for (const word of words) {
      if (picked.length >= count) break;
      if (!usedWords.has(word)) {
        picked.push(word);
        usedWords.add(word);

        // Track if this word belongs to multiple categories
        const cats = index.wordToCategories.get(word) || [];
        if (cats.length > 1) {
          overlapWords.push(word);
        }
      }
    }
    return picked.length === count ? picked : null;
  }

  const topPicked = pickWords(topWords, 2);
  if (!topPicked) return null;

  const rightPicked = pickWords(rightWords, 2);
  if (!rightPicked) return null;

  const bottomPicked = pickWords(bottomWords, 2);
  if (!bottomPicked) return null;

  const leftPicked = pickWords(leftWords, 2);
  if (!leftPicked) return null;

  // Now we need 8 red herring words (center-facing edges)
  // Prefer words that overlap with categories (for misdirection) but aren't the picked words
  const allCategoryWords = new Set<string>();
  for (const cat of quad.categoryObjects) {
    for (const word of index.categoryToWords.get(cat.name) || []) {
      if (!usedWords.has(word)) {
        allCategoryWords.add(word);
      }
    }
  }

  // Get remaining words from all categories for red herrings
  const redHerringCandidates = [...allCategoryWords].sort(() => Math.random() - 0.5);

  // If not enough red herring candidates, this combination won't work
  if (redHerringCandidates.length < 8) return null;

  const redHerrings = redHerringCandidates.slice(0, 8);
  redHerrings.forEach(w => usedWords.add(w));

  // Assign words to squares
  // Square 0: top=topPicked[0], left=leftPicked[1], right=redHerrings[0], bottom=redHerrings[1]
  // Square 1: top=topPicked[1], right=rightPicked[0], left=redHerrings[2], bottom=redHerrings[3]
  // Square 2: bottom=bottomPicked[0], right=rightPicked[1], top=redHerrings[4], left=redHerrings[5]
  // Square 3: bottom=bottomPicked[1], left=leftPicked[0], top=redHerrings[6], right=redHerrings[7]

  const squares: [PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare] = [
    {
      top: topPicked[0],
      right: redHerrings[0],
      bottom: redHerrings[1],
      left: leftPicked[1],
    },
    {
      top: topPicked[1],
      right: rightPicked[0],
      bottom: redHerrings[3],
      left: redHerrings[2],
    },
    {
      top: redHerrings[4],
      right: rightPicked[1],
      bottom: bottomPicked[0],
      left: redHerrings[5],
    },
    {
      top: redHerrings[6],
      right: redHerrings[7],
      bottom: bottomPicked[1],
      left: leftPicked[0],
    },
  ];

  return { squares, overlapWords };
}

// -----------------------------------------------------------------------------
// Solution Validation
// -----------------------------------------------------------------------------

type Rotation = 0 | 1 | 2 | 3;

function getWordAtEdge(
  square: PoolPuzzleSquare,
  visualEdge: number,
  rotation: Rotation
): string {
  // Convert rotation-adjusted edge back to original
  const edges = ['top', 'right', 'bottom', 'left'] as const;
  const originalIndex = ((visualEdge - rotation + 4) % 4) as 0 | 1 | 2 | 3;
  return square[edges[originalIndex]];
}

function checkSolution(
  squares: [PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare],
  categories: { top: string; right: string; bottom: string; left: string },
  positions: number[], // Which square is in which position
  rotations: Rotation[],
  index: WordIndex
): boolean {
  // Check each category
  for (const [catPosition, catName] of Object.entries(categories)) {
    const edges = CATEGORY_EDGE_MAP[catPosition];
    const words: string[] = [];

    for (const { square: squarePos, edge } of edges) {
      // Find which original square is at this position
      const originalSquareIdx = positions.indexOf(squarePos);
      if (originalSquareIdx === -1) return false;

      const square = squares[originalSquareIdx];
      const rotation = rotations[originalSquareIdx];
      const edgeIndex = ['top', 'right', 'bottom', 'left'].indexOf(edge);
      words.push(getWordAtEdge(square, edgeIndex, rotation));
    }

    // Check if both words belong to this category
    const categoryWords = index.categoryToWords.get(catName) || [];
    for (const word of words) {
      if (!categoryWords.includes(word)) {
        return false;
      }
    }
  }

  return true;
}

function hasUniqueSolution(
  squares: [PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare],
  categories: { top: string; right: string; bottom: string; left: string },
  index: WordIndex
): boolean {
  let solutionCount = 0;

  // Generate all position permutations (4! = 24)
  const positionPerms = getPermutations([0, 1, 2, 3]);

  // Generate all rotation combinations (4^4 = 256)
  const rotationCombos: Rotation[][] = [];
  for (let r0 = 0; r0 < 4; r0++) {
    for (let r1 = 0; r1 < 4; r1++) {
      for (let r2 = 0; r2 < 4; r2++) {
        for (let r3 = 0; r3 < 4; r3++) {
          rotationCombos.push([r0, r1, r2, r3] as Rotation[]);
        }
      }
    }
  }

  // Check all 24 * 256 = 6144 configurations
  for (const positions of positionPerms) {
    for (const rotations of rotationCombos) {
      if (checkSolution(squares, categories, positions, rotations, index)) {
        solutionCount++;
        if (solutionCount > 1) {
          return false;
        }
      }
    }
  }

  return solutionCount === 1;
}

// -----------------------------------------------------------------------------
// Puzzle ID Generation
// -----------------------------------------------------------------------------

function generatePuzzleId(puzzle: Omit<PoolPuzzle, 'id' | 'status'>): string {
  const content = JSON.stringify({
    categories: puzzle.categories,
    squares: puzzle.squares,
  });
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return hash.slice(0, 8);
}

// -----------------------------------------------------------------------------
// Main Script
// -----------------------------------------------------------------------------

async function main() {
  const dataDir = path.join(__dirname, '..', 'data');
  const puzzlesDir = path.join(__dirname, '..', 'public', 'puzzles');
  const categoriesPath = path.join(dataDir, 'categories.json');
  const poolPath = path.join(puzzlesDir, 'pool.json');

  // Load category database
  if (!fs.existsSync(categoriesPath)) {
    console.error('No categories.json found at', categoriesPath);
    console.error('Please generate categories first.');
    process.exit(1);
  }

  const database: CategoryDatabase = JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  console.log(`Loaded ${database.categories.length} categories`);

  if (database.categories.length < 4) {
    console.error('Need at least 4 categories to generate puzzles');
    process.exit(1);
  }

  // Build word index
  const index = buildWordIndex(database.categories);
  console.log(`Built word index with ${index.wordToCategories.size} unique words`);

  const multiCatWords = getMultiCategoryWords(index);
  console.log(`Found ${multiCatWords.length} words that appear in multiple categories`);

  // Load existing pool
  let pool: PoolFile = {
    gameId: 'edgewise',
    puzzles: [],
  };

  if (fs.existsSync(poolPath)) {
    pool = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));
    console.log(`Loaded existing pool with ${pool.puzzles.length} puzzles`);
  }

  // Get count from command line
  const targetCount = process.argv[2] ? parseInt(process.argv[2], 10) : 10;
  console.log(`\nTarget: generate ${targetCount} new puzzles\n`);

  // Find category combinations
  const quads = findCategoryQuads(database.categories, index, targetCount * 5);
  console.log(`Found ${quads.length} potential category combinations`);

  // Generate puzzles
  let generated = 0;
  const existingIds = new Set(pool.puzzles.map(p => p.id));

  for (const quad of quads) {
    if (generated >= targetCount) break;

    const assignment = generateWordAssignment(quad, index);
    if (!assignment) {
      continue;
    }

    const categories = {
      top: quad.categories[0],
      right: quad.categories[1],
      bottom: quad.categories[2],
      left: quad.categories[3],
    };

    // Validate unique solution
    if (!hasUniqueSolution(assignment.squares, categories, index)) {
      console.log(`  Skipping: no unique solution for [${quad.categories.join(', ')}]`);
      continue;
    }

    // Create puzzle
    const puzzleData = {
      categories,
      squares: assignment.squares,
      metadata: {
        categoryTypes: quad.categoryObjects.map(c => c.type) as CategoryType[],
        overlapWords: assignment.overlapWords,
        generatedAt: new Date().toISOString(),
      },
    };

    const id = generatePuzzleId(puzzleData);

    // Skip if already exists
    if (existingIds.has(id)) {
      console.log(`  Skipping: puzzle ${id} already exists`);
      continue;
    }

    const puzzle: PoolPuzzle = {
      id,
      status: 'pending',
      ...puzzleData,
    };

    pool.puzzles.push(puzzle);
    existingIds.add(id);
    generated++;

    console.log(`Generated puzzle ${id}:`);
    console.log(`  Categories: ${quad.categories.join(' | ')}`);
    console.log(`  Overlap words: ${assignment.overlapWords.length > 0 ? assignment.overlapWords.join(', ') : 'none'}`);
  }

  // Save pool
  fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2));
  console.log(`\nSaved pool.json with ${pool.puzzles.length} total puzzles`);
  console.log(`Generated ${generated} new puzzles`);

  if (generated < targetCount) {
    console.log(`\nWarning: Only generated ${generated}/${targetCount} puzzles.`);
    console.log('Try adding more categories to the database.');
  }
}

main().catch(console.error);
