# Carom - Development Guide

## Overview

**Carom** is a Ricochet Robots-style sliding puzzle game. Pieces slide until they hit walls, edges, or other pieces. The goal is to navigate the target piece to the goal square.

**Accent Color:** Amber (#f59e0b)
**Port:** 3004

## Game Rules

- **Board:** 8x8 grid with internal walls
- **Pieces:** 1 amber target + 3 steel blue blockers (rounded squares)
- **Movement:** Pieces slide until blocked by wall, edge, or piece
- **Goal:** Get the target piece to the goal square (marked with star)
- **Completion:** Track number of moves used to solve
- **Optimal Bonus:** 🏆 trophy earned when solving in optimal move count

## Commands

```bash
# Run dev server
npx turbo dev --filter=@grid-games/carom

# Type check
npx turbo type-check --filter=@grid-games/carom

# Build
npx turbo build --filter=@grid-games/carom

# Generate puzzles into pool
npm run generate-puzzles -w @grid-games/carom
npm run generate-puzzles -w @grid-games/carom -- 200  # Generate 200 puzzles

# Assign puzzles from pool to monthly files
npm run assign-puzzles -w @grid-games/carom
npm run assign-puzzles -w @grid-games/carom -- 100  # Ensure puzzles 1-100 assigned
```

## Key Files

| File | Purpose |
|------|---------|
| `src/components/Game.tsx` | Main game orchestrator (includes CaromResultsModal wrapper) |
| `src/components/Board.tsx` | Grid rendering with pieces and directional arrows |
| `src/components/HeaderMoveCounter.tsx` | Move counter with trophy display |
| `src/components/OptimalInfoModal.tsx` | Modal showing optimal move count |
| `src/components/ArchivePageContent.tsx` | Archive page with 🏆/✓ status |
| `src/lib/gameLogic.ts` | Move simulation, collision detection |
| `src/lib/solver.ts` | BFS solver for optimal solution |
| `src/lib/puzzleGenerator.ts` | Loads puzzles from monthly assigned files |
| `src/lib/storage.ts` | LocalStorage persistence with achievedOptimal tracking |
| `src/types/index.ts` | Type definitions |
| `public/puzzles/pool.json` | Unassigned puzzle pool |
| `public/puzzles/assigned/YYYY-MM.json` | Monthly assigned puzzles |
| `scripts/generatePuzzles.ts` | Offline puzzle generation script |
| `scripts/assignPuzzles.ts` | Assigns puzzles from pool to monthly files |

## Architecture

### Wall System

Walls are stored as bit flags per cell:
- `0b0001` = top wall
- `0b0010` = right wall
- `0b0100` = bottom wall
- `0b1000` = left wall

Adjacent cells share wall data for consistency.

### Move Simulation

```typescript
simulateSlide(board, pieces, pieceId, direction) → Position
```

Piece slides until:
1. Wall blocks exit from current cell
2. Board edge reached
3. Wall blocks entry to next cell
4. Another piece in the way

### BFS Solver

State = positions of all 4 pieces. Explores all (piece, direction) combinations. Returns optimal move count and solution path.

---

## Puzzle System

### Pool/Assigned Architecture

Uses a pool/assigned architecture for stable archives while allowing algorithm improvements:

```
public/puzzles/
├── pool.json              # Only UNASSIGNED puzzles (can be regenerated anytime)
└── assigned/
    ├── 2026-02.json       # Full puzzle data for Feb 2026 (stable, never change)
    ├── 2026-03.json       # Full puzzle data for Mar 2026
    └── ...
```

**pool.json** - Contains only unassigned puzzles. Safe to delete and regenerate with improved algorithms.

**assigned/{YYYY-MM}.json** - Contains full puzzle data for each month. Once assigned, puzzles are immutable to preserve archive history.

### Workflow

1. **Generate puzzles** into pool (can regenerate with improved algorithms anytime)
2. **Assign puzzles** to numbers - this MOVES puzzles from pool to assigned/ files
3. **Game fetches** puzzle by number from the appropriate monthly file

**Launch date:** February 1, 2026 (defined in `src/config.ts` as `CAROM_LAUNCH_DATE`)

### Generating More Puzzles

```bash
# Generate 200 puzzles into pool (default)
npm run generate-puzzles -w @grid-games/carom

# Generate specific number of puzzles
npm run generate-puzzles -w @grid-games/carom -- 100

# Assign from pool to monthly files
npm run assign-puzzles -w @grid-games/carom
```

The script generates puzzles with:
- 10-20 optimal moves
- Must use 2+ pieces in solution
- Quality scoring favors multi-piece solutions
- Early exit at 18 moves for harder puzzles

### Puzzle Quality Criteria

1. **Solution length:** 10-20 moves optimal
2. **Multi-piece solutions:** Must require moving blockers
3. **Piece interaction:** Best puzzles require setting up blockers before moving target

### Board Structure

- **L-walls (6-8):** Create corner "traps" requiring bounces
- **Edge walls (1 per edge):** Single-segment walls in middle third
- **Goal placement:** Always at center of an L-wall

---

## Optimal Move Bonus System

- **Trophy:** 🏆 displayed when user solves in optimal moves
- **Binary system:** Either achieved optimal or didn't
- **Display locations:**
  - Header move counter (after completion)
  - Results modal (prominently if achieved)
  - Archive page (🏆 for optimal, ✓ for completed)
- **Share text:** Includes 🏆 if optimal, no arrow emojis

---

## Theme Variables

```css
--accent: #f59e0b;           /* Amber primary */
--piece-target: #f59e0b;     /* Target piece (amber) */
--piece-blocker: #3b82f6;    /* Blocker pieces (steel blue) */
--goal-bg: rgba(245, 158, 11, 0.35);
--wall-color: #ffffff;       /* Wall borders (white for visibility) */
```

## Controls

- **Tap piece:** Select it
- **Tap arrow:** Move selected piece in that direction
- **Arrows/WASD:** Move selected piece (keyboard)
- **Swipe:** Move selected piece (mobile)
- **Reset:** Return to initial state

## Debug Mode

Add `?debug=true` to URL:
- Bypasses localStorage saved state (start fresh every time)
- Console-only output (no on-screen panel):
  - `[Carom Debug] Puzzle #X`
  - `[Carom Debug] Date: YYYY-MM-DD`
  - `[Carom Debug] Optimal moves: X`
  - `[Carom Debug] Optimal solution: target up -> blocker-0 right -> ...`

### Debug Page (Puzzle Browser)

Visit `http://localhost:3004/debug` to browse unpublished puzzles:
- Shows pool puzzles (unassigned) and future assigned puzzles
- Displays puzzle info: optimal moves, solution path, piece positions
- "Play This Puzzle" button navigates to `/?debug=true&poolId=X` or `/?puzzle=X&debug=true`
- Only available on localhost

### Solution Path

Puzzles now include pre-computed solution paths (`solutionPath` field):
```typescript
solutionPath?: { pieceId: string; direction: Direction }[];
```

This avoids re-computing the solution at runtime for debug output.

## UI Components

- **Pieces:** Rounded squares (rounded-lg), target is amber, blockers are steel blue
- **Directional arrows:** Appear on edges of selected piece, only for valid moves
- **Goal star:** Large (w-8 h-8), amber, 60% opacity
- **Walls:** White (#ffffff) 3px borders with corner fills where walls meet
- **Move counter:** Clickable in NavBar header, opens OptimalInfoModal
- **Trophy:** 🏆 appears next to move count when optimal achieved

## State Persistence

Storage module: `src/lib/storage.ts`

**Unified puzzle state** (keyed by puzzleId: `carom-{puzzleNumber}-{puzzleId}`):
```typescript
interface CaromPuzzleState {
  puzzleNumber: number;
  puzzleId?: string;            // Unique ID from pre-generated puzzle
  status: 'in-progress' | 'completed';
  data: {
    moveCount: number;
    moveHistory: Move[];
    pieces?: Piece[];           // In-progress only
    optimalMoves?: number;      // Completed only
    achievedOptimal?: boolean;  // Completed only: true if moveCount === optimalMoves
  };
}
```

**Helper functions:**
- `getPuzzleState(puzzleNumber, puzzleId?)` - Get state for specific puzzle version
- `savePuzzleState(puzzleNumber, state, puzzleId?)` - Save state with puzzleId
- `isPuzzleCompleted(puzzleNumber, puzzleId?)` - Check if completed
- `isPuzzleInProgress(puzzleNumber, puzzleId?)` - Check if in progress
- `didAchieveOptimal(puzzleNumber, puzzleId?)` - Check if achieved optimal
- `getSavedPuzzleId(puzzleNumber)` - Get the puzzleId of saved state (for archive)
- `getPuzzleIdsForRange(start, end)` - Load puzzleIds from monthly files (for archive)

**Archive Pattern:**
The archive page loads puzzleIds from monthly files, then verifies that saved completion
states match the current puzzleId. This ensures regenerated puzzles don't show stale
completion status. See `ArchivePageContent.tsx` for implementation.

**Auto-persistence:** Uses `useEffect` to watch state changes and auto-save.
