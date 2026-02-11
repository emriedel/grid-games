#!/usr/bin/env npx tsx
/**
 * Assign Puzzles Script for Edgewise
 *
 * This script migrates puzzles from the legacy puzzles.json format to the
 * pool/assigned architecture used by games with archive support.
 *
 * Usage:
 *   npx tsx scripts/assignPuzzles.ts           # Assign all available puzzles
 *   npx tsx scripts/assignPuzzles.ts 100       # Ensure puzzles 1-100 are assigned
 *
 * The script:
 * 1. Loads existing puzzles from puzzles.json
 * 2. Generates unique IDs for each puzzle
 * 3. Creates monthly assigned files in public/puzzles/assigned/
 * 4. Creates an empty pool.json for future puzzles
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Puzzle base date for Edgewise
const PUZZLE_BASE_DATE_STRING = '2026-01-25';

interface PuzzleSquare {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

interface LegacyPuzzle {
  date: string;
  categories: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  squares: [PuzzleSquare, PuzzleSquare, PuzzleSquare, PuzzleSquare];
}

interface AssignedPuzzle extends LegacyPuzzle {
  id: string;
}

interface MonthlyAssignedFile {
  gameId: string;
  baseDate: string;
  puzzles: Record<string, AssignedPuzzle>;
}

interface PoolFile {
  gameId: string;
  puzzles: AssignedPuzzle[];
}

function getMonthForPuzzleNumber(puzzleNumber: number): string {
  const baseDate = new Date(PUZZLE_BASE_DATE_STRING + 'T00:00:00');
  const puzzleDate = new Date(baseDate.getTime() + (puzzleNumber - 1) * 24 * 60 * 60 * 1000);
  const year = puzzleDate.getFullYear();
  const month = String(puzzleDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getDateForPuzzleNumber(puzzleNumber: number): string {
  const baseDate = new Date(PUZZLE_BASE_DATE_STRING + 'T00:00:00');
  const puzzleDate = new Date(baseDate.getTime() + (puzzleNumber - 1) * 24 * 60 * 60 * 1000);
  return puzzleDate.toISOString().split('T')[0];
}

function getPuzzleNumberForDate(dateString: string): number {
  const baseDate = new Date(PUZZLE_BASE_DATE_STRING + 'T00:00:00');
  const targetDate = new Date(dateString + 'T00:00:00');
  const diffTime = targetDate.getTime() - baseDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

function generatePuzzleId(puzzle: LegacyPuzzle): string {
  // Generate a short hash based on puzzle content
  const content = JSON.stringify({
    categories: puzzle.categories,
    squares: puzzle.squares,
  });
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return hash.slice(0, 8);
}

function createMonthlyFile(month: string): MonthlyAssignedFile {
  const [year, monthNum] = month.split('-');
  return {
    gameId: 'edgewise',
    baseDate: `${year}-${monthNum}-01`,
    puzzles: {},
  };
}

function saveMonthlyFile(
  assignedDir: string,
  month: string,
  monthlyFile: MonthlyAssignedFile
): void {
  const filePath = path.join(assignedDir, `${month}.json`);
  fs.writeFileSync(filePath, JSON.stringify(monthlyFile, null, 2));
  console.log(`  Saved ${filePath}`);
}

async function main() {
  const puzzlesDir = path.join(__dirname, '..', 'public', 'puzzles');
  const assignedDir = path.join(puzzlesDir, 'assigned');
  const legacyPath = path.join(puzzlesDir, 'puzzles.json');
  const poolPath = path.join(puzzlesDir, 'pool.json');

  // Ensure directories exist
  if (!fs.existsSync(assignedDir)) {
    fs.mkdirSync(assignedDir, { recursive: true });
  }

  // Load legacy puzzles
  if (!fs.existsSync(legacyPath)) {
    console.error('No puzzles.json found at', legacyPath);
    process.exit(1);
  }

  const legacyData = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
  const legacyPuzzles: LegacyPuzzle[] = legacyData.puzzles;

  console.log(`Found ${legacyPuzzles.length} puzzles in puzzles.json`);

  // Load existing monthly files
  const monthlyFiles = new Map<string, MonthlyAssignedFile>();
  const assignedNumbers = new Set<number>();

  if (fs.existsSync(assignedDir)) {
    const existingFiles = fs.readdirSync(assignedDir).filter(f => f.endsWith('.json'));
    for (const file of existingFiles) {
      const month = file.replace('.json', '');
      const filePath = path.join(assignedDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as MonthlyAssignedFile;
      monthlyFiles.set(month, data);
      // Track already assigned puzzle numbers
      for (const numStr of Object.keys(data.puzzles)) {
        assignedNumbers.add(parseInt(numStr, 10));
      }
    }
    console.log(`Found ${assignedNumbers.size} already assigned puzzles`);
  }

  // Get target count from command line or use all available
  const targetCount = process.argv[2] ? parseInt(process.argv[2], 10) : legacyPuzzles.length;
  console.log(`Target: assign puzzles 1-${targetCount}`);

  // Convert legacy puzzles to assigned format, keyed by puzzle number
  const monthsModified = new Set<string>();
  let assignedCount = 0;

  for (const puzzle of legacyPuzzles) {
    const puzzleNumber = getPuzzleNumberForDate(puzzle.date);

    if (puzzleNumber < 1 || puzzleNumber > targetCount) {
      console.log(`  Skipping puzzle for ${puzzle.date} (puzzle #${puzzleNumber} outside range)`);
      continue;
    }

    if (assignedNumbers.has(puzzleNumber)) {
      console.log(`  Puzzle #${puzzleNumber} already assigned, skipping`);
      continue;
    }

    const month = getMonthForPuzzleNumber(puzzleNumber);

    // Get or create monthly file
    if (!monthlyFiles.has(month)) {
      monthlyFiles.set(month, createMonthlyFile(month));
    }

    const monthlyFile = monthlyFiles.get(month)!;

    // Add ID to puzzle
    const assignedPuzzle: AssignedPuzzle = {
      ...puzzle,
      id: generatePuzzleId(puzzle),
    };

    monthlyFile.puzzles[String(puzzleNumber)] = assignedPuzzle;
    monthsModified.add(month);
    assignedNumbers.add(puzzleNumber);
    assignedCount++;

    console.log(`  Assigned #${puzzleNumber} (${puzzle.date}) → ${assignedPuzzle.id} [${month}]`);
  }

  // Save modified monthly files
  console.log(`\nSaving ${monthsModified.size} monthly files...`);
  for (const month of monthsModified) {
    const monthlyFile = monthlyFiles.get(month)!;
    saveMonthlyFile(assignedDir, month, monthlyFile);
  }

  // Create empty pool.json if it doesn't exist
  if (!fs.existsSync(poolPath)) {
    const pool: PoolFile = {
      gameId: 'edgewise',
      puzzles: [],
    };
    fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2));
    console.log(`Created empty pool.json`);
  }

  console.log(`\nDone! Assigned ${assignedCount} puzzles.`);
  console.log(`Total assigned: ${assignedNumbers.size}`);
}

main().catch(console.error);
