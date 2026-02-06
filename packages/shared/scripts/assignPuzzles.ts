/**
 * Shared puzzle assignment script
 *
 * Assigns puzzles from pool.json to specific dates in assigned.json.
 * Protects past assignments by never modifying entries for dates that have passed.
 *
 * Usage: npx tsx scripts/assignPuzzles.ts <gameDir> [options]
 *   gameDir: Path to the game's app directory (e.g., apps/dabble)
 *   Options:
 *     --days <n>    Assign puzzles for the next n days (default: 30)
 *     --from <date> Start date (YYYY-MM-DD, default: today)
 *     --to <date>   End date (YYYY-MM-DD)
 *
 * Example:
 *   npx tsx packages/shared/scripts/assignPuzzles.ts apps/dabble --days 30
 *   npx tsx packages/shared/scripts/assignPuzzles.ts apps/jumble --from 2026-02-01 --to 2026-02-28
 */

import * as fs from 'fs';
import * as path from 'path';

interface PoolPuzzle {
  id: string;
  [key: string]: unknown;
}

interface PoolFile {
  generatedAt: string;
  puzzles: PoolPuzzle[];
}

interface AssignedPuzzle {
  number: number;
  date: string;
  puzzleId: string;
  assignedAt: string;
  [key: string]: unknown;
}

interface AssignedFile {
  gameId: string;
  baseDate: string;
  assignments: AssignedPuzzle[];
}

function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateString(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getPuzzleNumber(baseDate: Date, currentDate: Date): number {
  const baseTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()).getTime();
  const currentTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((currentTime - baseTime) / dayMs) + 1;
}

function parseArgs(): { gameDir: string; fromDate: Date; toDate: Date } {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npx tsx assignPuzzles.ts <gameDir> [--days n] [--from date] [--to date]');
    process.exit(1);
  }

  const gameDir = args[0];
  let fromDate = new Date();
  let toDate: Date | null = null;
  let days = 30;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--days' && args[i + 1]) {
      days = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--from' && args[i + 1]) {
      fromDate = parseDateString(args[i + 1]);
      i++;
    } else if (args[i] === '--to' && args[i + 1]) {
      toDate = parseDateString(args[i + 1]);
      i++;
    }
  }

  if (!toDate) {
    toDate = addDays(fromDate, days - 1);
  }

  return { gameDir, fromDate, toDate };
}

async function main() {
  const { gameDir, fromDate, toDate } = parseArgs();

  const puzzlesDir = path.join(gameDir, 'public/puzzles');
  const poolPath = path.join(puzzlesDir, 'pool.json');
  const assignedPath = path.join(puzzlesDir, 'assigned.json');

  // Check pool exists
  if (!fs.existsSync(poolPath)) {
    console.error(`Pool file not found: ${poolPath}`);
    console.error('Run the pool generation script first.');
    process.exit(1);
  }

  // Load pool
  const poolContent = fs.readFileSync(poolPath, 'utf-8');
  const pool: PoolFile = JSON.parse(poolContent);
  console.log(`Loaded pool with ${pool.puzzles.length} puzzles`);

  // Load or create assigned file
  let assigned: AssignedFile;
  if (fs.existsSync(assignedPath)) {
    const assignedContent = fs.readFileSync(assignedPath, 'utf-8');
    assigned = JSON.parse(assignedContent);
    console.log(`Loaded assigned file with ${assigned.assignments.length} assignments`);
  } else {
    // Determine game ID from directory name
    const gameId = path.basename(gameDir);
    assigned = {
      gameId,
      baseDate: '2026-01-01', // Default base date
      assignments: [],
    };
    console.log(`Created new assigned file for ${gameId}`);
  }

  const baseDate = parseDateString(assigned.baseDate);

  // Get dates that need assignments
  const today = new Date();
  const todayStr = formatDateString(today);
  const assignedDates = new Set(assigned.assignments.map(a => a.date));
  const assignedIds = new Set(assigned.assignments.map(a => a.puzzleId));

  // Get available puzzles (not yet assigned)
  const availablePuzzles = pool.puzzles.filter(p => !assignedIds.has(p.id));
  console.log(`Available puzzles in pool: ${availablePuzzles.length}`);

  // Generate date range
  const datesToAssign: string[] = [];
  let currentDate = new Date(fromDate);
  while (currentDate <= toDate) {
    const dateStr = formatDateString(currentDate);
    // Only assign if not already assigned
    if (!assignedDates.has(dateStr)) {
      datesToAssign.push(dateStr);
    }
    currentDate = addDays(currentDate, 1);
  }

  console.log(`\nDates to assign: ${datesToAssign.length}`);

  if (datesToAssign.length === 0) {
    console.log('No dates need assignment in the specified range.');
    return;
  }

  if (availablePuzzles.length < datesToAssign.length) {
    console.error(`Not enough puzzles in pool! Need ${datesToAssign.length}, have ${availablePuzzles.length}`);
    console.error('Generate more puzzles first.');
    process.exit(1);
  }

  // Randomly assign puzzles to dates
  const shuffled = [...availablePuzzles].sort(() => Math.random() - 0.5);
  const newAssignments: AssignedPuzzle[] = [];
  const usedIds: string[] = [];

  for (let i = 0; i < datesToAssign.length; i++) {
    const date = datesToAssign[i];
    const puzzle = shuffled[i];
    const puzzleNumber = getPuzzleNumber(baseDate, parseDateString(date));

    const assignment: AssignedPuzzle = {
      number: puzzleNumber,
      date,
      puzzleId: puzzle.id,
      assignedAt: new Date().toISOString(),
      // Copy all puzzle data (board, letters, debug, etc.)
      ...puzzle,
    };

    newAssignments.push(assignment);
    usedIds.push(puzzle.id);
  }

  // Add new assignments
  assigned.assignments.push(...newAssignments);
  // Sort by date
  assigned.assignments.sort((a, b) => a.date.localeCompare(b.date));

  // Save assigned file
  fs.writeFileSync(assignedPath, JSON.stringify(assigned, null, 2));
  console.log(`\nSaved ${newAssignments.length} new assignments to ${assignedPath}`);

  // Remove assigned puzzles from pool
  pool.puzzles = pool.puzzles.filter(p => !usedIds.includes(p.id));
  fs.writeFileSync(poolPath, JSON.stringify(pool, null, 2));
  console.log(`Updated pool: ${pool.puzzles.length} puzzles remaining`);

  // Summary
  console.log('\n--- Summary ---');
  console.log(`Assigned ${newAssignments.length} puzzles`);
  console.log(`Date range: ${datesToAssign[0]} to ${datesToAssign[datesToAssign.length - 1]}`);
  console.log(`Total assignments: ${assigned.assignments.length}`);
  console.log(`Remaining in pool: ${pool.puzzles.length}`);
}

main().catch(console.error);
