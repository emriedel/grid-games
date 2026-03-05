/**
 * Dabble Puzzle Migration Script
 *
 * Migrates monthly puzzle files from number-keyed format to date-keyed format.
 * Also ensures all puzzles have a puzzleNumber field.
 *
 * Before:
 *   "28": { "id": "...", "archetype": "...", ... }
 *
 * After:
 *   "2026-02-28": { "id": "...", "archetype": "...", "puzzleNumber": 28, ... }
 *
 * Usage:
 *   npx tsx scripts/migratePuzzles.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface PoolPuzzle {
  id: string;
  archetype: string;
  letters: string[];
  board: unknown;
  thresholds: unknown;
  puzzleNumber?: number;
}

interface MonthlyAssignedFile {
  gameId: string;
  baseDate: string;
  puzzles: Record<string, PoolPuzzle>;
}

// Must match the base date in storage.ts and config.ts
const BASE_DATE = '2026-02-01';

/**
 * Get the date string (YYYY-MM-DD) for a puzzle number.
 */
function getDateForPuzzleNumber(puzzleNumber: number): string {
  const baseDate = new Date(BASE_DATE + 'T00:00:00');
  const puzzleDate = new Date(baseDate.getTime() + (puzzleNumber - 1) * 24 * 60 * 60 * 1000);
  return puzzleDate.toISOString().split('T')[0];
}

/**
 * Get puzzle number from a date string (YYYY-MM-DD).
 */
function getPuzzleNumberForDate(dateStr: string): number {
  const baseDate = new Date(BASE_DATE + 'T00:00:00');
  const puzzleDate = new Date(dateStr + 'T00:00:00');
  const diffTime = puzzleDate.getTime() - baseDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

/**
 * Check if a key is a date string (YYYY-MM-DD)
 */
function isDateKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

/**
 * Check if a key is a number string
 */
function isNumberKey(key: string): boolean {
  return /^\d+$/.test(key);
}

async function main() {
  console.log(`\nDabble Puzzle Migration`);
  console.log(`=======================\n`);
  console.log(`Base date: ${BASE_DATE}\n`);

  const assignedDir = path.join(__dirname, '../public/puzzles/assigned');

  if (!fs.existsSync(assignedDir)) {
    console.error('Error: assigned directory not found.');
    process.exit(1);
  }

  const files = fs.readdirSync(assignedDir).filter(f => f.endsWith('.json'));
  console.log(`Found ${files.length} monthly files to process\n`);

  let totalMigrated = 0;
  let totalFixed = 0;

  for (const file of files) {
    const filePath = path.join(assignedDir, file);
    const month = file.replace('.json', '');
    const data: MonthlyAssignedFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    console.log(`Processing ${file}...`);

    const newPuzzles: Record<string, PoolPuzzle> = {};
    let migratedCount = 0;
    let fixedCount = 0;

    for (const [key, puzzle] of Object.entries(data.puzzles)) {
      if (isDateKey(key)) {
        // Already date-keyed - ensure puzzleNumber exists
        const expectedNumber = getPuzzleNumberForDate(key);
        if (puzzle.puzzleNumber === undefined) {
          puzzle.puzzleNumber = expectedNumber;
          fixedCount++;
          console.log(`  Fixed missing puzzleNumber for ${key} -> #${expectedNumber}`);
        } else if (puzzle.puzzleNumber !== expectedNumber) {
          console.warn(`  Warning: ${key} has puzzleNumber ${puzzle.puzzleNumber}, expected ${expectedNumber}`);
        }
        newPuzzles[key] = puzzle;
      } else if (isNumberKey(key)) {
        // Number-keyed - convert to date-keyed
        const puzzleNumber = parseInt(key, 10);
        const dateKey = getDateForPuzzleNumber(puzzleNumber);
        puzzle.puzzleNumber = puzzleNumber;
        newPuzzles[dateKey] = puzzle;
        migratedCount++;
        console.log(`  Migrated #${puzzleNumber} -> ${dateKey}`);
      } else {
        console.warn(`  Warning: Unknown key format: ${key}`);
        newPuzzles[key] = puzzle;
      }
    }

    // Sort puzzles by date key
    const sortedPuzzles: Record<string, PoolPuzzle> = {};
    const sortedKeys = Object.keys(newPuzzles).sort();
    for (const key of sortedKeys) {
      sortedPuzzles[key] = newPuzzles[key];
    }

    data.puzzles = sortedPuzzles;

    // Write back
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    totalMigrated += migratedCount;
    totalFixed += fixedCount;

    console.log(`  Saved: ${migratedCount} migrated, ${fixedCount} fixed\n`);
  }

  console.log(`\nSummary:`);
  console.log(`  Total migrated (number -> date key): ${totalMigrated}`);
  console.log(`  Total fixed (added puzzleNumber): ${totalFixed}`);
}

main().catch(console.error);
