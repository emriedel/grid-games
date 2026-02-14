#!/usr/bin/env npx tsx
/**
 * Generate Puzzles Script for Edgewise
 *
 * This script generates puzzles algorithmically from the category database:
 * 1. Reads categories from data/categories.json
 * 2. Builds a word index to find overlapping words
 * 3. Selects 4 compatible categories for each puzzle (with variety enforcement)
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
import {
  getPermutations,
  hasUniqueSolution,
} from './validation';

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

// Maximum times a category can be used across all generated puzzles
const MAX_CATEGORY_USES = 2;

// Minimum words required per category
const MIN_WORDS_PER_CATEGORY = 4;

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
// Category Selection with Usage Tracking
// -----------------------------------------------------------------------------

interface CategoryQuad {
  categories: [string, string, string, string]; // [top, right, bottom, left]
  categoryObjects: [Category, Category, Category, Category];
}

function selectNextCategoryQuad(
  categories: Category[],
  index: WordIndex,
  categoryUsage: Map<string, number>,
  usedCombinations: Set<string>
): CategoryQuad | null {
  // Filter to categories that haven't exceeded max usage
  const availableCategories = categories.filter(cat => {
    const usage = categoryUsage.get(cat.name) || 0;
    const words = index.categoryToWords.get(cat.name) || [];
    return usage < MAX_CATEGORY_USES && words.length >= MIN_WORDS_PER_CATEGORY;
  });

  if (availableCategories.length < 4) {
    return null;
  }

  // Sort by usage (prefer less-used categories) with some randomness
  const sortedCategories = [...availableCategories].sort((a, b) => {
    const usageA = categoryUsage.get(a.name) || 0;
    const usageB = categoryUsage.get(b.name) || 0;
    if (usageA !== usageB) return usageA - usageB;
    return Math.random() - 0.5;
  });

  // Try to find a valid combination, prioritizing less-used categories
  const maxAttempts = 500;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    // Pick 4 categories, weighted toward less-used ones
    const selected: Category[] = [];
    const candidates = [...sortedCategories];

    for (let i = 0; i < 4 && candidates.length > 0; i++) {
      // Bias toward front of list (less-used categories)
      // Use exponential distribution to favor lower indices
      const idx = Math.min(
        Math.floor(Math.pow(Math.random(), 1.5) * candidates.length),
        candidates.length - 1
      );
      selected.push(candidates[idx]);
      candidates.splice(idx, 1);
    }

    if (selected.length < 4) continue;

    // Check if this combination has enough unique words
    const allWords = new Set<string>();
    let valid = true;

    for (const cat of selected) {
      const words = index.categoryToWords.get(cat.name) || [];
      words.forEach(w => allWords.add(w));
    }

    if (allWords.size < 16) continue;

    // Create a sorted key to check for duplicate combinations
    const sortedNames = selected.map(c => c.name).sort();
    const comboKey = sortedNames.join('|');
    if (usedCombinations.has(comboKey)) continue;

    // Shuffle position assignment
    const shuffled = [...selected].sort(() => Math.random() - 0.5);
    const catNames = shuffled.map(c => c.name) as [string, string, string, string];

    usedCombinations.add(comboKey);

    return {
      categories: catNames,
      categoryObjects: shuffled as [Category, Category, Category, Category],
    };
  }

  return null;
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
  // Try to use words from the same categories first (for misdirection)
  // But also accept any unused words from any category
  const redHerringCandidates: string[] = [];

  // First, collect unused words from the 4 categories (good for misdirection)
  for (const cat of quad.categoryObjects) {
    for (const word of index.categoryToWords.get(cat.name) || []) {
      if (!usedWords.has(word) && !redHerringCandidates.includes(word)) {
        redHerringCandidates.push(word);
      }
    }
  }

  // If not enough, add words from other categories
  if (redHerringCandidates.length < 8) {
    for (const [word] of index.wordToCategories) {
      if (!usedWords.has(word) && !redHerringCandidates.includes(word)) {
        redHerringCandidates.push(word);
        if (redHerringCandidates.length >= 16) break;
      }
    }
  }

  // Shuffle and take 8
  redHerringCandidates.sort(() => Math.random() - 0.5);

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
  console.log(`\nTarget: generate ${targetCount} new puzzles`);
  console.log(`Max category usage: ${MAX_CATEGORY_USES} per category\n`);

  // Track category usage across this generation run
  const categoryUsage = new Map<string, number>();
  const usedCombinations = new Set<string>();
  const existingIds = new Set(pool.puzzles.map(p => p.id));

  let generated = 0;
  let attempts = 0;
  const maxAttempts = targetCount * 50;

  while (generated < targetCount && attempts < maxAttempts) {
    attempts++;

    // Select next category quad based on usage
    const quad = selectNextCategoryQuad(
      database.categories,
      index,
      categoryUsage,
      usedCombinations
    );

    if (!quad) {
      console.log('No more valid category combinations available');
      break;
    }

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

    // Update category usage
    for (const catName of quad.categories) {
      const current = categoryUsage.get(catName) || 0;
      categoryUsage.set(catName, current + 1);
    }

    console.log(`Generated puzzle ${id}:`);
    console.log(`  Categories: ${quad.categories.join(' | ')}`);
    if (assignment.overlapWords.length > 0) {
      console.log(`  Overlap words: ${assignment.overlapWords.join(', ')}`);
    }
  }

  // Save pool
  fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2));
  console.log(`\nSaved pool.json with ${pool.puzzles.length} total puzzles`);
  console.log(`Generated ${generated} new puzzles`);

  // Show category usage stats
  const usageEntries = [...categoryUsage.entries()].sort((a, b) => b[1] - a[1]);
  console.log(`\nCategory usage (top 10):`);
  for (const [cat, count] of usageEntries.slice(0, 10)) {
    console.log(`  ${cat}: ${count}`);
  }

  if (generated < targetCount) {
    console.log(`\nNote: Only generated ${generated}/${targetCount} puzzles.`);
    console.log(`This may be due to max category usage limits or solution validation failures.`);
    console.log(`Try increasing MAX_CATEGORY_USES or adding more categories.`);
  }
}

main().catch(console.error);
