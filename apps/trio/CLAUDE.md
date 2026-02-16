# Trio - Daily Set Puzzle Game

Part of **Nerdcube Games** monorepo. Uses shared packages: `@grid-games/ui`, `@grid-games/config`, `@grid-games/shared`.

## Project Overview

Trio is a daily Set-style puzzle game where players find "trios" - sets of 3 cards where each attribute (shape, color, pattern, count) is either ALL SAME or ALL DIFFERENT.

**Sequential Draw Mode:** Each puzzle has 5 rounds. Each round shows 9 cards with exactly ONE valid trio. Find it, and 3 new cards replace the found set.

- **Accent Color:** Teal (#14b8a6)
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
6. Find the trio in all 5 rounds to win
7. **4 wrong guesses = game over**

### Attempts & Hints
- **4 Attempts:** You have 4 chances to make wrong guesses before game over
- **3 Hints:** Use hints (💡) to reveal cards from the valid trio
- No timer - take your time to find the correct trio

### Card Attributes

Each attribute has 3 values in each puzzle (selected from a larger pool):

- **Shape Pool:** circle, triangle, square, diamond, pentagon, hexagon, star, cross, heart
- **Color Pool:** red, green, purple, blue, orange, teal (rich, saturated colors)
- **Pattern Pool:** solid, outline, striped
- **Count:** 1, 2, or 3 shapes (displayed in triangle pattern for count=3)

**Conflict Rules:** Similar shapes/colors never appear together in the same puzzle:

*Shape conflicts:*
- Pentagon and hexagon (too similar multi-sided polygons)
- Square and diamond (diamond is just a rotated square)

*Color conflicts:*
- Green and teal (both greenish)
- Red and orange (both warm/reddish)
- Blue and purple (both cool, can look similar)

### Valid Set Examples

1. **All Different:** 3 different shapes, 3 different colors, 3 different patterns, 3 different counts
2. **Mixed:** Same shape, same count; different colors, different patterns

### Share Format (Strands-style)

```
Trio #42
🎯🎯🎯🎯🎯
❌❌
💡

nerdcube.games/trio
```

- 🎯 = rounds completed
- ❌ = wrong guesses
- 💡 = hints used
- Loss shows "(3/5)" after rounds

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
│   ├── Card.tsx         # Interactive card (square, cream bg, hint glow)
│   ├── CardShape.tsx    # SVG shape rendering (triangle layout for count=3)
│   ├── AttemptsIndicator.tsx   # 4 dots showing remaining attempts
│   ├── HintsIndicator.tsx      # Hint button with count
│   ├── FoundSetDisplay.tsx     # Shows last found trio at bottom
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
  foundSets: FoundSet[];         // Sets found by player (1 per round)
  // Attempts system
  incorrectGuesses: number;      // 0-4, game over at 4
  guessHistory: GuessAttempt[];  // For duplicate detection
  // Hint system
  hintsUsed: number;             // 0-3
  hintedCardIds: string[];       // Cards revealed by hints
  // Display
  lastFoundSet?: Card[];         // For bottom display
  won: boolean;                  // True if completed all rounds
  // Animation
  removingCardIds: string[];
  addingCardIds: string[];
}
```

### Game Flow

1. Tap cards to select (max 3)
2. Press **Submit** to check your trio
3. Valid: Cards animate out, new cards appear, round advances
4. Invalid: Shake animation, selection clears, lose 1 attempt
5. Duplicate guess: Toast "Already guessed", no attempt lost
6. Game ends after round 5 (win) OR 4 wrong guesses (loss)

### Key Actions

- `SELECT_CARD` / `DESELECT_CARD` - Toggle card selection
- `SUBMIT_SELECTION` - Check if selected cards form valid trio
- `FOUND_SET` - Valid trio found, advance round
- `INVALID_GUESS` - Wrong guess, increment incorrectGuesses
- `USE_HINT` - Reveal next card in valid set

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
    foundSets: FoundSet[];
    currentCardTuples: Tuple[];
    incorrectGuesses: number;
    guessHistory: GuessAttempt[];
    hintsUsed: number;
    hintedCardIds: string[];
    selectedCardIds?: string[];
    won?: boolean;
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
- Default: Cream background (`--card-bg: #f5f0e6`)
- Hover: Lighter cream (`--card-bg-hover`)
- Selected: Darker cream (`--card-bg-selected`) + teal ring
- Hinted: Golden cream (`--card-bg-hinted`) + pulse animation
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
- `animate-pulse-subtle`: Golden glow for hinted cards
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
