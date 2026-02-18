# Trio - Daily Set Puzzle Game

Part of **Nerdcube Games** monorepo. Uses shared packages: `@grid-games/ui`, `@grid-games/config`, `@grid-games/shared`.

## Project Overview

Trio is a daily Set-style puzzle game where players find "trios" - sets of 3 cards where each attribute (shape, color, pattern, count) is either ALL SAME or ALL DIFFERENT.

**Sequential Draw Mode:** Each puzzle has 5 rounds. Each round shows 9 cards with exactly ONE valid trio. Find it, and 3 new cards replace the found set.

- **Accent Color:** Cyan (#06b6d4)
- **Dev Port:** 3005
- **Package Name:** `@grid-games/trio`

**Theme:** Always use CSS variables, never hardcode colors:
```tsx
<button className="bg-[var(--accent)]">  // Good
<button className="bg-teal-500">         // Bad
```

## Quick Start

```bash
# From monorepo root
npx turbo dev --filter=@grid-games/trio

# Or run all apps
npm run dev
```

Then open http://localhost:3005

## Game Rules

### Core Gameplay (Sequential Draw Mode)
1. 9 cards displayed in a 3x3 grid
2. Each card has 4 attributes: shape, color, pattern, count
3. Exactly ONE valid trio exists each round
4. Tap 3 cards to select them, then press **Submit**
5. Valid trios are removed; 3 new cards replace them
6. Complete all 5 rounds

### Hints & Scoring
- **1 Hint per round:** Use hints (💡) to reveal a card from the valid trio
- Wrong guess: The correct trio is revealed and round advances (marked as "missed")
- No timer - take your time to find the correct trio
- **Perfect game:** Find all 5 trios without hints (earns 🏆)

### Card Attributes

Each attribute has exactly 3 values per puzzle:

- **Shape:** 3 shapes per puzzle (from pool: circle, triangle, square, diamond, pentagon, hexagon, star, cross, heart)
- **Color:** Ruby (#db2777), Sapphire (#3b82f6), Emerald (#10b981) - Jewel Tones palette
- **Pattern:** solid, outline, striped
- **Count:** 1, 2, or 3 shapes (displayed in triangle pattern for count=3)

**Shape Conflict Rules:** Similar shapes never appear together in the same puzzle:
- Pentagon and hexagon (too similar multi-sided polygons)
- Square and diamond (diamond is just a rotated square)

### Valid Set Examples

1. **All Different:** 3 different shapes, 3 different colors, 3 different patterns, 3 different counts
2. **Mixed:** Same shape, same count; different colors, different patterns

### Share Format

```
Trio 🏆 #42        (trophy if all found without hints)
5/5 Trios
🟩🟨🟩🟥🟩

nerdcube.games/trio
```

- 🟩 = found (no hint)
- 🟨 = found with hint
- 🟥 = missed
- 🏆 = appears next to game name if ALL rounds found without hints (perfect game)

## File Structure

```
src/
├── app/
│   ├── layout.tsx       # Root layout with metadata
│   ├── page.tsx         # Main game page (wraps Game in Suspense)
│   ├── archive/page.tsx # Archive page
│   └── globals.css      # Theme CSS variables (teal accent, card colors)
├── components/
│   ├── Game.tsx         # Main game orchestrator
│   ├── Tableau.tsx      # 3x3 card grid
│   ├── Card.tsx         # Interactive card (square, hint glow)
│   ├── CardShape.tsx    # SVG shape rendering (triangle layout for count=3)
│   ├── HintsIndicator.tsx      # Hint button
│   ├── FoundSetDisplay.tsx     # Shows last found trio below buttons
│   ├── RoundProgress.tsx       # 5-dot progress indicator in nav
│   ├── AllFoundTrios.tsx       # Displays all trios on finished screen
│   ├── HowToPlayModal.tsx
│   └── ArchivePageContent.tsx
├── lib/
│   ├── setLogic.ts         # isValidSet(), GF(3)^4 math
│   ├── puzzleLoader.ts     # Load puzzles from monthly files
│   └── storage.ts          # LocalStorage state persistence
├── types/
│   └── index.ts         # TypeScript interfaces (GameState, GuessAttempt, etc.)
├── constants/
│   ├── shapes.ts        # Shape definitions with SVG paths
│   ├── colors.ts        # Color definitions
│   ├── patterns.ts      # Pattern definitions
│   └── index.ts         # Game config (MAX_INCORRECT_GUESSES=4, MAX_HINTS=3)
├── hooks/
│   └── useGameState.ts  # Game state reducer (attempts, hints, guess history)
└── config.ts            # Game config export
scripts/
├── generateSequential.ts # Generate sequential puzzles
└── assignPuzzles.ts      # Move puzzles from pool to monthly files
public/
└── puzzles/
    ├── pool.json              # UNASSIGNED sequential puzzles
    └── assigned/
        ├── 2026-02.json       # Full puzzle data for Feb 2026
        └── ...                # One file per month
```

## State Management

### GameState

```typescript
interface GameState {
  phase: 'landing' | 'playing' | 'finished';
  puzzle: SequentialPuzzle | null;
  currentRound: number;          // 1-5
  cards: Card[];                 // Current 9 cards
  selectedCardIds: string[];     // Max 3
  roundOutcomes: RoundOutcome[]; // 'pending' | 'found' | 'found-with-hint' | 'missed'
  hintUsedInRound: boolean[];    // Track hint usage per round
  allTrios: Card[][];            // All trios (found + missed) for results display
  hintedCardIds: string[];       // Cards revealed by hints
  lastFoundSet?: Card[];         // For display below buttons
  // Animation
  removingCardIds: string[];
  addingCardIds: string[];
  revealingCorrectTrio: boolean;
  correctTrioCardIds: string[];
}
```

### Game Flow

1. Tap cards to select (max 3)
2. Press **Submit** to check your trio
3. Valid: Cards animate out, new cards appear, round advances (outcome: 'found' or 'found-with-hint')
4. Invalid: Shake animation, correct trio revealed briefly, then round advances (outcome: 'missed')
5. Game ends after round 5

### Key Actions

- `SELECT_CARD` / `DESELECT_CARD` - Toggle card selection
- `SUBMIT_SELECTION` - Check if selected cards form valid trio
- `FOUND_SET` - Valid trio found, advance round
- `MISSED_ROUND` - Wrong guess, reveal correct trio
- `ADVANCE_AFTER_MISS` - Move to next round after reveal
- `USE_HINT` - Reveal first card in valid set

## Storage Pattern

Uses `createArchiveStorage` from `@grid-games/shared`:

**Storage Key Format:** `trio-{puzzleNumber}-{puzzleId}`

**Puzzle State Interface:**
```typescript
interface TrioPuzzleState {
  puzzleNumber: number;
  puzzleId?: string;
  status: 'in-progress' | 'completed';
  data: {
    currentRound: number;
    currentCardTuples: Tuple[];
    roundOutcomes: RoundOutcome[];
    hintUsedInRound: boolean[];
    allTrioTuples: Tuple[][];
    selectedCardIds?: string[];
    lastFoundSetTuples?: Tuple[];
  };
}
```

## Debug Mode

Add `?debug=true` to URL:
- Bypasses localStorage saved state (start fresh every time)
- Console-only output:
  - `[Trio Debug] Puzzle ID: X`
  - `[Trio Debug] Rounds: 5`
  - `[Trio Debug] === SOLUTION ===` with positions

### Pool Mode (Debug Only)

Load from pool by index: `?debug=true&poolIndex=5`

## Visual System

### Card Component

Interactive card with states:
- Default: Transparent (shapes on dark background)
- Hover: Subtle highlight (`bg-white/5`)
- Selected: Teal ring + scale up
- Hinted: Amber ring + pulse animation
- Correct reveal: Green ring + shadow
- Shaking: Shake animation for invalid selection

**Card Shape:** Square aspect ratio (1:1) for better visual balance

### CardShape Component

Renders SVG shapes with patterns:
- For count=3: **Triangle layout** (1 top, 2 bottom)
- For count=1,2: Horizontal layout

**Patterns:**
- `solid`: Filled shape
- `outline`: Stroke only
- `striped`: Diagonal stripes using SVG pattern

### Animations

Defined in `globals.css`:
- `animate-shake`: Shake for invalid sets (0.5s)
- `animate-card-add`: Fade in + scale for new cards (0.3s)
- `animate-pulse-subtle`: Amber glow for hinted cards
- `animate-found-set-appear`: Slide in for found set display

## Mathematical Foundation: GF(3)^4

Each card is a tuple in GF(3)^4 (4 attributes, each with 3 values: 0, 1, 2).
Three cards form a valid set if and only if their sum is (0,0,0,0) mod 3.

```typescript
function isValidSetFromTuples(tuples: [Tuple, Tuple, Tuple]): boolean {
  for (let i = 0; i < 4; i++) {
    const sum = (tuples[0][i] + tuples[1][i] + tuples[2][i]) % 3;
    if (sum !== 0) return false;
  }
  return true;
}
```

## Dependencies

- `seedrandom` - Deterministic random generation
- Shared packages: `@grid-games/config`, `@grid-games/ui`, `@grid-games/shared`
