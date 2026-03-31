# Adding a New Game to Nerdcube Daily

Use this skill when creating a new game for the Nerdcube Daily monorepo.

---

## Step 1: Copy Template

```bash
cp -r apps/dabble apps/new-game
```

## Step 2: Update Package Identity

Edit `apps/new-game/package.json`:
```json
{
  "name": "@grid-games/new-game",
  "scripts": {
    "dev": "next dev --port 3003",
    "start": "next start --port 3003"
  }
}
```

## Step 3: Update Layout

The copied layout.tsx already includes Vercel Analytics. Update the metadata:

Edit `apps/new-game/src/app/layout.tsx`:
```tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from '@vercel/analytics/react';  // Already included
import "./globals.css";

// ... fonts ...

export const metadata: Metadata = {
  title: "New Game | Nerdcube Daily",
  description: "Your game description here.",
  icons: {
    icon: "https://nerdcube.games/icons/new-game.png",
    apple: "https://nerdcube.games/icons/new-game.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)]`}>
        {children}
        <Analytics />  {/* Already included - tracks page views on Vercel */}
      </body>
    </html>
  );
}
```

## Step 4: Define Theme

Edit `apps/new-game/src/app/globals.css`:
```css
:root {
  /* Base tokens (keep these consistent) */
  --background: #0a0a0a;
  --foreground: #ededed;
  --muted: #a1a1aa;
  --border: #27272a;

  /* Game theme - Your accent color */
  --accent: #your-color;
  --accent-foreground: #text-on-accent;
  --accent-secondary: #secondary-color;

  /* Tile styling */
  --tile-bg: #your-tile-bg;
  --tile-bg-selected: #your-tile-selected;
  --tile-border: #your-tile-border;

  /* Status colors (keep consistent) */
  --success: #22c55e;
  --warning: #eab308;
  --danger: #ef4444;
}
```

## Step 5: Create Storage Module (with Archive Support)

Use `createArchiveStorage` from `@grid-games/shared` for proper archive support:

Create `apps/new-game/src/lib/storage.ts`:
```tsx
import { createArchiveStorage, type BasePuzzleState } from '@grid-games/shared';
import { PUZZLE_BASE_DATE } from '@/config';

/**
 * Game-specific puzzle state
 */
export interface NewGamePuzzleState extends BasePuzzleState {
  puzzleNumber: number;
  puzzleId?: string;  // Unique puzzle identifier (for key generation)
  status: 'in-progress' | 'completed';
  data: {
    // Add game-specific fields
    score: number;
    // In-progress only
    boardState?: /* your board state type */;
    // Completed only
    finalScore?: number;
  };
}

// Create the storage instance using the shared factory
const storage = createArchiveStorage<NewGamePuzzleState>({
  gameId: 'new-game',
  launchDate: PUZZLE_BASE_DATE,
});

// Re-export all shared functions
export const {
  getStorageKey,
  getPuzzleState,
  findPuzzleState,
  savePuzzleState,
  clearPuzzleState,
  isPuzzleCompleted,
  isPuzzleCompletedAny,
  getSavedPuzzleId,
  isPuzzleInProgress,
  isPuzzleInProgressAny,
  getTodayPuzzleNumber,
} = storage;

// ============ Legacy Compatibility Wrappers ============

/** Check if today's puzzle was completed */
export function hasCompletedToday(): boolean {
  return isPuzzleCompletedAny(getTodayPuzzleNumber());
}

/** Check if there's an in-progress game for today */
export function hasInProgressGame(): boolean {
  return isPuzzleInProgressAny(getTodayPuzzleNumber());
}
```

**Storage Key Format:** `{gameId}-{puzzleNumber}-{puzzleId}` (e.g., `new-game-5-a1b2c3d4`)

**Why puzzleId matters:**
- Each pre-generated puzzle has a unique `id` field
- When puzzles are regenerated, ids change
- Archive pages check completion using the current puzzleId
- Prevents showing old completion status for regenerated puzzles

## Step 6: Create Game Config

Create `apps/new-game/src/config.ts`:
```tsx
import { defineGameConfig } from '@grid-games/config';
import { formatDisplayDate, getTodayDateString, getPuzzleNumber } from '@grid-games/shared';

