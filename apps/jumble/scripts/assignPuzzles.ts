/**
 * Jumble Puzzle Assignment Script
 *
 * Assigns puzzles from pool.json to monthly assigned files.
 * Puzzles are MOVED from pool to assigned (full data, not just ID).
 *
 * Architecture:
 *   pool.json              - Contains only UNASSIGNED puzzles
 *   assigned/{YYYY-MM}.json - Contains FULL puzzle data for that month
 *
 * Usage:
 *   npx tsx scripts/assignPuzzles.ts [count]
 *
 * Examples:
 *   npx tsx scripts/assignPuzzles.ts           # Assign puzzles up to today
 *   npx tsx scripts/assignPuzzles.ts 100       # Ensure at least 100 puzzles assigned
 */

import * as fs from 'fs';
import * as path from 'path';
import type { JumblePoolPuzzle } from './generatePool';

interface PoolFile {
  generatedAt: string;
  puzzles: JumblePoolPuzzle[];
}

interface MonthlyAssignedFile {
  gameId: string;
  baseDate: string;
  puzzles: Record<string, JumblePoolPuzzle>; // Key: puzzle number (string), Value: full puzzle data
}

// Must match the base date in storage.ts and config.ts
const BASE_DATE = '2026-02-01';
const GAME_ID = 'jumble';

