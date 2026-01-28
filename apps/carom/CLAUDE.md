# Carom - Development Guide

## Overview

**Carom** is a Ricochet Robots-style sliding puzzle game. Pieces slide until they hit walls, edges, or other pieces. The goal is to navigate the target piece to the goal square.

**Accent Color:** Amber (#f59e0b)
**Port:** 3004

## Game Rules

- **Board:** 8x8 grid with internal walls
- **Pieces:** 1 amber target + 3 gray blockers
- **Movement:** Pieces slide until blocked by wall, edge, or piece
- **Goal:** Get the target piece to the goal square
- **Scoring:** Star rating based on moves vs optimal (3★ optimal/+1, 2★ +2-4, 1★ +5+)

## Commands

```bash
# Run dev server
npx turbo dev --filter=@grid-games/carom

# Type check
npx turbo type-check --filter=@grid-games/carom

# Build
npx turbo build --filter=@grid-games/carom
```

## Key Files

| File | Purpose |
|------|---------|
| `src/components/Game.tsx` | Main game orchestrator |
| `src/components/Board.tsx` | Grid rendering with pieces |
| `src/lib/gameLogic.ts` | Move simulation, collision detection |
| `src/lib/solver.ts` | BFS solver for optimal solution |
| `src/lib/puzzleGenerator.ts` | Daily puzzle generation |
| `src/types/index.ts` | Type definitions |

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

### Puzzle Generation

1. Generate L-shaped wall clusters + single walls
2. Place pieces (1 target, 3 blockers)
3. Place goal (not on piece, not in corner)
4. Validate with BFS solver (must be 5-10 moves)
5. Retry with different seed if invalid

### BFS Solver

State = positions of all 4 pieces. Explores all (piece, direction) combinations. Returns optimal move count.

## Theme Variables

```css
--accent: #f59e0b;           /* Amber primary */
--piece-target: #f59e0b;     /* Target piece */
--piece-blocker: #71717a;    /* Blocker pieces */
--goal-bg: rgba(245, 158, 11, 0.2);
--wall-color: #f59e0b;       /* Wall borders */
```

## Controls

- **Tap:** Select piece
- **Arrows/WASD:** Move selected piece
- **Swipe:** Move selected piece (mobile)
- **Reset:** Return to initial state

## Debug Mode

Add `?debug=true` to URL:
- Shows optimal move count
- Shows puzzle date
- Shows selected piece ID