// Base date for puzzle numbering (first puzzle date)
// Export both formats for different use cases
// CRITICAL: Always include 'T00:00:00' when creating Date objects from date strings!
// Without it, JavaScript interprets as UTC midnight, which becomes the
// PREVIOUS day in US timezones, causing off-by-one errors in puzzle numbering.
export const PUZZLE_BASE_DATE_STRING = '2026-02-01';
export const PUZZLE_BASE_DATE = new Date(PUZZLE_BASE_DATE_STRING + 'T00:00:00');

// Base path for assets (set via NEXT_PUBLIC_BASE_PATH on Vercel)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const newGameConfig = defineGameConfig({
  id: 'new-game',
  name: 'New Game',
  icon: `${basePath}/icon.png`,
  description: 'Your game description.',
  theme: { /* your theme */ },
  homeUrl: '/',
  getPuzzleInfo: () => ({
    number: getPuzzleNumber(PUZZLE_BASE_DATE),
    date: formatDisplayDate(getTodayDateString()),
  }),
});
```

## Step 7: Update Game.tsx Structure

Use the shared components with proper state persistence:
```tsx
import { LandingScreen, NavBar, GameContainer, Button, ResultsModal } from '@grid-games/ui';
import { buildShareText, formatDisplayDate } from '@grid-games/shared';
import { newGameConfig } from '@/config';
import {
  hasCompletedToday, hasInProgressGame,
  getInProgressState, getCompletionState,
  saveInProgressState, saveCompletionState
} from '@/lib/storage';

export default function Game() {
  // === ALL HOOKS MUST BE DEFINED BEFORE EARLY RETURNS ===

  // Game state
  const [gameState, setGameState] = useState<'landing' | 'playing' | 'finished'>('landing');
  const [loading, setLoading] = useState(true);

  // Hydration-safe landing mode (computed in useEffect, not directly)
  const [landingMode, setLandingMode] = useState<'fresh' | 'in-progress' | 'completed'>('fresh');

  // Determine landing mode after mount (client-side only)
  useEffect(() => {
    if (hasCompletedToday()) {
      setLandingMode('completed');
    } else if (hasInProgressGame()) {
      setLandingMode('in-progress');
    }
    setLoading(false);
  }, []);

  // Define all handlers before early returns
  const handlePlay = useCallback(() => {
    // Start fresh game
    setGameState('playing');
  }, []);

  const handleResume = useCallback(() => {
    // Restore in-progress state and continue
    const state = getInProgressState();
    if (state) {
      // Restore game state from saved data
    }
    setGameState('playing');
  }, []);

  const handleSeeResults = useCallback(() => {
    // Restore completion state and show results
    const state = getCompletionState();
    if (state) {
      // Restore completed game state
    }
    setGameState('finished');
  }, []);

  // === EARLY RETURNS AFTER ALL HOOKS ===
  if (loading) {
    return <div className="min-h-screen bg-[var(--background)]" />;
  }

  if (gameState === 'landing') {
    return (
      <LandingScreen
        icon={newGameConfig.icon}
        name={newGameConfig.name}
        description={newGameConfig.description}
        puzzleInfo={newGameConfig.getPuzzleInfo()}
        mode={landingMode}
        onPlay={handlePlay}
        onResume={handleResume}
        onSeeResults={handleSeeResults}
        onRules={() => setShowRules(true)}
        gameId="new-game"
      />
    );
  }

  // ... rest of game rendering
}
```

### ResultsModal Integration

Create a game-specific wrapper for the shared ResultsModal:

```tsx
// Game-specific wrapper for ResultsModal
interface NewGameResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  score: number;
  puzzleDate: string;
  // Add game-specific props
}

