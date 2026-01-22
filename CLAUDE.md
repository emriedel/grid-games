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
| `PageContainer` | Wrapping page content with consistent padding |
| `GameHeader` | Game title + score display |

**Import from the package:**
```tsx
import { Modal, Button } from '@grid-games/ui';
```

**When to add to shared UI:**
- Component is used in 2+ games
- Component has NO game-specific logic
- Component would need no `variant="dabble"` type props

**When to keep game-specific:**
- Component contains game logic
- Component is unique to one game's mechanics
- Component would need heavy customization per game

### 3. Share Format Consistency

All games should use the shared share utilities for consistent brand feel:

```tsx
import { buildShareText, shareOrCopy } from '@grid-games/shared';

const shareText = buildShareText({
  gameId: 'dabble',
  gameName: 'Dabble',
  puzzleId: puzzleDate,
  score: totalScore,
  emojiGrid: '🟨🟨🟨🟨🟨⬛⬛⬛⬛⬛',
  extraLines: ['5 words found'],
});

await shareOrCopy(shareText);
```

### 4. File Structure Conventions

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
│   │   └── ...
│   ├── lib/                # Game logic (pure functions preferred)
│   │   ├── dictionary.ts   # Word validation (Trie-based)
│   │   ├── gameLogic.ts    # Core game mechanics
│   │   └── puzzleGenerator.ts  # Daily puzzle generation
│   ├── types/
│   │   └── index.ts        # TypeScript interfaces
│   ├── constants/
│   │   └── gameConfig.ts   # Game configuration values
│   └── hooks/              # Custom React hooks
├── public/
│   └── dict/
│       └── words.txt       # Word dictionary
└── package.json
```

### 5. Daily Puzzle Generation

All games use seeded random generation based on the date:

```tsx
import seedrandom from 'seedrandom';

const dateString = new Date().toISOString().split('T')[0]; // "2026-01-22"
const rng = seedrandom(dateString);

// Use rng() instead of Math.random()
const randomValue = rng(); // Returns 0-1, same result for same date
```

This ensures all players get the same puzzle on the same day.

### 6. Dictionary Pattern

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
  --accent: #your-color;
  --accent-foreground: #text-on-accent;
  /* ... other tokens */
}
```

### Step 4: Add to Landing Page
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

### Step 5: Add to Config Package (Optional)
If the theme should be programmatically accessible, add to `packages/config/src/theme.ts`:
```tsx
export const newGameTheme: GameTheme = {
  accent: '#your-color',
  accentForeground: '#text-color',
  // ...
};
```

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
import { Modal } from '@grid-games/ui';
import { dabbleTheme } from '@grid-games/config';
import { shareOrCopy } from '@grid-games/shared';
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
- ✅ Dabble game (fully functional, copied from scrabble-game)
- ✅ Jumble game (fully functional, copied from jumble)
- ✅ Landing page (apps/web)
- ✅ Shared UI package (Modal, Button, PageContainer, GameHeader)
- ✅ Shared config package (theme system)
- ✅ Shared utilities package (share, date)
- ✅ All apps build successfully

### What's Not Yet Done
- 🔲 Games not yet migrated to use shared UI components (still using inline components)
- 🔲 Vercel deployment not configured
- 🔲 Git repo not initialized
- 🔲 Statistics/streak tracking not implemented

### Migration Opportunities
The shared packages exist but games haven't been refactored to use them yet. When modifying a game's modal or button, consider migrating to the shared component.

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `turbo.json` | Turborepo task definitions |
| `package.json` (root) | Workspace configuration |
| `packages/config/src/theme.ts` | Theme interface and game themes |
| `packages/ui/src/Modal.tsx` | Shared modal component |
| `packages/shared/src/share.ts` | Share utilities |
| `apps/web/src/app/page.tsx` | Landing page with game list |
| `apps/[game]/src/app/globals.css` | Per-game theme variables |
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
