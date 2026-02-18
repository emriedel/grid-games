# Tessera - Daily Pentomino Puzzle Game

Part of **Nerdcube Games** monorepo. Uses shared packages: `@grid-games/ui`, `@grid-games/config`, `@grid-games/shared`.

## Project Overview

Tessera is a daily pentomino puzzle game where players fill a target shape using 5-8 pentomino pieces. Each pentomino covers exactly 5 squares.

- **Accent Color:** Emerald Green (#0da678)
- **Dev Port:** 3006
- **Package Name:** `@grid-games/tessera`

**Theme:** Always use CSS variables, never hardcode colors:
```tsx
<button className="bg-[var(--accent)]">  // Good
<button className="bg-emerald-600">      // Bad
```

## Quick Start

```bash
# From monorepo root
npx turbo dev --filter=@grid-games/tessera

# Or run all apps
npm run dev
```

Then open http://localhost:3006

## Game Rules

### Core Gameplay
1. Each puzzle shows a target shape with dead cells (holes/edges)
2. Players receive 5-8 pentomino pieces that exactly fill the shape
3. Each pentomino covers exactly 5 squares
4. Pieces can be rotated (90° increments) but NOT flipped
5. Goal: Fill all playable cells with the given pieces

### Controls
- **Tap piece in tray** - Select it (highlighted with ring)
- **Tap same piece again** - Rotate 90° clockwise
- **Hover over board** - See preview of where piece will be placed (60% opacity)
- **Tap board cell** - Place selected piece (clicked cell becomes part of the piece)
- **Tap placed piece** - Remove it back to tray
- **Clear All button** - Remove all pieces from board

### The 12 Pentominoes
Named after letters they resemble:
- F, I, L, N, P, T, U, V, W, X, Y, Z
- Each covers exactly 5 squares
- All 12 together cover 60 squares

## File Structure

```
src/
├── app/
│   ├── layout.tsx       # Root layout with metadata
│   ├── page.tsx         # Main game page (wraps Game in Suspense)
│   ├── Providers.tsx    # ToastProvider + BugReporterProvider
│   ├── archive/page.tsx # Archive page
│   ├── debug/page.tsx   # Debug page (localhost only)
│   └── globals.css      # Theme CSS variables (green accent, piece colors)
├── components/
│   ├── Game.tsx              # Main game orchestrator
│   ├── Board.tsx             # Grid of cells with placed pieces + hover preview
│   ├── Cell.tsx              # Individual board cell
│   ├── PieceTray.tsx         # Available pieces display
│   ├── PiecePreview.tsx      # Mini pentomino preview (5x5 grid)
│   ├── HowToPlayModal.tsx
│   ├── ArchivePageContent.tsx    # Archive page client component
│   └── DebugPageContent.tsx      # Debug page client component (localhost only)
├── lib/
│   ├── gameLogic.ts     # Placement validation, collision detection
│   ├── puzzleLoader.ts  # Load puzzles from monthly files
│   └── storage.ts       # LocalStorage persistence
├── types/
│   └── index.ts         # TypeScript interfaces
├── constants/
│   └── pentominoes.ts   # 12 pentomino definitions with rotations
├── hooks/
│   └── useGameState.ts  # Game state reducer
└── config.ts            # Game config export
scripts/
├── solver.ts            # Backtracking solver with MCV heuristic
├── generatePuzzles.ts   # Generate puzzles into pool.json
└── assignPuzzles.ts     # Assign from pool to monthly files
public/
└── puzzles/
    ├── pool.json        # Unassigned puzzles
    └── assigned/        # Monthly assigned puzzles
```

## Key Types

### Pentomino System

```typescript
// Rotation: 0=0°, 1=90°, 2=180°, 3=270°
type Rotation = 0 | 1 | 2 | 3;

// Cell offset from piece origin
interface CellOffset { row: number; col: number; }

// Pre-computed rotations for each pentomino
interface PentominoDefinition {
  id: PentominoId;           // 'F' | 'I' | 'L' | ... | 'Z'
  name: string;
  color: string;             // CSS variable reference
  rotations: CellOffset[][]; // 4 rotations, 5 cells each
}
```

### Board & Puzzle

```typescript
type CellState = 'playable' | 'dead' | 'filled';

interface BoardCell {
  state: CellState;
  pentominoId?: PentominoId; // If filled
}

interface Puzzle {
  id: string;
  shape: boolean[][];        // true = playable, false = dead
  shapeName: string;         // "Heart", "Star", etc.
  pentominoIds: PentominoId[]; // 5-8 pieces for this puzzle
  solution?: PlacedPiece[];  // Pre-computed solution
}
```

### Placed Piece

```typescript
interface PlacedPiece {
  pentominoId: PentominoId;
  position: Position;        // Top-left of bounding box
  rotation: Rotation;
}
```

## CSS Variables (Piece Colors)

```css
--piece-F: #ef4444;  /* Red */
--piece-I: #3b82f6;  /* Blue */
--piece-L: #f59e0b;  /* Amber */
--piece-N: #8b5cf6;  /* Purple */
--piece-P: #ec4899;  /* Pink */
--piece-T: #14b8a6;  /* Teal */
--piece-U: #f97316;  /* Orange */
--piece-V: #06b6d4;  /* Cyan */
--piece-W: #84cc16;  /* Lime */
--piece-X: #a855f7;  /* Violet */
--piece-Y: #eab308;  /* Yellow */
--piece-Z: #22c55e;  /* Green */
```

## State Management

### GameState

```typescript
interface GameState {
  phase: 'landing' | 'playing' | 'finished';
  puzzle: Puzzle | null;
  board: Board | null;
  availablePieces: PentominoId[];  // Pieces in tray
  placedPieces: PlacedPiece[];     // Pieces on board
  selectedPieceId: PentominoId | null;
  selectedRotation: Rotation;
  won: boolean;
}
```

### Key Actions

- `LOAD_PUZZLE` - Initialize with puzzle data
- `START_GAME` - Transition to playing phase
- `SELECT_PIECE` - Select piece (or rotate if already selected)
- `ROTATE_PIECE` - Rotate selected piece 90°
- `PLACE_PIECE` - Place selected piece at position
- `REMOVE_PIECE` - Remove piece from board back to tray
- `CLEAR_ALL` - Remove all pieces
- `RESTORE_STATE` - Restore from saved state

## Placement Logic

### Collision Detection

```typescript
function canPlacePiece(
  board: Board,
  pentominoId: PentominoId,
  position: Position,
  rotation: Rotation
): boolean {
  const cells = getPieceCells(pentominoId, position, rotation);
  for (const cell of cells) {
    // Check bounds
    if (cell.row < 0 || cell.row >= board.rows) return false;
    if (cell.col < 0 || cell.col >= board.cols) return false;
    // Check cell state
    const boardCell = board.cells[cell.row][cell.col];
    if (boardCell.state !== 'playable') return false;
  }
  return true;
}
```

### Win Condition

```typescript
function isPuzzleComplete(board: Board): boolean {
  // All playable cells must be filled
  for (const row of board.cells) {
    for (const cell of row) {
      if (cell.state === 'playable') return false;
    }
  }
  return true;
}
```

### Hover Preview & Click-to-Place

The board shows a semi-transparent preview when hovering with a selected piece. The key insight: **the clicked/hovered cell should be part of the placed piece**, not just the anchor point.

```typescript
// Find anchor position so that clickedPosition is covered by the piece
function findAnchorForClickedCell(
  board: Board,
  pentominoId: PentominoId,
  clickedPosition: Position,
  rotation: Rotation
): Position | null {
  const offsets = getPentominoCells(pentominoId, rotation);

  // Try each cell of the piece as the "clicked" cell
  for (const offset of offsets) {
    const anchor = {
      row: clickedPosition.row - offset.row,
      col: clickedPosition.col - offset.col,
    };
    if (canPlacePiece(board, pentominoId, anchor, rotation)) {
      return anchor;
    }
  }
  return null;
}
```

This ensures intuitive placement: wherever you click on the board, if that cell can be covered by the piece, the piece will be placed there.

## Archive Page

Browse and replay past puzzles at `/archive`:
- Shows all puzzles from launch date to yesterday
- Completion status shown for each puzzle
- Click any puzzle to play/view it
- Uses shared `ArchivePage` component from `@grid-games/ui`

## Storage Pattern

Uses `createArchiveStorage` from `@grid-games/shared`:

**Storage Key Format:** `tessera-{puzzleNumber}-{puzzleId}`

**Puzzle State Interface:**
```typescript
interface TesseraPuzzleState {
  puzzleNumber: number;
  puzzleId?: string;
  status: 'in-progress' | 'completed';
  data: {
    placedPieces: PlacedPiece[];
    pieceRotations: Record<string, Rotation>;
  };
}
```

## Debug Mode

Add `?debug=true` to URL:
- Bypasses localStorage saved state
- Console output:
  - `[Tessera Debug] Puzzle #X`
  - `[Tessera Debug] Shape: X`
  - `[Tessera Debug] Pieces: F, I, L, ...`

## Puzzle Generation

### Commands

```bash
# Generate new puzzles into pool
npx tsx scripts/generatePuzzles.ts           # 50 puzzles (default)
npx tsx scripts/generatePuzzles.ts 100       # 100 puzzles

# Assign puzzles from pool to monthly files
npx tsx scripts/assignPuzzles.ts             # Assign up to today
npx tsx scripts/assignPuzzles.ts 100         # Ensure puzzles 1-100 are assigned
```

### Architecture

```
public/puzzles/
├── pool.json              # UNASSIGNED puzzles (safe to regenerate)
└── assigned/
    ├── 2026-03.json       # Full puzzle data for Mar 2026 (stable)
    └── ...                # One file per month
```

**Pool Puzzle Format:**
```typescript
interface PoolPuzzle {
  id: string;              // Unique ID (16 hex chars)
  shape: boolean[][];      // Grid shape (true = playable)
  shapeName: string;       // e.g., "6x5 Rectangle"
  pentominoIds: PentominoId[];  // Pieces for this puzzle
  solution: PlacedPiece[]; // Pre-computed solution
}
```

**Monthly File Format:**
```typescript
interface MonthlyAssignedFile {
  gameId: "tessera";
  baseDate: string;        // First day of month "YYYY-MM-01"
  puzzles: Record<string, PoolPuzzle>;  // Keyed by puzzle number
}
```

### Solver Algorithm (scripts/solver.ts)

Backtracking solver with Most Constrained Variable heuristic:
1. Input: shape (boolean[][]) and piece set (PentominoId[])
2. Find all valid placements for each piece at each rotation
3. Pick piece with fewest valid placements (MCV)
4. Try each placement, backtrack if stuck
5. Prune when:
   - Remaining cells ≠ remaining pieces × 5
   - Any region has size not divisible by 5 (island detection)

### Puzzle Quality Criteria

1. Cell count must be multiple of 5
2. Shape must be solvable with chosen pieces
3. Available shapes: rectangles, staircases, frames
4. Piece count: 3-12 pieces per puzzle

## Dependencies

- `@dnd-kit/core` - Drag and drop (for future drag-to-place)
- `seedrandom` - Deterministic random generation
- Shared packages: `@grid-games/config`, `@grid-games/ui`, `@grid-games/shared`

### Debug Page (Puzzle Browser)

Visit `http://localhost:3006/debug` to browse unpublished puzzles:
- Shows pool puzzles (unassigned) and future assigned puzzles
- Displays puzzle info: shape name, piece count, dimensions
- "Play This Puzzle" button navigates to `/?debug=true&poolId=X` or `/?puzzle=X&debug=true`
- Only available on localhost

## Future Enhancements

- [ ] Drag-and-drop placement (with @dnd-kit)
- [ ] Puzzle creator tool (/admin/create)
- [ ] More interesting shapes (hearts, letters, animals)
- [ ] Difficulty ratings based on solution complexity
- [ ] Timer/speed challenge mode
- [ ] Animation for piece placement/removal