function NewGameResultsModal({
  isOpen,
  onClose,
  score,
  puzzleDate,
}: NewGameResultsModalProps) {
  const displayDate = formatDisplayDate(puzzleDate);

  // Build share text with game-specific format
  const shareText = buildShareText({
    gameId: 'new-game',
    gameName: 'New Game',
    puzzleId: displayDate,
    score: score,
    emojiGrid: '🟩🟩🟩⬜⬜', // Game-specific emoji visualization
    shareUrl: 'https://nerdcube.games/new-game',
  });

  return (
    <ResultsModal
      isOpen={isOpen}
      onClose={onClose}
      gameId="new-game"
      date={displayDate}
      primaryStat={{ value: score, label: 'points' }}
      secondaryStats={[
        { label: 'stat name', value: 'stat value' },
      ]}
      shareConfig={{ text: shareText }}
    >
      {/* Optional: Game-specific breakdown content */}
      <div className="bg-[var(--tile-bg)] rounded-lg p-4">
        {/* Custom content here */}
      </div>
    </ResultsModal>
  );
}
```

**ResultsModal Props:**
- `isOpen`, `onClose` - Modal visibility control
- `gameId` - Current game (filters from "try another game" section)
- `date` - Display date (formatted)
- `primaryStat` - Main result `{ value, label }`
- `secondaryStats` - Optional array of `{ label, value, highlight? }`
- `shareConfig` - `{ text: string }` for share button
- `children` - Optional slot for game-specific breakdown

**Key Points:**
- All `useState`, `useCallback`, `useEffect` hooks defined BEFORE any early returns
- `landingMode` uses state + useEffect for hydration safety
- Show loading screen while determining initial state
- LandingScreen receives mode prop and appropriate handlers

## Step 7b: Add Archive Support (Optional)

If your game supports past puzzles (archive), add these files:

### Create Archive Route

Create `apps/new-game/src/app/archive/page.tsx`:
```tsx
import { Suspense } from 'react';
import { ArchivePageContent } from '@/components/ArchivePageContent';

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-[var(--foreground)] text-lg">Loading...</div>
    </div>
  );
}

export default function ArchivePage() {
  return (
    <Suspense fallback={<Loading />}>
      <ArchivePageContent />
    </Suspense>
  );
}
```

### Create ArchivePageContent

Create `apps/new-game/src/components/ArchivePageContent.tsx`:
```tsx
'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArchivePage } from '@grid-games/ui';
import { isPuzzleCompleted, isPuzzleInProgress, getTodayPuzzleNumber } from '@/lib/storage';

// Match your game's launch date
// NOTE: This is a string, not a Date object. When converting to Date,
// always use: new Date(PUZZLE_BASE_DATE + 'T00:00:00')
const PUZZLE_BASE_DATE = '2026-01-01';

export function ArchivePageContent() {
  const router = useRouter();

  const handleSelectPuzzle = useCallback((puzzleNumber: number) => {
    router.push(`/?puzzle=${puzzleNumber}`);
  }, [router]);

  return (
    <ArchivePage
      gameName="New Game"
      gameId="new-game"
      baseDate={PUZZLE_BASE_DATE}
      todayPuzzleNumber={getTodayPuzzleNumber()}
      isPuzzleCompleted={isPuzzleCompleted}
      isPuzzleInProgress={isPuzzleInProgress}
      onSelectPuzzle={handleSelectPuzzle}
      backHref="/"
    />
  );
}
```

### Update Storage Module

Ensure your storage module exports these functions:
```tsx
export function isPuzzleCompleted(puzzleNumber: number): boolean {
  const state = getPuzzleState(puzzleNumber);
  return state?.status === 'completed';
}

export function isPuzzleInProgress(puzzleNumber: number): boolean {
  const state = getPuzzleState(puzzleNumber);
  return state?.status === 'in-progress';
}

export function getTodayPuzzleNumber(): number {
  return getPuzzleNumber(PUZZLE_BASE_DATE);
}
```

### Update LandingScreen

In Game.tsx, add `archiveHref` prop to LandingScreen:
```tsx
<LandingScreen
  icon={newGameConfig.icon}
  name={newGameConfig.name}
  description={newGameConfig.description}
  puzzleInfo={newGameConfig.getPuzzleInfo()}
  mode={landingMode}
  onPlay={handlePlay}
  onResume={handleResume}
  onSeeResults={handleSeeResults}
  onRules={() => setShowRules(true)}
  archiveHref="/archive"  // Add this (relative to basePath)
  gameId="new-game"
