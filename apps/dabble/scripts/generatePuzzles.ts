/**
 * Dabble Puzzle Pre-Generation Script
 *
 * Pre-generates puzzles with star thresholds for a date range.
 * Output is organized by month: public/puzzles/YYYY-MM.json
 *
 * Usage:
 *   npx tsx scripts/generatePuzzles.ts [startDate] [days]
 *
 * Examples:
 *   npx tsx scripts/generatePuzzles.ts                        # Generate 30 days from today
 *   npx tsx scripts/generatePuzzles.ts 2026-01-01 365         # Generate year from Jan 1
 *   npx tsx scripts/generatePuzzles.ts 2026-02-01 28          # Generate February
 */

import * as fs from 'fs';
import * as path from 'path';
import { generateDailyPuzzle, solveWithBeamSearch, calculateStarThresholds, loadDictionary } from './solver';
import type { StarThresholds } from './solver';

interface PreGeneratedPuzzle {
  date: string;
  archetype: string;
  letters: string[];
  board: {
    size: number;
    cells: {
      row: number;
      col: number;
      bonus: string | null;
      isPlayable: boolean;
    }[][];
  };
  thresholds: StarThresholds;
}

interface MonthFile {
  generatedAt: string;
  puzzles: Record<string, PreGeneratedPuzzle>;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getMonthKey(dateString: string): string {
  return dateString.substring(0, 7); // YYYY-MM
}

async function main() {
  const startDateArg = process.argv[2];
  const daysArg = process.argv[3];

  const startDate = startDateArg ? new Date(startDateArg + 'T00:00:00') : new Date();
  const days = daysArg ? parseInt(daysArg, 10) : 30;

  console.log(`\nDabble Puzzle Pre-Generator`);
  console.log(`===========================\n`);
  console.log(`Start date: ${formatDate(startDate)}`);
  console.log(`Days to generate: ${days}\n`);

  await loadDictionary();

  // Group puzzles by month
  const monthFiles: Map<string, MonthFile> = new Map();

  const outputDir = path.join(__dirname, '../public/puzzles');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Load existing month files to preserve data
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateString = formatDate(date);
    const monthKey = getMonthKey(dateString);

    if (!monthFiles.has(monthKey)) {
      const monthFilePath = path.join(outputDir, `${monthKey}.json`);
      if (fs.existsSync(monthFilePath)) {
        try {
          const existing = JSON.parse(fs.readFileSync(monthFilePath, 'utf-8'));
          monthFiles.set(monthKey, existing);
        } catch {
          monthFiles.set(monthKey, { generatedAt: '', puzzles: {} });
        }
      } else {
        monthFiles.set(monthKey, { generatedAt: '', puzzles: {} });
      }
    }
  }

  // Generate puzzles
  let generated = 0;
  let skipped = 0;

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateString = formatDate(date);
    const monthKey = getMonthKey(dateString);

    const monthFile = monthFiles.get(monthKey)!;

    // Skip if already generated
    if (monthFile.puzzles[dateString]) {
      skipped++;
      continue;
    }

    process.stdout.write(`Generating ${dateString}...`);

    const puzzle = generateDailyPuzzle(dateString);
    const { bestScore } = solveWithBeamSearch(puzzle);
    const thresholds = calculateStarThresholds(bestScore);

    // Store puzzle with minimal board representation
    const preGenerated: PreGeneratedPuzzle = {
      date: dateString,
      archetype: puzzle.archetype,
      letters: puzzle.letters,
      board: {
        size: puzzle.board.size,
        cells: puzzle.board.cells.map(row =>
          row.map(cell => ({
            row: cell.row,
            col: cell.col,
            bonus: cell.bonus,
            isPlayable: cell.isPlayable,
          }))
        ),
      },
      thresholds,
    };

    monthFile.puzzles[dateString] = preGenerated;
    generated++;

    console.log(` ${puzzle.archetype}, max=${bestScore}`);
  }

  // Save month files
  for (const [monthKey, monthFile] of monthFiles) {
    monthFile.generatedAt = new Date().toISOString();

    // Sort puzzles by date
    const sortedPuzzles: Record<string, PreGeneratedPuzzle> = {};
    const dates = Object.keys(monthFile.puzzles).sort();
    for (const date of dates) {
      sortedPuzzles[date] = monthFile.puzzles[date];
    }
    monthFile.puzzles = sortedPuzzles;

    const monthFilePath = path.join(outputDir, `${monthKey}.json`);
    fs.writeFileSync(monthFilePath, JSON.stringify(monthFile, null, 2));
    console.log(`\nSaved ${Object.keys(monthFile.puzzles).length} puzzles to ${monthFilePath}`);
  }

  console.log(`\nSummary:`);
  console.log(`  Generated: ${generated} puzzles`);
  console.log(`  Skipped (already exist): ${skipped} puzzles`);

  // Print sample stats
  if (generated > 0) {
    const allPuzzles = Array.from(monthFiles.values()).flatMap(m => Object.values(m.puzzles));
    const archetypeCounts: Record<string, number> = {};
    let totalMax = 0;

    for (const p of allPuzzles) {
      archetypeCounts[p.archetype] = (archetypeCounts[p.archetype] || 0) + 1;
      totalMax += p.thresholds.heuristicMax;
    }

    console.log(`\nArchetype distribution:`);
    for (const [arch, count] of Object.entries(archetypeCounts)) {
      console.log(`  ${arch}: ${count}`);
    }

    console.log(`\nAverage heuristic max: ${Math.round(totalMax / allPuzzles.length)}`);
  }
}

main().catch(console.error);
