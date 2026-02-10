# Nerdcube Games - Development Guidelines

## Project Overview

**Nerdcube Games** is a collection of daily word puzzle games (similar to NYT Games). Turborepo monorepo with shared packages for UI, config, and utilities.

**Games:** Dabble (amber), Jumble (red/pink) | **Domain:** nerdcube.games

> **Game-specific work?** Each app has its own `CLAUDE.md` with detailed docs. Consider working from `apps/[game]/` directly.
>
> **Adding a new game?** Use `/new-game` skill for step-by-step guide.

---

## Critical Patterns

### Theme System - Use CSS Variables

**Always use CSS variables, never hardcode colors:**
```tsx
// DO THIS
<button className="bg-[var(--accent)] text-[var(--accent-foreground)]">

// NOT THIS
<button className="bg-amber-500 text-black">  // BAD
```

**Available tokens** (defined in each app's `globals.css`):
- `--accent`, `--accent-foreground` - Game's primary color
- `--background` (#0a0a0a), `--foreground` (#ededed), `--muted`, `--border`
- `--tile-bg`, `--tile-bg-selected`, `--tile-border`
- `--success`, `--warning`, `--danger`

### Shared UI Components

Check `packages/ui/` before creating components:

| Component | Use For |
|-----------|---------|
| `Modal` | Dialogs (results, settings, how-to-play) |
| `Button` | Buttons (variants: primary/secondary/ghost) |
| `LandingScreen` | Pre-game landing page (pass `gameId` for menu highlighting, `archiveHref` for archive link) |
| `NavBar` | Top navigation with hamburger menu (pass `gameId` to highlight current game) |
| `HamburgerMenu` | Slide-out game navigation menu (auto-expands current game) |
| `GameContainer` | Game layout wrapper |
| `ResultsModal` | End-game results with share button and "try other games" CTA |
| `ArchivePage` | Full-page archive listing for past puzzles |
| `ToastProvider` / `useToast` | Toast notifications |
| `Skeleton` | Loading placeholders |

```tsx
import { Modal, Button, LandingScreen, NavBar, GameContainer } from '@grid-games/ui';
```

### Game State Pattern

Games use: `landing` → `playing` → `finished`

### Game State Persistence

**LandingScreen Modes:**
```tsx
<LandingScreen
  mode={landingMode}  // 'fresh' | 'in-progress' | 'completed'
  onPlay={handlePlay}
  onResume={handleResume}
  onSeeResults={handleSeeResults}
  archiveHref="/archive"  // Link to archive page (relative to basePath)
/>
```

**Critical Patterns:**

1. **Hydration Safety** - Use state + useEffect, not computed values:
```tsx
// BAD - causes hydration mismatch (server has no localStorage)
const landingMode = hasCompletedToday() ? 'completed' : 'fresh';

// GOOD - defer to client-side
const [landingMode, setLandingMode] = useState<'fresh' | 'in-progress' | 'completed'>('fresh');
useEffect(() => {
  if (hasCompletedToday()) setLandingMode('completed');
  else if (hasInProgressGame()) setLandingMode('in-progress');
}, []);
```

2. **Hook Order** - All hooks MUST be defined BEFORE any early returns:
```tsx
// Define all hooks first
const [loading, setLoading] = useState(true);
const handlePlay = useCallback(() => {...}, []);
const handleResume = useCallback(() => {...}, []);

// THEN early returns
if (loading) return <Loading />;
```

3. **Loading States** - Show loading screen while async data loads

**Storage Pattern:**
- In-progress state: saves during gameplay, cleared on completion
- Completion state: includes enough data to reconstruct results view
- Date-isolated: storage functions only return state for today's puzzle
- SSR safety: check `typeof window !== 'undefined'` before localStorage access

### Share Utilities

```tsx
import { buildShareText, shareOrCopy, generateEmojiBar } from '@grid-games/shared';
```

### Dictionary (Word Games)

Word games use the shared `@grid-games/dictionary` package for word validation:

```tsx
import { loadDictionary, isValidWord, isValidPrefix, getAllWords } from '@grid-games/dictionary';

// Load dictionary at game start (with optional min word length)
await loadDictionary({ minWordLength: 3 });

// Check words
isValidWord('HELLO');    // true
isValidPrefix('HEL');    // true (could lead to valid words)
getAllWords();           // Set<string> of all words
```

- **Dictionary**: Collins Scrabble Words (2019) - 279,495 words
- **Storage**: Each app has `public/dict/words.txt` (served statically)
- **Implementation**: Trie data structure for O(k) lookups where k = word length

### Daily Puzzle Generation

Use `seedrandom` with date string for deterministic puzzles:
```tsx
const rng = seedrandom(new Date().toISOString().split('T')[0]);
```

### Pre-Generated Puzzles (Archive-Enabled Games)

Games with archive support (Dabble, Carom) use a pool/assigned architecture:

```
public/puzzles/
├── pool.json              # UNASSIGNED puzzles only (safe to regenerate)
└── assigned/
    ├── 2026-02.json       # Full puzzle data for Feb 2026 (stable)
    ├── 2026-03.json       # Full puzzle data for Mar 2026
    └── ...
```

**Workflow:**
1. Generate puzzles into `pool.json` (can regenerate with improved algorithms)
2. Run assignment script to MOVE puzzles from pool to `assigned/{YYYY-MM}.json`
3. Runtime loads from monthly files with caching

**Monthly File Format:**
```typescript
interface MonthlyAssignedFile {
  gameId: string;           // e.g., "dabble", "carom"
  baseDate: string;         // First day of month "YYYY-MM-01"
  puzzles: Record<string, PuzzleData>;  // Keyed by puzzle number
}
```

**Storage Pattern (Puzzle-Number Keyed):**
```typescript
// Key format: {gameId}-{puzzleNumber}
interface PuzzleState {
  puzzleNumber: number;
  status: 'in-progress' | 'completed';
  data: GameSpecificData;
}
```

**Commands:**
```bash
# Generate puzzles into pool
npm run generate-puzzles -w @grid-games/[game]

# Assign from pool to monthly files
npm run assign-puzzles -w @grid-games/[game]
```

---

## File Structure

```
apps/[game]/
├── src/
│   ├── app/
│   │   ├── layout.tsx, page.tsx, globals.css
│   ├── components/
│   │   ├── Game.tsx          # Main orchestrator
│   │   └── ...
│   ├── lib/
│   │   ├── dictionary.ts     # Re-exports from @grid-games/dictionary
│   │   ├── gameLogic.ts
│   │   └── puzzleGenerator.ts
│   ├── types/, constants/, hooks/
│   └── config.ts             # GameConfig
├── public/dict/words.txt
└── CLAUDE.md                 # Game-specific docs
```

---

## Common Gotchas

**useSearchParams needs Suspense:**
```tsx
<Suspense fallback={<Loading />}><Game /></Suspense>
```

**Workspace imports:**
```tsx
import { Modal } from '@grid-games/ui';
import { dabbleTheme } from '@grid-games/config';
import { shareOrCopy } from '@grid-games/shared';
import { loadDictionary, isValidWord } from '@grid-games/dictionary';
```

---

## Debug Mode

All games support debug mode via `?debug=true` query parameter. Debug mode:
- Bypasses localStorage saved state (start fresh every time)
- Outputs debug info to browser console only (no on-screen panel)

```
http://localhost:3001?debug=true
```

Console output includes game-specific info like puzzle number, optimal moves, thresholds, etc.

### Debug Page (Puzzle Browser)

Each game has a `/debug` page for browsing unpublished puzzles (localhost only):

```
http://localhost:3001/debug    # Dabble puzzle browser
http://localhost:3004/debug    # Carom puzzle browser
```

Features:
- Browse pool puzzles (unassigned) and future assigned puzzles
- View puzzle details (optimal moves, solution path, thresholds, etc.)
- "Play This Puzzle" button to test any puzzle
- Only available on localhost - shows "not available" on production

---

## Commands

```bash
npm run dev                                  # All apps
npx turbo dev --filter=@grid-games/dabble    # Single app
npm run build                                # Build all
npm install <pkg> -w @grid-games/dabble      # Add dep to specific app
```

---

## Key Files

| File | Purpose |
|------|---------|
| `packages/ui/src/` | Shared UI components |
| `packages/config/src/theme.ts` | Theme interface |
| `packages/shared/src/share.ts` | Share utilities |
| `packages/dictionary/src/` | Shared word dictionary (Trie + validation) |
| `apps/[game]/src/app/globals.css` | Per-game theme variables |
| `apps/[game]/src/components/Game.tsx` | Main game component |
| `apps/[game]/public/dict/words.txt` | Dictionary word list (Collins 2019) |
| `apps/web/next.config.ts` | Rewrites for game routing |
