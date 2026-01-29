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
```

## Key Files

| File | Purpose |
|------|---------|
| `src/components/Game.tsx` | Main game orchestrator |
| `src/components/Board.tsx` | Grid rendering with pieces and directional arrows |
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

### BFS Solver

State = positions of all 4 pieces. Explores all (piece, direction) combinations. Returns optimal move count and solution path.

---

## Puzzle Generation Algorithm

### Key Insights (Learned Through Iteration)

**Why backward generation fails:**
The original approach started from solved state and worked backward N moves. However, BFS finds the OPTIMAL forward path, which is often completely different and shorter than the backward path taken. This made it nearly impossible to guarantee solution length.

**Forward generation with quality scoring works better:**
1. Generate board structure (walls)
2. Place pieces randomly
3. Solve with BFS to get actual optimal solution
4. Score the solution for "interestingness"
5. Keep the best result, retry if not good enough

### What Makes a Good Board

1. **L-walls (6-8 total):** Create corner "traps" where pieces must bounce to enter
2. **Edge walls (1 per edge):** Single-segment walls perpendicular to board edge, in middle third
3. **L-wall placement:** Can be in rows/cols 1-6 (not on the very edge 0 or 7)
4. **Spacing rules:**
   - L-walls must not be adjacent to each other (1+ cell gap)
   - L-walls must not be adjacent to edge wall cells (place edge walls first, then check)
   - This allows L-walls near corners as long as they don't touch the specific edge walls
5. **Goal placement:** Always at the center of an L-wall (requires bouncing to reach)

### What Makes a Good Puzzle

1. **Solution length:** 7-12 moves optimal (not too easy, not frustrating)
2. **Multi-piece solutions:** Best puzzles require moving blockers to create "stepping stones"
3. **Piece interaction:** Solutions where you set up blockers first, then move target are most interesting
4. **Scoring formula:**
   - +10 per unique piece used in solution
   - +15 per blocker used (extra bonus for non-target pieces)
   - +2 per move in solution (up to 12)

### Performance Considerations

- BFS is expensive (explores entire state space)
- Limit total attempts (15 boards × 40 piece placements = 600 max)
- Add time limit (2 seconds) to prevent browser hangs
- Stop early if "great" puzzle found (3+ pieces, 8+ moves)
- Always have hand-crafted fallback layouts ready

### Configuration Constants

```typescript
MIN_OPTIMAL_SOLUTION = 7    // Reject puzzles solved in fewer moves
MAX_OPTIMAL_SOLUTION = 12   // Reject puzzles that are too hard
L_WALLS_TOTAL_MIN = 6       // Minimum L-walls on board
L_WALLS_TOTAL_MAX = 8       // Maximum L-walls on board
```

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
