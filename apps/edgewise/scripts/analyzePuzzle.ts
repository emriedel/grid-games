#!/usr/bin/env npx tsx
/**
 * Analyze a puzzle to understand word-category relationships
 */

import * as fs from 'fs';
import * as path from 'path';
import type { PoolFile, PoolPuzzle } from './types';

interface DerivedCategory {
  name: string;
  words: string[];
}

interface DerivedCategoriesFile {
  categories: DerivedCategory[];
}

const dataDir = path.join(__dirname, '..', 'data');
const puzzlesDir = path.join(__dirname, '..', 'public', 'puzzles');
const poolPath = path.join(puzzlesDir, 'pool.json');
const derivedPath = path.join(dataDir, 'derived-categories.json');

const pool: PoolFile = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));
const derived: DerivedCategoriesFile = JSON.parse(fs.readFileSync(derivedPath, 'utf-8'));

// Build category word sets
const categoryWords = new Map<string, Set<string>>();
for (const cat of derived.categories) {
  categoryWords.set(cat.name, new Set(cat.words.map(w => w.toUpperCase())));
}

// Get puzzle ID from args or use first
const puzzleId = process.argv[2] || pool.puzzles[0]?.id;
const puzzle = pool.puzzles.find(p => p.id === puzzleId);

if (!puzzle) {
  console.error('Puzzle not found:', puzzleId);
  process.exit(1);
}

console.log('=== PUZZLE ANALYSIS ===');
console.log('Puzzle ID:', puzzle.id);
console.log('Categories:');
console.log('  TOP:', puzzle.categories.top);
console.log('  RIGHT:', puzzle.categories.right);
console.log('  BOTTOM:', puzzle.categories.bottom);
console.log('  LEFT:', puzzle.categories.left);
console.log();

const cats = puzzle.categories;

// For each tile, show which categories each word belongs to
for (let i = 0; i < 4; i++) {
  const sq = puzzle.squares[i];
  console.log(`--- Tile ${i} ---`);

  for (const edge of ['top', 'right', 'bottom', 'left'] as const) {
    const word = sq[edge];
    const belongsTo: string[] = [];

    for (const [catPos, catName] of Object.entries(cats)) {
      const words = categoryWords.get(catName);
      if (words && words.has(word)) {
        belongsTo.push(catPos.toUpperCase());
      }
    }

    const marker = belongsTo.length > 1 ? ' ***MULTI***' : '';
    console.log(`  ${edge.padEnd(6)}: ${word.padEnd(10)} -> [${belongsTo.join(', ')}]${marker}`);
  }
  console.log();
}

// Show what each position needs
console.log('=== POSITION REQUIREMENTS ===');
console.log('Pos 0 (top-left):    TOP edge needs TOP category,    LEFT edge needs LEFT category');
console.log('Pos 1 (top-right):   TOP edge needs TOP category,    RIGHT edge needs RIGHT category');
console.log('Pos 2 (bottom-right): BOTTOM edge needs BOTTOM cat,  RIGHT edge needs RIGHT category');
console.log('Pos 3 (bottom-left):  BOTTOM edge needs BOTTOM cat,  LEFT edge needs LEFT category');
console.log();

// For each tile, show valid positions and rotations
console.log('=== VALID PLACEMENTS PER TILE ===');

const edges = ['top', 'right', 'bottom', 'left'] as const;

function getWordAtEdge(sq: typeof puzzle.squares[0], visualEdge: number, rotation: number): string {
  const originalIndex = ((visualEdge - rotation + 4) % 4);
  return sq[edges[originalIndex]];
}

function checkTileAtPosition(sq: typeof puzzle.squares[0], pos: number, rot: number): boolean {
  // Position requirements (which edges need to match which categories)
  const requirements: Record<number, Array<{edge: number, cat: string}>> = {
    0: [{edge: 0, cat: cats.top}, {edge: 3, cat: cats.left}],      // top-left
    1: [{edge: 0, cat: cats.top}, {edge: 1, cat: cats.right}],     // top-right
    2: [{edge: 2, cat: cats.bottom}, {edge: 1, cat: cats.right}],  // bottom-right
    3: [{edge: 2, cat: cats.bottom}, {edge: 3, cat: cats.left}],   // bottom-left
  };

  for (const req of requirements[pos]) {
    const word = getWordAtEdge(sq, req.edge, rot);
    const validWords = categoryWords.get(req.cat);
    if (!validWords || !validWords.has(word)) {
      return false;
    }
  }
  return true;
}

for (let tileIdx = 0; tileIdx < 4; tileIdx++) {
  const sq = puzzle.squares[tileIdx];
  console.log(`Tile ${tileIdx}:`);

  const validPlacements: string[] = [];
  for (let pos = 0; pos < 4; pos++) {
    for (let rot = 0; rot < 4; rot++) {
      if (checkTileAtPosition(sq, pos, rot)) {
        const topWord = getWordAtEdge(sq, 0, rot);
        const rightWord = getWordAtEdge(sq, 1, rot);
        const bottomWord = getWordAtEdge(sq, 2, rot);
        const leftWord = getWordAtEdge(sq, 3, rot);
        validPlacements.push(`  pos=${pos} rot=${rot}: [T:${topWord} R:${rightWord} B:${bottomWord} L:${leftWord}]`);
      }
    }
  }

  if (validPlacements.length === 0) {
    console.log('  NO VALID PLACEMENTS!');
  } else {
    console.log(validPlacements.join('\n'));
  }
  console.log();
}
