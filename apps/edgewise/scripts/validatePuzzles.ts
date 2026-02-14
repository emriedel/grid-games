#!/usr/bin/env npx tsx
/**
 * Validate Puzzles Script for Edgewise
 *
 * This script validates puzzles in pool.json to ensure they have exactly
 * one unique solution. It loads category definitions from derived-categories.json
 * and checks all possible tile configurations.
 *
 * Usage:
 *   npx tsx scripts/validatePuzzles.ts           # Console table output
 *   npx tsx scripts/validatePuzzles.ts --json    # JSON output
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PoolFile, PoolPuzzle, PoolPuzzleSquare } from './types';
import {
  findAllSolutions,
  buildCategorySetFromDerived,
  type SolutionConfig,
  type CategorySet,
} from './validation';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface DerivedCategory {
  name: string;
  words: string[];
  overlapWith?: string[];
}

interface DerivedCategoriesFile {
  description: string;
  generatedAt: string;
  categories: DerivedCategory[];
  goldenOverlapWords?: Array<{ word: string; categories: string[] }>;
}

interface ValidationResult {
  puzzleId: string;
  status: PoolPuzzle['status'];
  solutionCount: number;
  isValid: boolean;
  issue: string;
  solutions?: SolutionConfig[];
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

function validatePuzzle(
  puzzle: PoolPuzzle,
  categoryWords: CategorySet
): ValidationResult {
  const squares = puzzle.squares as [PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare, PoolPuzzleSquare];
  const categories = puzzle.categories;

  // Check if all categories have word sets
  const categoryNames = [categories.top, categories.right, categories.bottom, categories.left];
  const missingCategories = categoryNames.filter(name => !categoryWords[name] || categoryWords[name].size === 0);

  if (missingCategories.length > 0) {
    return {
      puzzleId: puzzle.id,
      status: puzzle.status,
      solutionCount: 0,
      isValid: false,
      issue: `Missing categories: ${missingCategories.join(', ')}`,
    };
  }

  const solutions = findAllSolutions(squares, categories, categoryWords);

  let issue = '-';
  let isValid = true;

  if (solutions.length === 0) {
    issue = 'No valid solution found';
    isValid = false;
  } else if (solutions.length > 1) {
    // Analyze why there are multiple solutions
    if (solutions.length === 24) {
      issue = 'Tile position ambiguity (all permutations work)';
    } else if (solutions.length % 4 === 0) {
      issue = `Rotation ambiguity (${solutions.length} solutions)`;
    } else {
      issue = `Multiple solutions (${solutions.length})`;
    }
    isValid = false;
  }

  return {
    puzzleId: puzzle.id,
    status: puzzle.status,
    solutionCount: solutions.length,
    isValid,
    issue,
    solutions: solutions.length <= 10 ? solutions : undefined,
  };
}

// -----------------------------------------------------------------------------
// Output Formatting
// -----------------------------------------------------------------------------

function formatTable(results: ValidationResult[]): void {
  console.log('\n=== EDGEWISE PUZZLE VALIDATION ===\n');

  // Calculate column widths
  const idWidth = Math.max(10, ...results.map(r => r.puzzleId.length));
  const statusWidth = 8;
  const solWidth = 10;
  const issueWidth = 40;

  // Header
  const header = [
    'Puzzle ID'.padEnd(idWidth),
    'Status'.padEnd(statusWidth),
    'Solutions'.padEnd(solWidth),
    'Issue',
  ].join('  ');

  console.log(header);
  console.log('-'.repeat(idWidth + statusWidth + solWidth + issueWidth + 6));

  // Rows
  for (const result of results) {
    const validMarker = result.isValid ? '\x1b[32m\u2713\x1b[0m' : '\x1b[31m\u2717\x1b[0m';
    const row = [
      result.puzzleId.padEnd(idWidth),
      (result.isValid ? 'VALID' : 'INVALID').padEnd(statusWidth),
      result.solutionCount.toString().padEnd(solWidth),
      result.issue,
    ].join('  ');

    console.log(`${validMarker} ${row}`);
  }

  // Summary
  const validCount = results.filter(r => r.isValid).length;
  const invalidCount = results.length - validCount;

  console.log('\n' + '-'.repeat(idWidth + statusWidth + solWidth + issueWidth + 6));
  console.log(`SUMMARY: ${results.length} puzzles, ${validCount} valid, ${invalidCount} invalid\n`);

  if (invalidCount > 0) {
    console.log('Invalid puzzles need redesign with asymmetric tile structures.');
    console.log('See CLAUDE.md "Puzzle Design Rules for Unique Solutions" section.\n');
  }
}

function formatJson(results: ValidationResult[]): void {
  const output = {
    validatedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      valid: results.filter(r => r.isValid).length,
      invalid: results.filter(r => !r.isValid).length,
    },
    results: results.map(r => ({
      puzzleId: r.puzzleId,
      status: r.status,
      isValid: r.isValid,
      solutionCount: r.solutionCount,
      issue: r.issue,
      solutions: r.solutions,
    })),
  };

  console.log(JSON.stringify(output, null, 2));
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');

  const dataDir = path.join(__dirname, '..', 'data');
  const puzzlesDir = path.join(__dirname, '..', 'public', 'puzzles');
  const poolPath = path.join(puzzlesDir, 'pool.json');
  const derivedPath = path.join(dataDir, 'derived-categories.json');

  // Load pool.json
  if (!fs.existsSync(poolPath)) {
    console.error('No pool.json found at', poolPath);
    process.exit(1);
  }

  const pool: PoolFile = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));

  if (pool.puzzles.length === 0) {
    console.log('No puzzles in pool.json to validate.');
    process.exit(0);
  }

  // Load derived-categories.json
  if (!fs.existsSync(derivedPath)) {
    console.error('No derived-categories.json found at', derivedPath);
    console.error('This file is needed to validate polysemous puzzles.');
    process.exit(1);
  }

  const derivedFile: DerivedCategoriesFile = JSON.parse(fs.readFileSync(derivedPath, 'utf-8'));

  // Build category word sets for all categories used in puzzles
  const allCategoryNames = new Set<string>();
  for (const puzzle of pool.puzzles) {
    allCategoryNames.add(puzzle.categories.top);
    allCategoryNames.add(puzzle.categories.right);
    allCategoryNames.add(puzzle.categories.bottom);
    allCategoryNames.add(puzzle.categories.left);
  }

  const categoryWords = buildCategorySetFromDerived(
    derivedFile.categories,
    Array.from(allCategoryNames)
  );

  // Validate each puzzle
  const results: ValidationResult[] = [];

  for (const puzzle of pool.puzzles) {
    const result = validatePuzzle(puzzle, categoryWords);
    results.push(result);
  }

  // Output results
  if (jsonOutput) {
    formatJson(results);
  } else {
    formatTable(results);
  }

  // Exit with error code if any invalid
  if (results.some(r => !r.isValid)) {
    process.exit(1);
  }
}

main().catch(console.error);
