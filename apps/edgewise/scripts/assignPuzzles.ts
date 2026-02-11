#!/usr/bin/env npx tsx
/**
 * Assign Puzzles Script for Edgewise
 *
 * This script assigns puzzles to daily slots from two sources:
 * 1. Legacy puzzles.json (for already-dated puzzles)
 * 2. pool.json approved puzzles (for new puzzles)
 *
 * Usage:
 *   npx tsx scripts/assignPuzzles.ts           # Assign up to today's puzzle
 *   npx tsx scripts/assignPuzzles.ts 100       # Ensure puzzles 1-100 are assigned
 *
 * The script:
 * 1. Loads existing assigned puzzles from monthly files
 * 2. Loads legacy puzzles from puzzles.json
 * 3. Loads APPROVED puzzles from pool.json
 * 4. Assigns puzzles to fill gaps up to target count
 * 5. Removes assigned puzzles from pool.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { PoolFile, PoolPuzzle, PoolPuzzleSquare } from './types';

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

interface AssignedPuzzle {
  id: string;
  date: string;
  categories: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  squares: [PuzzleSquare, PuzzleSquare, PuzzleSquare, PuzzleSquare];
}

interface MonthlyAssignedFile {
  gameId: string;
  baseDate: string;
  puzzles: Record<string, AssignedPuzzle>;
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

function getTodayPuzzleNumber(): number {
  const baseDate = new Date(PUZZLE_BASE_DATE_STRING + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - baseDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

function generatePuzzleId(puzzle: { categories: unknown; squares: unknown }): string {
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

function poolPuzzleToAssigned(poolPuzzle: PoolPuzzle, date: string): AssignedPuzzle {
  return {
    id: poolPuzzle.id,
    date,
    categories: poolPuzzle.categories,
    squares: poolPuzzle.squares as [PuzzleSquare, PuzzleSquare, PuzzleSquare, PuzzleSquare],
  };
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

  // Load legacy puzzles (keyed by puzzle number)
  const legacyByNumber = new Map<number, LegacyPuzzle>();
  if (fs.existsSync(legacyPath)) {
    const legacyData = JSON.parse(fs.readFileSync(legacyPath, 'utf-8'));
    const legacyPuzzles: LegacyPuzzle[] = legacyData.puzzles || [];
    console.log(`Found ${legacyPuzzles.length} legacy puzzles`);

    for (const puzzle of legacyPuzzles) {
      const num = getPuzzleNumberForDate(puzzle.date);
      legacyByNumber.set(num, puzzle);
    }
  }

  // Load pool puzzles
  let pool: PoolFile = { gameId: 'edgewise', puzzles: [] };
  if (fs.existsSync(poolPath)) {
    pool = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));
    console.log(`Found ${pool.puzzles.length} puzzles in pool`);
  }

  // Filter to approved puzzles only
  const approvedPuzzles = pool.puzzles.filter(p => p.status === 'approved');
  console.log(`  ${approvedPuzzles.length} approved puzzles available`);

  // Get target count from command line or use today's puzzle number
  const todayNumber = getTodayPuzzleNumber();
  const targetCount = process.argv[2] ? parseInt(process.argv[2], 10) : todayNumber;
  console.log(`\nTarget: assign puzzles 1-${targetCount} (today is #${todayNumber})`);

  // Track which puzzles we assign
  const monthsModified = new Set<string>();
  let assignedCount = 0;
  const assignedPoolIds = new Set<string>();
  let poolIndex = 0;

  // Assign puzzles for each number from 1 to targetCount
  for (let puzzleNumber = 1; puzzleNumber <= targetCount; puzzleNumber++) {
    // Skip if already assigned
    if (assignedNumbers.has(puzzleNumber)) {
      continue;
    }

    const date = getDateForPuzzleNumber(puzzleNumber);
    const month = getMonthForPuzzleNumber(puzzleNumber);

    // Get or create monthly file
    if (!monthlyFiles.has(month)) {
      monthlyFiles.set(month, createMonthlyFile(month));
    }
    const monthlyFile = monthlyFiles.get(month)!;

    // Try to use legacy puzzle first (if it has a matching date)
    const legacyPuzzle = legacyByNumber.get(puzzleNumber);
    if (legacyPuzzle) {
      const assignedPuzzle: AssignedPuzzle = {
        ...legacyPuzzle,
        id: generatePuzzleId(legacyPuzzle),
      };
      monthlyFile.puzzles[String(puzzleNumber)] = assignedPuzzle;
      monthsModified.add(month);
      assignedNumbers.add(puzzleNumber);
      assignedCount++;
      console.log(`  #${puzzleNumber} (${date}): legacy puzzle → ${assignedPuzzle.id}`);
      continue;
    }

    // Use next approved pool puzzle
    if (poolIndex < approvedPuzzles.length) {
      const poolPuzzle = approvedPuzzles[poolIndex];
      poolIndex++;

      const assignedPuzzle = poolPuzzleToAssigned(poolPuzzle, date);
      monthlyFile.puzzles[String(puzzleNumber)] = assignedPuzzle;
      monthsModified.add(month);
      assignedNumbers.add(puzzleNumber);
      assignedPoolIds.add(poolPuzzle.id);
      assignedCount++;
      console.log(`  #${puzzleNumber} (${date}): pool puzzle → ${assignedPuzzle.id}`);
      continue;
    }

    // No puzzle available
    console.log(`  #${puzzleNumber} (${date}): NO PUZZLE AVAILABLE`);
  }

  // Save modified monthly files
  if (monthsModified.size > 0) {
    console.log(`\nSaving ${monthsModified.size} monthly files...`);
    for (const month of monthsModified) {
      const monthlyFile = monthlyFiles.get(month)!;
      saveMonthlyFile(assignedDir, month, monthlyFile);
    }
  }

  // Remove assigned puzzles from pool
  if (assignedPoolIds.size > 0) {
    console.log(`\nRemoving ${assignedPoolIds.size} assigned puzzles from pool...`);
    pool.puzzles = pool.puzzles.filter(p => !assignedPoolIds.has(p.id));
    fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2));
    console.log(`  Pool now has ${pool.puzzles.length} puzzles`);
  }

  console.log(`\nDone! Assigned ${assignedCount} puzzles.`);
  console.log(`Total assigned: ${assignedNumbers.size}`);

  // Summary
  const approvedRemaining = pool.puzzles.filter(p => p.status === 'approved').length;
  const pendingRemaining = pool.puzzles.filter(p => p.status === 'pending').length;
  console.log(`\nPool status: ${approvedRemaining} approved, ${pendingRemaining} pending`);
}

main().catch(console.error);