function getTodayPuzzleNumber(): number {
  const baseDate = new Date(BASE_DATE + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - baseDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

/**
 * Get the month key (YYYY-MM) for a puzzle number.
 * Puzzle 1 = BASE_DATE (2026-01-01), so puzzle 1 is in 2026-01.
 */
function getMonthForPuzzleNumber(puzzleNumber: number): string {
  const baseDate = new Date(BASE_DATE + 'T00:00:00');
  const puzzleDate = new Date(baseDate.getTime() + (puzzleNumber - 1) * 24 * 60 * 60 * 1000);
  const year = puzzleDate.getFullYear();
  const month = String(puzzleDate.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Get the date string (YYYY-MM-DD) for a puzzle number.
 */
function getDateForPuzzleNumber(puzzleNumber: number): string {
  const baseDate = new Date(BASE_DATE + 'T00:00:00');
  const puzzleDate = new Date(baseDate.getTime() + (puzzleNumber - 1) * 24 * 60 * 60 * 1000);
  return puzzleDate.toISOString().split('T')[0];
}

/**
 * Load a monthly assigned file, or return null if it doesn't exist.
 */
function loadMonthlyFile(assignedDir: string, month: string): MonthlyAssignedFile | null {
  const filePath = path.join(assignedDir, `${month}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * Create an empty monthly assigned file structure.
 */
function createMonthlyFile(month: string): MonthlyAssignedFile {
  // Get the first day of the month from the month string
  const baseDate = `${month}-01`;
  return {
    gameId: GAME_ID,
    baseDate,
    puzzles: {},
  };
}

/**
 * Save a monthly assigned file.
 */
function saveMonthlyFile(assignedDir: string, month: string, file: MonthlyAssignedFile): void {
  const filePath = path.join(assignedDir, `${month}.json`);
  fs.writeFileSync(filePath, JSON.stringify(file, null, 2));
}

async function main() {
  const countArg = process.argv[2];
  const todayNumber = getTodayPuzzleNumber();
  const targetCount = countArg ? parseInt(countArg, 10) : todayNumber;

  console.log(`\nJumble Puzzle Assignment`);
  console.log(`========================\n`);
  console.log(`Base date: ${BASE_DATE}`);
  console.log(`Today's puzzle number: ${todayNumber}`);
  console.log(`Target assignment count: ${targetCount}\n`);

  const puzzlesDir = path.join(__dirname, '../public/puzzles');
  const assignedDir = path.join(puzzlesDir, 'assigned');

  // Ensure assigned directory exists
  if (!fs.existsSync(assignedDir)) {
    fs.mkdirSync(assignedDir, { recursive: true });
    console.log(`Created directory: ${assignedDir}\n`);
  }

  // Load pool
  const poolPath = path.join(puzzlesDir, 'pool.json');
  if (!fs.existsSync(poolPath)) {
    console.error('Error: pool.json not found. Run generatePool.ts first.');
    process.exit(1);
  }

  const pool: PoolFile = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));
  const originalPoolCount = pool.puzzles.length;
  console.log(`Pool has ${pool.puzzles.length} puzzles available\n`);

  // Load all existing monthly files and build set of already-assigned puzzle numbers
  const monthlyFiles: Map<string, MonthlyAssignedFile> = new Map();
  const assignedNumbers = new Set<number>();

  // Scan for existing monthly files
  if (fs.existsSync(assignedDir)) {
    const files = fs.readdirSync(assignedDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const month = file.replace('.json', '');
      const monthlyFile = loadMonthlyFile(assignedDir, month);
      if (monthlyFile) {
        monthlyFiles.set(month, monthlyFile);
        for (const numStr of Object.keys(monthlyFile.puzzles)) {
          assignedNumbers.add(parseInt(numStr, 10));
        }
      }
    }
    console.log(`Found ${monthlyFiles.size} existing monthly files`);
    console.log(`Already assigned: ${assignedNumbers.size} puzzles\n`);
  }

  // Build set of already-assigned puzzle IDs (to ensure we don't re-assign from pool)
  const assignedIds = new Set<string>();
  for (const monthlyFile of monthlyFiles.values()) {
    for (const puzzle of Object.values(monthlyFile.puzzles)) {
      assignedIds.add(puzzle.id);
    }
  }

  // Get available puzzles from pool (not yet assigned)
  const availablePuzzles = pool.puzzles.filter(p => !assignedIds.has(p.id));
  console.log(`Available (unassigned) puzzles in pool: ${availablePuzzles.length}\n`);

  // Assign puzzles to missing numbers
  let newAssignments = 0;
  let availableIndex = 0;
  const monthsModified = new Set<string>();

  for (let num = 1; num <= targetCount; num++) {
    if (assignedNumbers.has(num)) {
      continue; // Already assigned
    }

    if (availableIndex >= availablePuzzles.length) {
      console.warn(`Warning: Ran out of available puzzles at #${num}`);
      console.warn(`Generate more puzzles with: npx tsx scripts/generatePool.ts`);
      break;
    }

    const puzzle = availablePuzzles[availableIndex++];
    const month = getMonthForPuzzleNumber(num);
    const dateStr = getDateForPuzzleNumber(num);

    // Get or create monthly file
    if (!monthlyFiles.has(month)) {
      monthlyFiles.set(month, createMonthlyFile(month));
      console.log(`  Created new monthly file: ${month}.json`);
    }

    const monthlyFile = monthlyFiles.get(month)!;
    monthlyFile.puzzles[String(num)] = puzzle;
    monthsModified.add(month);

    assignedIds.add(puzzle.id);
    assignedNumbers.add(num);
    newAssignments++;

    console.log(`  Assigned #${num} (${dateStr}) → ${puzzle.id} [${month}]`);
  }

  // Remove assigned puzzles from pool
  pool.puzzles = pool.puzzles.filter(p => !assignedIds.has(p.id));
  const removedFromPool = originalPoolCount - pool.puzzles.length;

  // Save updated pool
  fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2));

  // Save all modified monthly files
  for (const month of monthsModified) {
    const monthlyFile = monthlyFiles.get(month)!;
    saveMonthlyFile(assignedDir, month, monthlyFile);
    const puzzleCount = Object.keys(monthlyFile.puzzles).length;
    console.log(`  Saved ${month}.json (${puzzleCount} puzzles)`);
  }

  console.log(`\nSummary:`);
  console.log(`  New assignments: ${newAssignments}`);
  console.log(`  Total assigned: ${assignedNumbers.size}`);
  console.log(`  Removed from pool: ${removedFromPool}`);
  console.log(`  Remaining in pool: ${pool.puzzles.length}`);
  console.log(`  Monthly files modified: ${monthsModified.size}`);
}

main().catch(console.error);
