#!/usr/bin/env npx tsx

/**
 * Migration script to convert puzzle files from number-keyed to date-keyed format
 *
 * Old format:
 * {
 *   "gameId": "game",
 *   "baseDate": "2026-02-01",
 *   "puzzles": {
 *     "1": { "id": "...", ... },
 *     "2": { "id": "...", ... }
 *   }
 * }
 *
 * New format:
 * {
 *   "gameId": "game",
 *   "baseDate": "2026-02-01",
 *   "puzzles": {
 *     "2026-02-01": { "puzzleNumber": 1, "id": "...", ... },
 *     "2026-02-02": { "puzzleNumber": 2, "id": "...", ... }
 *   }
 * }
 *
 * Usage:
 *   npx tsx scripts/migratePuzzleFormat.ts [--dry-run]
 */

import * as fs from 'fs';
import * as path from 'path';

const DRY_RUN = process.argv.includes('--dry-run');

// Game configs: game -> { launchDate, assignedDir }
const GAME_CONFIGS: Record<string, { launchDate: string; assignedDir: string }> = {
  dabble: {
    launchDate: '2026-02-01',
    assignedDir: 'apps/dabble/public/puzzles/assigned',
  },
  carom: {
    launchDate: '2026-02-01',
    assignedDir: 'apps/carom/public/puzzles/assigned',
  },
  trio: {
    launchDate: '2026-02-01',
    assignedDir: 'apps/trio/public/puzzles/assigned',
  },
  jumble: {
    launchDate: '2026-02-01',
    assignedDir: 'apps/jumble/public/puzzles/assigned',
  },
  inlay: {
    launchDate: '2026-02-01',
    assignedDir: 'apps/inlay/public/puzzles/assigned',
  },
  edgewise: {
    launchDate: '2026-01-25',
    assignedDir: 'apps/edgewise/public/puzzles/assigned',
  },
};

interface OldPuzzle {
  id: string;
  [key: string]: unknown;
}

interface NewPuzzle extends OldPuzzle {
  puzzleNumber: number;
}

interface MonthlyFile {
  gameId: string;
  baseDate: string;
  puzzles: Record<string, OldPuzzle | NewPuzzle>;
}

function getDateForPuzzleNumber(puzzleNumber: number, launchDate: string): string {
  const base = new Date(launchDate + 'T00:00:00');
  const puzzleDate = new Date(base.getTime() + (puzzleNumber - 1) * 24 * 60 * 60 * 1000);
  const year = puzzleDate.getFullYear();
  const month = String(puzzleDate.getMonth() + 1).padStart(2, '0');
  const day = String(puzzleDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isDateKey(key: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(key);
}

function isNumberKey(key: string): boolean {
  return /^\d+$/.test(key);
}

function migrateFile(filePath: string, launchDate: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(content) as MonthlyFile;

  // Check if already migrated (all keys are date format)
  const keys = Object.keys(data.puzzles);
  const allDateKeys = keys.every(isDateKey);
  const allNumberKeys = keys.every(isNumberKey);

  if (allDateKeys) {
    console.log(`  [skip] Already migrated: ${filePath}`);
    return false;
  }

  if (!allNumberKeys) {
    console.log(`  [warn] Mixed format in ${filePath}, skipping`);
    return false;
  }

  // Convert number-keyed to date-keyed
  const newPuzzles: Record<string, NewPuzzle> = {};

  for (const [numKey, puzzle] of Object.entries(data.puzzles)) {
    const puzzleNumber = parseInt(numKey, 10);
    const dateKey = getDateForPuzzleNumber(puzzleNumber, launchDate);

    newPuzzles[dateKey] = {
      ...puzzle,
      puzzleNumber,
    };
  }

  const newData: MonthlyFile = {
    ...data,
    puzzles: newPuzzles,
  };

  if (DRY_RUN) {
    console.log(`  [dry-run] Would migrate ${filePath}`);
    console.log(`    Keys: ${keys.join(', ')} -> ${Object.keys(newPuzzles).join(', ')}`);
  } else {
    fs.writeFileSync(filePath, JSON.stringify(newData, null, 2) + '\n');
    console.log(`  [migrated] ${filePath}`);
  }

  return true;
}

function main() {
  console.log('Puzzle Format Migration');
  console.log('=======================');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('');

  let totalMigrated = 0;
  let totalSkipped = 0;

  for (const [gameId, config] of Object.entries(GAME_CONFIGS)) {
    console.log(`\nGame: ${gameId}`);

    const assignedDir = path.join(process.cwd(), config.assignedDir);

    if (!fs.existsSync(assignedDir)) {
      console.log(`  [skip] Directory not found: ${assignedDir}`);
      continue;
    }

    const files = fs.readdirSync(assignedDir).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const filePath = path.join(assignedDir, file);
      const migrated = migrateFile(filePath, config.launchDate);
      if (migrated) {
        totalMigrated++;
      } else {
        totalSkipped++;
      }
    }
  }

  console.log('\n=======================');
  console.log(`Total migrated: ${totalMigrated}`);
  console.log(`Total skipped: ${totalSkipped}`);

  if (DRY_RUN) {
    console.log('\nRun without --dry-run to apply changes.');
  }
}

main();
