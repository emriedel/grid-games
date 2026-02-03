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
| `LandingScreen` | Pre-game landing page (pass `gameId` for menu highlighting) |
| `NavBar` | Top navigation with hamburger menu (pass `gameId` to highlight current game) |
| `HamburgerMenu` | Slide-out game navigation menu |
| `GameContainer` | Game layout wrapper |
| `ToastProvider` / `useToast` | Toast notifications |
| `Skeleton` | Loading placeholders |
| `DebugPanel` | Fixed debug info panel (purple styling) |
| `DebugButton` | Debug action button (purple styling) |

```tsx
import { Modal, Button, LandingScreen, NavBar, GameContainer } from '@grid-games/ui';
```

### Game State Pattern

Games use: `landing` → `playing` → `finished`

### Share Utilities

```tsx
import { buildShareText, shareOrCopy, generateEmojiBar } from '@grid-games/shared';
```

### Daily Puzzle Generation

Use `seedrandom` with date string for deterministic puzzles:
```tsx
const rng = seedrandom(new Date().toISOString().split('T')[0]);
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
│   │   ├── dictionary.ts     # Trie-based word lookup
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
```

---

## Debug Mode

All games support debug mode via `?debug=true` query parameter. Debug mode:
- Bypasses localStorage saved state (start fresh every time)
- Shows a purple debug panel with:
  - Game-specific info (optimal moves, word counts, etc.)
  - "New Puzzle" button to regenerate with random puzzle

```
http://localhost:3001?debug=true
```

Use shared debug components:
```tsx
import { DebugPanel, DebugButton } from '@grid-games/ui';

{isDebug && (
  <DebugPanel>
    <div>Debug info here</div>
    <DebugButton onClick={handleNewPuzzle} />
  </DebugPanel>
)}
```

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
| `apps/[game]/src/app/globals.css` | Per-game theme variables |
| `apps/[game]/src/components/Game.tsx` | Main game component |
| `apps/web/next.config.ts` | Rewrites for game routing |
