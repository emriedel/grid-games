# The Grid - Development Guidelines

## Project Overview

**The Grid** is a collection of daily word puzzle games, similar to NYT Games. Each game is a separate Next.js app within a Turborepo monorepo, sharing common UI components, theme configuration, and utilities.

**Current Games:**
- **Dabble** - Scrabble-style tile placement game (amber accent)
- **Jumble** - Timed word search with path tracing (red/pink accent)

**Architecture:** Turborepo monorepo with shared packages for UI, config, and utilities.

---

## Development Patterns (CRITICAL)

### 1. Theme System - Prevent Color Drift

Each game has its own accent color, but ALL styling must use CSS custom properties defined in the theme system.

**DO THIS:**
```tsx
// Use CSS variables that reference the theme
<button className="bg-[var(--accent)] text-[var(--accent-foreground)]">
<div className="bg-[var(--tile-bg)] border-[var(--tile-border)]">
```

**DON'T DO THIS:**
```tsx
// Never hardcode colors directly
<button className="bg-amber-500 text-black">  // BAD
<div className="bg-[#f59e0b]">                 // BAD
```

**Theme tokens available (defined in each app's globals.css):**
- `--accent` - Primary game color
- `--accent-foreground` - Text on accent backgrounds
- `--background` - Page background (#0a0a0a)
- `--foreground` - Primary text (#ededed)
- `--muted` - Secondary text (#a1a1aa)
- `--border` - Border color (#27272a)
- `--tile-bg` - Tile background
- `--tile-bg-selected` - Selected tile background
- `--tile-border` - Tile border
- `--success`, `--warning`, `--danger` - Status colors

### 2. Shared UI Components

Before creating a new component, check if it exists in `packages/ui/`:

| Component | Use For |
|-----------|---------|
| `Modal` | Any overlay dialog (results, settings, how-to-play) |
| `Button` | Any clickable button (use variants: primary/secondary/ghost) |
| `LandingScreen` | Pre-game landing page with play button |
| `NavBar` | Top navigation during gameplay |
| `GameContainer` | Wrapper for game content with consistent layout |
| `ToastProvider` / `useToast` | Toast notifications |
| `Skeleton` / `SkeletonGrid` / `SkeletonText` | Loading placeholders |
| `useKeyboardShortcuts` | Keyboard shortcut handling |
| `PageContainer` | Wrapping page content with consistent padding |
| `GameHeader` | Game title + score display |

**Import from the package:**
```tsx
import { Modal, Button, LandingScreen, NavBar, GameContainer } from '@grid-games/ui';
import { ToastProvider, useToast } from '@grid-games/ui';
```

**When to add to shared UI:**
- Component is used in 2+ games
- Component has NO game-specific logic
- Component would need no `variant="dabble"` type props

**When to keep game-specific:**
- Component contains game logic
- Component is unique to one game's mechanics
- Component would need heavy customization per game

### 3. GameConfig Interface

Each game defines a configuration object for integration with shared components:

```tsx
// In src/config.ts
import { defineGameConfig, dabbleTheme } from '@grid-games/config';
import { formatDisplayDate, getTodayDateString, getPuzzleNumber } from '@grid-games/shared';

const PUZZLE_BASE_DATE = new Date('2026-01-01');

export const dabbleConfig = defineGameConfig({
  id: 'dabble',
  name: 'Dabble',
  emoji: '🔤',
  description: 'A daily Scrabble-style word puzzle.',
  theme: dabbleTheme,
  homeUrl: '/',
  getPuzzleInfo: () => {
    const dateStr = getTodayDateString();
    const puzzleNumber = getPuzzleNumber(PUZZLE_BASE_DATE);
    return { number: puzzleNumber, date: formatDisplayDate(dateStr) };
  },
});
```

### 4. Game State Pattern

Games use a three-state pattern: `landing` → `playing` → `finished`

```tsx
type GameState = 'landing' | 'playing' | 'finished';

// In Game.tsx
const [gameState, setGameState] = useState<GameState>('landing');

// Landing screen
if (gameState === 'landing') {
  return (
    <LandingScreen
      emoji={config.emoji}
      name={config.name}
      description={config.description}
      puzzleInfo={config.getPuzzleInfo()}
      onPlay={() => setGameState('playing')}
      onRules={() => setShowRulesModal(true)}
    />
  );
}

// Playing state
return (
  <GameContainer
    navBar={
      <NavBar
        title={config.name}
        subtitle={`#${puzzleNumber}`}
        homeUrl={config.homeUrl}
        onRulesClick={() => setShowRulesModal(true)}
        rightContent={<ScoreDisplay score={score} />}
      />
    }
  >
    {/* Game content */}
  </GameContainer>
);
```

### 5. Share Format Consistency

All games should use the shared share utilities for consistent brand feel:

```tsx
import { buildShareText, shareOrCopy, generateEmojiBar } from '@grid-games/shared';

const emojiGrid = generateEmojiBar(score, maxScore, {
  filledEmoji: '🟨',
  emptyEmoji: '⬛',
});

const shareText = buildShareText({
  gameId: 'dabble',
  gameName: 'Dabble',
  puzzleId: puzzleDate,
  score: totalScore,
  emojiGrid,
  extraLines: ['5 words found'],
  shareUrl: 'https://games.ericriedel.dev/dabble',
});

await shareOrCopy(shareText);
```

### 6. File Structure Conventions

Each game app follows this structure:
```
apps/[game]/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout with metadata
│   │   ├── page.tsx        # Main game page (wrap in Suspense if using useSearchParams)
│   │   └── globals.css     # Theme CSS variables
│   ├── components/         # Game-specific components
│   │   ├── Game.tsx        # Main game orchestrator
│   │   ├── HowToPlayModal.tsx  # Rules modal using shared Modal
│   │   └── ...
│   ├── lib/                # Game logic (pure functions preferred)
│   │   ├── dictionary.ts   # Word validation (Trie-based)
│   │   ├── gameLogic.ts    # Core game mechanics
│   │   └── puzzleGenerator.ts  # Daily puzzle generation
│   ├── types/
│   │   └── index.ts        # TypeScript interfaces
│   ├── constants/
│   │   └── gameConfig.ts   # Game configuration values
│   ├── hooks/              # Custom React hooks
│   └── config.ts           # GameConfig definition
├── public/
│   └── dict/
│       └── words.txt       # Word dictionary
└── package.json
```

### 7. Daily Puzzle Generation

All games use seeded random generation based on the date:

```tsx
import seedrandom from 'seedrandom';

const dateString = new Date().toISOString().split('T')[0]; // "2026-01-22"
const rng = seedrandom(dateString);

// Use rng() instead of Math.random()
const randomValue = rng(); // Returns 0-1, same result for same date
```

This ensures all players get the same puzzle on the same day.

### 8. Dictionary Pattern

Both games use a Trie data structure for O(k) word lookup:

```tsx
// In lib/dictionary.ts
class TrieNode { ... }

let dictionary: TrieNode | null = null;

export async function loadDictionary(): Promise<void> {
  const response = await fetch('/dict/words.txt');
  const text = await response.text();
  // Build trie from words...
}

export function isValidWord(word: string): boolean {
  // Traverse trie...
}
```

Dictionary is loaded once on game init and reused.

---

## Adding a New Game

### Step 1: Copy Template
```bash
cp -r apps/dabble apps/new-game
```

### Step 2: Update Package Identity
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

### Step 3: Define Theme
Edit `apps/new-game/src/app/globals.css`:
```css
:root {
  /* Base tokens */
  --background: #0a0a0a;
  --foreground: #ededed;
  --muted: #a1a1aa;
  --border: #27272a;

  /* Game theme - Your accent */
  --accent: #your-color;
  --accent-foreground: #text-on-accent;
  --accent-secondary: #secondary-color;

  /* Tile styling */
  --tile-bg: #your-tile-bg;
  --tile-bg-selected: #your-tile-selected;
  --tile-border: #your-tile-border;

  /* Status colors */
  --success: #22c55e;
  --warning: #eab308;
  --danger: #ef4444;
}
```

### Step 4: Create Game Config
Create `apps/new-game/src/config.ts`:
```tsx
import { defineGameConfig } from '@grid-games/config';
import { formatDisplayDate, getTodayDateString, getPuzzleNumber } from '@grid-games/shared';

const PUZZLE_BASE_DATE = new Date('2026-01-01');

export const newGameConfig = defineGameConfig({
  id: 'new-game',
  name: 'New Game',
  emoji: '🎮',
  description: 'Your game description.',
  theme: { /* your theme */ },
  homeUrl: '/',
  getPuzzleInfo: () => ({
    number: getPuzzleNumber(PUZZLE_BASE_DATE),
    date: formatDisplayDate(getTodayDateString()),
  }),
});
```

### Step 5: Update Game.tsx Structure
Use the shared components:
```tsx
import { LandingScreen, NavBar, GameContainer, Button, Modal } from '@grid-games/ui';
import { newGameConfig } from '@/config';

// Implement landing → playing → finished state machine
```

### Step 6: Add to Landing Page
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

### Step 7: Add to Config Package (Optional)
If the theme should be programmatically accessible, add to `packages/config/src/theme.ts`:
```tsx
export const newGameTheme: GameTheme = {
  accent: '#your-color',
  accentForeground: '#text-color',
  // ...
};
```

### Step 8: Deploy to Vercel

**8a. Deploy the new game app:**
1. Go to https://vercel.com/new
2. Import the `grid-games` GitHub repo
3. Set **Root Directory** to `apps/new-game`
4. Add Environment Variable: `NEXT_PUBLIC_BASE_PATH` = `/new-game`
5. Deploy and note the URL (e.g., `grid-games-new-game.vercel.app`)
6. Verify it works at `https://grid-games-new-game.vercel.app/new-game`

**8b. Add rewrite to the web app:**
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

**8c. Push and redeploy:**
```bash
git add .
git commit -m "Add new-game to deployment"
git push
```
The web app will automatically redeploy with the new rewrites.

---

## Common Gotchas

### useSearchParams Requires Suspense
If a component uses `useSearchParams()`, wrap it in Suspense:
```tsx
// In page.tsx
import { Suspense } from 'react';
import { Game } from '@/components/Game';

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Game />
    </Suspense>
  );
}
```

### Workspace Package Imports
Import shared packages with the workspace name:
```tsx
import { Modal, LandingScreen, NavBar } from '@grid-games/ui';
import { dabbleTheme, defineGameConfig } from '@grid-games/config';
import { shareOrCopy, buildShareText } from '@grid-games/shared';
```

### Running Single App
Use `--filter` for faster dev when working on one game:
```bash
npx turbo dev --filter=@grid-games/dabble
```

### Adding Dependencies to a Specific App
```bash
npm install some-package -w @grid-games/dabble
```

---

## Current State (January 2026)

### What's Complete
- ✅ Turborepo monorepo structure
- ✅ Dabble game (fully functional with shared UI)
- ✅ Jumble game (fully functional with shared UI)
- ✅ Landing page (apps/web)
- ✅ Shared UI package (Modal, Button, LandingScreen, NavBar, GameContainer, Toast, Skeleton)
- ✅ Shared config package (theme system, GameConfig interface)
- ✅ Shared utilities package (share, date)
- ✅ Games migrated to use shared components
- ✅ All apps build successfully
- ✅ Git repo initialized
- ✅ Vercel deployment configured (multi-zone)
- ✅ Custom domain: games.ericriedel.dev

### Deployment URLs
- **Landing Page:** https://games.ericriedel.dev
- **Dabble:** https://games.ericriedel.dev/dabble (hosted at grid-games-dabble.vercel.app)
- **Jumble:** https://games.ericriedel.dev/jumble (hosted at grid-games-jumble.vercel.app)

### What's Not Yet Done
- 🔲 Statistics/streak tracking not implemented for Dabble

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `turbo.json` | Turborepo task definitions |
| `package.json` (root) | Workspace configuration |
| `packages/config/src/theme.ts` | Theme interface and game themes |
| `packages/config/src/gameConfig.ts` | GameConfig interface |
| `packages/ui/src/Modal.tsx` | Shared modal component |
| `packages/ui/src/LandingScreen.tsx` | Pre-game landing screen |
| `packages/ui/src/NavBar.tsx` | Navigation bar for gameplay |
| `packages/ui/src/GameContainer.tsx` | Game layout wrapper |
| `packages/ui/src/Toast.tsx` | Toast notification system |
| `packages/ui/src/Skeleton.tsx` | Loading placeholder components |
| `packages/shared/src/share.ts` | Share utilities |
| `packages/shared/src/date.ts` | Date utilities |
| `apps/web/src/app/page.tsx` | Landing page with game list |
| `apps/[game]/src/app/globals.css` | Per-game theme variables |
| `apps/[game]/src/config.ts` | Game configuration |
| `apps/[game]/src/components/Game.tsx` | Main game component |
| `apps/[game]/src/lib/puzzleGenerator.ts` | Daily puzzle generation |

---

## Commands Quick Reference

```bash
# Development
npm run dev                              # All apps
npx turbo dev --filter=@grid-games/dabble  # Single app

# Build
npm run build                            # All apps

# Type checking
npm run type-check

# Add dependency to specific app
npm install <package> -w @grid-games/dabble

# Clean everything
npm run clean
```
