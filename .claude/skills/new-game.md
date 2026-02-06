# Adding a New Game to Nerdcube Games

Use this skill when creating a new game for the Nerdcube Games monorepo.

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

## Step 3: Define Theme

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

## Step 4: Create Storage Module

Create `apps/new-game/src/lib/storage.ts`:
```tsx
import { getTodayDateString } from '@grid-games/shared';

const IN_PROGRESS_KEY = 'new-game-in-progress';
const COMPLETION_KEY = 'new-game-completion';

export interface InProgressState {
  date: string;
  // Add game-specific fields (e.g., board state, moves, timer)
}

export interface CompletionState {
  date: string;
  // Add fields needed for results display (e.g., score, solved status)
}

// SSR safety - always check before localStorage access
export function getInProgressState(): InProgressState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(IN_PROGRESS_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as InProgressState;
    // Only return if it's from today
    if (state.date !== getTodayDateString()) return null;
    return state;
  } catch { return null; }
}

export function saveInProgressState(state: InProgressState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(IN_PROGRESS_KEY, JSON.stringify(state));
}

export function clearInProgressState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(IN_PROGRESS_KEY);
}

export function getCompletionState(): CompletionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COMPLETION_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as CompletionState;
    if (state.date !== getTodayDateString()) return null;
    return state;
  } catch { return null; }
}

export function saveCompletionState(state: CompletionState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(COMPLETION_KEY, JSON.stringify(state));
  clearInProgressState(); // Clear in-progress on completion
}

export function hasCompletedToday(): boolean {
  return getCompletionState() !== null;
}

export function hasInProgressGame(): boolean {
  return getInProgressState() !== null;
}
```

## Step 5: Create Game Config

Create `apps/new-game/src/config.ts`:
```tsx
import { defineGameConfig } from '@grid-games/config';
import { formatDisplayDate, getTodayDateString, getPuzzleNumber } from '@grid-games/shared';

const PUZZLE_BASE_DATE = new Date('2026-01-01');

// Base path for assets (set via NEXT_PUBLIC_BASE_PATH on Vercel)
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const newGameConfig = defineGameConfig({
  id: 'new-game',
  name: 'New Game',
  icon: `${basePath}/icon.png`,
  description: 'Your game description.',
  theme: { /* your theme */ },
  getPuzzleInfo: () => ({
    number: getPuzzleNumber(PUZZLE_BASE_DATE),
    date: formatDisplayDate(getTodayDateString()),
  }),
});
```

## Step 6: Update Game.tsx Structure

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

## Step 6b: Add Archive Support (Optional)

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

## Step 7: Add to Landing Page

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

## Step 8: Add to Config Package (Optional)

If the theme should be programmatically accessible, add to `packages/config/src/theme.ts`:
```tsx
export const newGameTheme: GameTheme = {
  accent: '#your-color',
  accentForeground: '#text-color',
  // ...
};
```

## Step 9: Deploy to Vercel

### 9a. Deploy the new game app

1. Go to https://vercel.com/new
2. Import the `grid-games` GitHub repo
3. Set **Root Directory** to `apps/new-game`
4. Add Environment Variable: `NEXT_PUBLIC_BASE_PATH` = `/new-game`
5. Deploy and note the URL (e.g., `grid-games-new-game.vercel.app`)
6. Verify it works at `https://grid-games-new-game.vercel.app/new-game`

### 9b. Add rewrite to the web app

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

### 9c. Push and redeploy

```bash
git add .
git commit -m "Add new-game to deployment"
git push
```

The web app will automatically redeploy with the new rewrites.

---

## Checklist

- [ ] Package.json updated with unique name and port
- [ ] Theme CSS variables defined in globals.css
- [ ] Storage module created (`src/lib/storage.ts`)
- [ ] Game config created in src/config.ts
- [ ] Game.tsx uses shared LandingScreen, NavBar, GameContainer, ResultsModal
- [ ] **State persistence verified:**
  - [ ] In-progress state saves/restores correctly
  - [ ] Completion state saves/restores correctly
  - [ ] `landingMode` uses state + useEffect (hydration safe)
  - [ ] All hooks defined before early returns
  - [ ] Loading screen shown while data loads
- [ ] **Archive support (if applicable):**
  - [ ] Archive page created at `src/app/archive/page.tsx`
  - [ ] ArchivePageContent component created
  - [ ] LandingScreen uses `archiveHref` prop
  - [ ] `hasArchive: true` set in GAMES config
- [ ] Added to landing page in apps/web
- [ ] Deployed to Vercel
- [ ] Rewrites added to apps/web/next.config.ts
- [ ] Game-specific CLAUDE.md created in apps/new-game/