/>
```

### Update GAMES config

In `packages/config/src/games.ts`, set `hasArchive: true` for your game.

## Step 7c: Add Pre-Generated Puzzle System

All games use pre-generated puzzles with a pool/assigned architecture for stable archives.

### Directory Structure

```
public/puzzles/
├── pool.json              # UNASSIGNED puzzles only (safe to regenerate)
└── assigned/
    ├── 2026-02.json       # Full puzzle data for Feb 2026 (stable)
    ├── 2026-03.json       # Full puzzle data for Mar 2026
    └── ...
```

### Monthly File Format (Date-Keyed)

```typescript
interface MonthlyAssignedFile {
  gameId: string;           // e.g., "new-game"
  baseDate: string;         // First day of month "YYYY-MM-01"
  puzzles: Record<string, PuzzleData>;  // Keyed by date string (YYYY-MM-DD)
}

// Each puzzle has an explicit puzzleNumber field
interface PuzzleData {
  id: string;               // Unique puzzle ID (16 hex chars)
  puzzleNumber: number;     // Sequential puzzle number (1-indexed)
  // ... game-specific fields
}
```

### Create Puzzle Loader

Create `apps/new-game/src/lib/puzzleLoader.ts`:
```typescript
import {
  getTodayDateString,
  getPuzzleNumber,
  parseDateString,
  getMonthForPuzzleNumber,
  getDateForPuzzleNumber,
  loadMonthlyFile,
  getPuzzleIdsForRange as sharedGetPuzzleIdsForRange,
  type PuzzleWithId,
} from '@grid-games/shared';
import { PUZZLE_BASE_DATE, PUZZLE_BASE_DATE_STRING } from '@/config';
import type { Puzzle, PrecomputedPuzzle } from '@/types';

// Assigned puzzle with ID (matches monthly file format)
interface AssignedPuzzle extends PrecomputedPuzzle, PuzzleWithId {
  id: string;
}

/**
 * Helper to load monthly file using shared utility
 */
async function fetchMonthlyFile(month: string): Promise<Record<string, AssignedPuzzle> | null> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return loadMonthlyFile<AssignedPuzzle>(month, 'new-game', basePath);
}

/**
 * Get a puzzle by its puzzle number from monthly files
 */
async function getPuzzleByNumber(puzzleNumber: number): Promise<AssignedPuzzle | null> {
  const month = getMonthForPuzzleNumber(puzzleNumber, PUZZLE_BASE_DATE_STRING);
  const puzzles = await fetchMonthlyFile(month);

  if (!puzzles) return null;

  // Try date key (standard format)
  const dateKey = getDateForPuzzleNumber(PUZZLE_BASE_DATE, puzzleNumber);
  if (puzzles[dateKey]) {
    return puzzles[dateKey];
  }

  // Scan for matching puzzleNumber field
  for (const puzzle of Object.values(puzzles)) {
    if (puzzle.puzzleNumber === puzzleNumber) {
      return puzzle;
    }
  }

  return null;
}

/**
 * Convert a precomputed puzzle to a full Puzzle object
 */
function hydratePuzzle(precomputed: PrecomputedPuzzle, date: string, puzzleNumber: number, puzzleId?: string): Puzzle {
  // Convert precomputed format to runtime format
  return {
    // ... game-specific conversion
    date,
    puzzleNumber,
    puzzleId,
  };
}

/**
 * Get the daily puzzle
 * Loads from pre-computed puzzle in assigned files
 */
export async function getDailyPuzzle(dateStr?: string): Promise<Puzzle | null> {
  const date = dateStr || getTodayDateString();
  const puzzleNumber = getPuzzleNumber(PUZZLE_BASE_DATE, parseDateString(date));

  try {
    const precomputed = await getPuzzleByNumber(puzzleNumber);
    if (precomputed) {
      return hydratePuzzle(precomputed, date, puzzleNumber, precomputed.id);
    }
    console.warn(`[new-game] Puzzle #${puzzleNumber} not found`);
    return null;
  } catch (error) {
    console.warn('[new-game] Failed to load daily puzzle:', error);
    return null;
  }
}

