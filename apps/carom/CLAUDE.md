# Carom - Development Guide

## Overview

**Carom** is a Ricochet Robots-style sliding puzzle game. Pieces slide until they hit walls, edges, or other pieces. The goal is to navigate the target piece to the goal square.

**Accent Color:** Amber (#f59e0b)
**Port:** 3004

## Game Rules

- **Board:** 8x8 grid with internal walls
- **Pieces:** 1 amber target (circle) + 3 slate-blue blockers (circles)
- **Movement:** Pieces slide until blocked by wall, edge, or piece
- **Goal:** Get the target piece to the goal square (marked with star)
- **Scoring:** Star rating based on moves vs optimal (3★ optimal/+1, 2★ +2-4, 1★ +5+)

## Commands

```bash
# Run dev server
npx turbo dev --filter=@grid-games/carom

# Type check
npx turbo type-check --filter=@grid-games/carom

# Build
npx turbo build --filter=@grid-games/carom

# Generate more puzzles (edit TARGET_PUZZLES in script first)
npm run generate-puzzles -w @grid-games/carom
```

## Key Files

| File | Purpose |
|------|---------|
| `src/components/Game.tsx` | Main game orchestrator |
| `src/components/Board.tsx` | Grid rendering with pieces and directional arrows |
| `src/lib/gameLogic.ts` | Move simulation, collision detection |
| `src/lib/solver.ts` | BFS solver for optimal solution |
| `src/lib/puzzleGenerator.ts` | Loads pre-computed puzzles from JSON |
| `src/types/index.ts` | Type definitions |
| `public/puzzles.json` | Pre-computed puzzle pool |
| `scripts/generatePuzzles.ts` | Offline puzzle generation script |

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

### Pre-computed Puzzles

Puzzles are **pre-generated offline** and stored in `public/puzzles.json`. This eliminates runtime computation and ensures instant puzzle loading.

**Launch date:** January 30, 2026 (defined in `src/config.ts` as `CAROM_LAUNCH_DATE`)

### Generating More Puzzles

```bash
# Edit TARGET_PUZZLES in scripts/generatePuzzles.ts, then:
npm run generate-puzzles -w @grid-games/carom
```

The script generates puzzles with:
- 10-20 optimal moves
- Must use 2+ pieces in solution
- Quality scoring favors multi-piece solutions

### Puzzle Quality Criteria

1. **Solution length:** 10-20 moves optimal
2. **Multi-piece solutions:** Must require moving blockers
3. **Piece interaction:** Best puzzles require setting up blockers before moving target

### Board Structure

- **L-walls (6-8):** Create corner "traps" requiring bounces
- **Edge walls (1 per edge):** Single-segment walls in middle third
- **Goal placement:** Always at center of an L-wall

---

## Theme Variables

```css
--accent: #f59e0b;           /* Amber primary */
--piece-target: #f59e0b;     /* Target piece (amber) */
--piece-blocker: #64748b;    /* Blocker pieces (slate blue) */
--goal-bg: rgba(245, 158, 11, 0.2);
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
- Shows optimal move count in header
- Shows puzzle date
- Shows selected piece ID
- Purple "New Puzzle" button to regenerate random puzzles

## UI Components

- **Pieces:** Circular (rounded-full), target is amber, blockers are slate-blue
- **Directional arrows:** Appear on edges of selected piece, only for valid moves
- **Goal star:** Large (w-8 h-8), amber, 60% opacity
- **Walls:** White (#ffffff) 3px borders with corner fills where walls meet
- **Move counter:** Compact display in NavBar header