/**
 * Get puzzleIds for a range of puzzle numbers (for archive page)
 */
export async function getPuzzleIdsForRange(startNum: number, endNum: number): Promise<Map<number, string>> {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  return sharedGetPuzzleIdsForRange(startNum, endNum, PUZZLE_BASE_DATE_STRING, 'new-game', basePath);
}
```

### Create Puzzle Generation Script

Create `apps/new-game/scripts/generatePuzzles.ts`:
```typescript
/**
 * Puzzle Generation Script
 *
 * Usage:
 *   npx tsx scripts/generatePuzzles.ts [count]
 *
 * Examples:
 *   npx tsx scripts/generatePuzzles.ts           # Generate 100 puzzles
 *   npx tsx scripts/generatePuzzles.ts 200       # Generate 200 puzzles
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface PoolFile {
  generatedAt: string;
  puzzles: GeneratedPuzzle[];
}

interface GeneratedPuzzle {
  id: string;
  // ... game-specific fields
}

const PUZZLES_DIR = path.join(__dirname, '../public/puzzles');
const POOL_PATH = path.join(PUZZLES_DIR, 'pool.json');

function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

function generatePuzzle(): GeneratedPuzzle {
  // Your puzzle generation logic here
  return {
    id: generateId(),
    // ... game-specific fields
  };
}

async function main() {
  const count = parseInt(process.argv[2] || '100', 10);
  console.log(`Generating ${count} puzzles...`);

  // Load existing pool
  let existingPuzzles: GeneratedPuzzle[] = [];
  if (fs.existsSync(POOL_PATH)) {
    const existing = JSON.parse(fs.readFileSync(POOL_PATH, 'utf-8')) as PoolFile;
    existingPuzzles = existing.puzzles;
    console.log(`Found ${existingPuzzles.length} existing puzzles in pool`);
  }

  // Generate new puzzles
  const newPuzzles: GeneratedPuzzle[] = [];
  for (let i = 0; i < count; i++) {
    const puzzle = generatePuzzle();
    newPuzzles.push(puzzle);
    if ((i + 1) % 10 === 0) {
      console.log(`Generated ${i + 1}/${count}`);
    }
  }

  // Write combined pool
  const poolFile: PoolFile = {
    generatedAt: new Date().toISOString(),
    puzzles: [...existingPuzzles, ...newPuzzles],
  };

  fs.mkdirSync(PUZZLES_DIR, { recursive: true });
  fs.writeFileSync(POOL_PATH, JSON.stringify(poolFile, null, 2));
  console.log(`Pool now has ${poolFile.puzzles.length} puzzles`);
}

main().catch(console.error);
```

### Create Puzzle Assignment Script

Create `apps/new-game/scripts/assignPuzzles.ts`:
```typescript
/**
 * Puzzle Assignment Script
 *
 * Assigns puzzles from pool.json to monthly assigned files.
 * Puzzles are MOVED from pool to assigned (full data, not just ID).
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

// CRITICAL: Include 'T00:00:00' for local timezone interpretation
const PUZZLE_BASE_DATE = new Date('2026-02-01T00:00:00');
const PUZZLES_DIR = path.join(__dirname, '../public/puzzles');
const POOL_PATH = path.join(PUZZLES_DIR, 'pool.json');
const ASSIGNED_DIR = path.join(PUZZLES_DIR, 'assigned');

interface PoolPuzzle {
  id: string;
  // ... game-specific fields
}

interface PoolFile {
  generatedAt: string;
  puzzles: PoolPuzzle[];
}

interface AssignedPuzzle extends PoolPuzzle {
  puzzleNumber: number;
}

interface MonthlyFile {
  gameId: string;
  baseDate: string;
  puzzles: Record<string, AssignedPuzzle>;
}

function getDateForPuzzleNumber(puzzleNumber: number): string {
  const date = new Date(PUZZLE_BASE_DATE);
  date.setDate(date.getDate() + puzzleNumber - 1);
  return date.toISOString().split('T')[0];
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function loadMonthlyFile(monthKey: string): MonthlyFile {
  const filePath = path.join(ASSIGNED_DIR, `${monthKey}.json`);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }
  return {
    gameId: 'new-game',
    baseDate: `${monthKey}-01`,
    puzzles: {},
  };
}

function saveMonthlyFile(monthKey: string, data: MonthlyFile): void {
  fs.mkdirSync(ASSIGNED_DIR, { recursive: true });
  const filePath = path.join(ASSIGNED_DIR, `${monthKey}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getHighestAssignedNumber(): number {
  if (!fs.existsSync(ASSIGNED_DIR)) return 0;

  let highest = 0;
  const files = fs.readdirSync(ASSIGNED_DIR).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(ASSIGNED_DIR, file), 'utf-8')) as MonthlyFile;
    for (const puzzle of Object.values(data.puzzles)) {
      if (puzzle.puzzleNumber > highest) {
        highest = puzzle.puzzleNumber;
      }
    }
  }

  return highest;
}

async function main() {
  // Load pool
  if (!fs.existsSync(POOL_PATH)) {
    console.error('Pool file not found. Run generate-puzzles first.');
    process.exit(1);
  }

  const pool = JSON.parse(fs.readFileSync(POOL_PATH, 'utf-8')) as PoolFile;
  console.log(`Pool has ${pool.puzzles.length} puzzles`);

  // Determine target
  const today = new Date();
  const todayPuzzleNumber = Math.floor((today.getTime() - PUZZLE_BASE_DATE.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const requestedCount = process.argv[2] ? parseInt(process.argv[2], 10) : todayPuzzleNumber;
  const targetCount = Math.max(requestedCount, todayPuzzleNumber);

  const currentHighest = getHighestAssignedNumber();
  console.log(`Currently assigned: 1-${currentHighest}`);
  console.log(`Target: 1-${targetCount}`);

  const needed = targetCount - currentHighest;
  if (needed <= 0) {
    console.log('No new assignments needed');
    return;
  }

  if (pool.puzzles.length < needed) {
    console.error(`Need ${needed} puzzles but pool only has ${pool.puzzles.length}`);
    process.exit(1);
  }

  // Assign puzzles
  const monthlyFiles = new Map<string, MonthlyFile>();
  const usedIndices: number[] = [];

  for (let i = 0; i < needed; i++) {
    const puzzleNumber = currentHighest + i + 1;
    const dateKey = getDateForPuzzleNumber(puzzleNumber);
    const monthKey = getMonthKey(dateKey);

    if (!monthlyFiles.has(monthKey)) {
      monthlyFiles.set(monthKey, loadMonthlyFile(monthKey));
    }

    const monthlyFile = monthlyFiles.get(monthKey)!;
    const poolPuzzle = pool.puzzles[i];

    monthlyFile.puzzles[dateKey] = {
      ...poolPuzzle,
      puzzleNumber,
    };

    usedIndices.push(i);
    console.log(`Assigned puzzle #${puzzleNumber} to ${dateKey}`);
  }

  // Save monthly files
  for (const [monthKey, data] of monthlyFiles) {
    saveMonthlyFile(monthKey, data);
    console.log(`Saved ${monthKey}.json`);
  }

  // Update pool (remove used puzzles)
  pool.puzzles = pool.puzzles.filter((_, i) => !usedIndices.includes(i));
  fs.writeFileSync(POOL_PATH, JSON.stringify(pool, null, 2));
  console.log(`Pool now has ${pool.puzzles.length} puzzles remaining`);
}

main().catch(console.error);
```

### Update Package.json Scripts

Add to `apps/new-game/package.json`:
```json
{
  "scripts": {
    "generate-puzzles": "npx tsx scripts/generatePuzzles.ts",
    "assign-puzzles": "npx tsx scripts/assignPuzzles.ts"
  }
}
```

### Workflow

1. **Generate puzzles** into pool (can regenerate with improved algorithms):
   ```bash
   npm run generate-puzzles -w @grid-games/new-game
   ```

2. **Assign puzzles** from pool to monthly files:
   ```bash
   npm run assign-puzzles -w @grid-games/new-game
   ```

3. **Game loads** puzzles from monthly files at runtime

## Step 8: Add to Landing Page

Edit `apps/web/src/app/page.tsx`:
```tsx
const games: GameCard[] = [
  // ... existing games
  {
    id: 'new-game',
    name: 'New Game',
    description: 'Description here.',
    accentColor: '#your-color',
    emoji: '🎮',
    href: '/new-game',
  },
];
```

## Step 9: Add to Config Package (Optional)

If the theme should be programmatically accessible, add to `packages/config/src/theme.ts`:
```tsx
export const newGameTheme: GameTheme = {
  accent: '#your-color',
  accentForeground: '#text-color',
  // ...
};
```

## Step 10: Deploy to Vercel

### 10a. Deploy the new game app

1. Go to https://vercel.com/new
2. Import the `grid-games` GitHub repo
3. Set **Root Directory** to `apps/new-game`
4. Add Environment Variable: `NEXT_PUBLIC_BASE_PATH` = `/new-game`
5. Deploy and note the URL (e.g., `grid-games-new-game.vercel.app`)
6. Verify it works at `https://grid-games-new-game.vercel.app/new-game`

### 10b. Enable Analytics in Vercel Dashboard

1. Go to Vercel Dashboard → Your new game project → Analytics tab
2. Click "Enable" for Web Analytics
3. Analytics will automatically track page views once deployed (no code changes needed)

### 10c. Add rewrite to the web app

Edit `apps/web/next.config.ts` and add rewrites for the new game:
```typescript
{
  source: '/new-game',
  destination: 'https://grid-games-new-game.vercel.app/new-game',
},
{
  source: '/new-game/:path*',
  destination: 'https://grid-games-new-game.vercel.app/new-game/:path*',
},
```

### 10d. Push and redeploy

```bash
git add .
git commit -m "Add new-game to deployment"
git push
```

The web app will automatically redeploy with the new rewrites.

---

## Checklist

- [ ] Package.json updated with unique name and port
- [ ] Layout.tsx metadata updated (title, description, icons)
- [ ] Layout.tsx includes `<Analytics />` component (copied from template)
- [ ] Theme CSS variables defined in globals.css
- [ ] Storage module created (`src/lib/storage.ts`) using `createArchiveStorage`
- [ ] Game config created in src/config.ts with `PUZZLE_BASE_DATE_STRING` and `PUZZLE_BASE_DATE`
- [ ] **Date parsing uses 'T00:00:00' suffix** (e.g., `new Date('2026-02-01T00:00:00')`)
- [ ] Game.tsx uses shared LandingScreen, NavBar, GameContainer, ResultsModal
- [ ] **State persistence verified:**
  - [ ] In-progress state saves/restores correctly
  - [ ] Completion state saves/restores correctly
  - [ ] `landingMode` uses state + useEffect (hydration safe)
  - [ ] All hooks defined before early returns
  - [ ] Loading screen shown while data loads
- [ ] **Pre-generated puzzle system:**
  - [ ] `puzzleLoader.ts` created to load from monthly files
  - [ ] `scripts/generatePuzzles.ts` created
  - [ ] `scripts/assignPuzzles.ts` created
  - [ ] `generate-puzzles` and `assign-puzzles` scripts in package.json
  - [ ] `public/puzzles/` directory structure created
  - [ ] Initial puzzles generated and assigned
- [ ] **Archive support:**
  - [ ] Archive page created at `src/app/archive/page.tsx`
  - [ ] ArchivePageContent component created
  - [ ] LandingScreen uses `archiveHref` prop
  - [ ] `hasArchive: true` set in GAMES config
- [ ] Added to landing page in apps/web
- [ ] **Deployed to Vercel:**
  - [ ] New game app deployed
  - [ ] **Analytics enabled in Vercel Dashboard** (Analytics tab → Enable)
  - [ ] Rewrites added to apps/web/next.config.ts
- [ ] Game-specific CLAUDE.md created in apps/new-game/
