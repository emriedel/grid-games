# Dabble - Daily Word Puzzle Game

Part of **Nerdcube Games** monorepo. Uses shared packages: `@grid-games/ui`, `@grid-games/config`, `@grid-games/shared`.

## Project Overview

Dabble is a daily Scrabble-style word puzzle game where players receive a randomly-generated board with unique shapes and bonus squares, along with a set of letters. The goal is to score the highest possible Scrabble score using valid words.

- **Accent Color:** Red (#c41e3a)
- **Dev Port:** 3001
- **Package Name:** `@grid-games/dabble`

**Theme:** Always use CSS variables, never hardcode colors:
```tsx
<button className="bg-[var(--accent)]">  // Good
<button className="bg-amber-500">        // Bad
```

## Quick Start

```bash
# From monorepo root
npx turbo dev --filter=@grid-games/dabble

# Or run all apps
npm run dev
```

Then open http://localhost:3001

## Game Rules

### Core Gameplay
1. Each day, all players receive the same puzzle (board + letters)
2. Players place tiles from their rack onto the board to form words
3. Words must connect like traditional Scrabble:
   - First word must cover the center star (★)
   - Subsequent words must connect to existing words
4. Only valid Scrabble dictionary words are accepted
5. Goal: Maximize your total score

### Board Features
- 9x9 grid (configurable in `src/constants/gameConfig.ts`)
- 4 board archetypes: diamond, corridor, scattered, open
- Dead spaces (dark cells where tiles cannot be placed)
- Bonus squares:
  - DL (Double Letter) - blue
  - TL (Triple Letter) - dark blue
  - DW (Double Word) - pink/rose
  - TW (Triple Word) - orange
  - ★ (Start) - amber, required for first word (no bonus)

### Letter Rack
- Players receive 14 letters per puzzle (configurable)
- Letter distribution weighted by Scrabble frequencies
- Minimum 4 vowels guaranteed
- Letter validation ensures formable 3-letter, 4-letter, and 5+ letter words

### Scoring
- Standard Scrabble letter point values (A=1, B=3, Q=10, etc.)
- Bonus squares multiply letter or word scores
- Bonuses only apply to newly placed tiles
- **Letter usage bonus**: Using more letters earns milestone bonuses
  - 12 letters: +5, 13 letters: +10, 14 letters (all): +20
- Bonuses are configurable in `src/constants/gameConfig.ts`

### Star Rating System
Puzzles have heuristically-determined star thresholds:
- ★ Good: ~22% of heuristic max
- ★★ Great: ~40% of heuristic max
- ★★★ Excellent: ~65% of heuristic max

Stars are displayed in share text, results modal, and archive list.

## File Structure

```
src/
├── app/
│   ├── layout.tsx       # Root layout with metadata
│   ├── page.tsx         # Main game page (wraps Game in Suspense)
│   ├── archive/page.tsx # Archive page
│   └── globals.css      # Theme CSS variables (amber accent)
├── components/
│   ├── Game.tsx         # Main game orchestrator
│   ├── GameBoard.tsx    # Board grid with droppable cells
│   ├── LetterRack.tsx   # Draggable letter tiles
│   ├── Tile.tsx         # Individual tile components
│   └── WordList.tsx     # Submitted words display
├── lib/
│   ├── puzzleGenerator.ts  # Daily puzzle generation (seedrandom)
│   ├── gameLogic.ts        # Word validation, scoring
│   ├── dictionary.ts       # Trie-based word lookup
│   └── storage.ts          # LocalStorage state persistence
├── types/
│   └── index.ts         # TypeScript interfaces (StarThresholds, etc.)
├── constants/
│   └── gameConfig.ts    # Board size, letter values, scoring config
├── hooks/               # Custom React hooks
scripts/
├── solver.ts            # Beam search heuristic solver
├── generatePuzzles.ts   # Generate puzzles into pool.json
└── assignPuzzles.ts     # Move puzzles from pool to monthly assigned files
public/
└── puzzles/
    ├── pool.json              # UNASSIGNED puzzles only (safe to regenerate)
    └── assigned/
        ├── 2026-02.json       # Full puzzle data for Feb 2026
        ├── 2026-03.json       # Full puzzle data for Mar 2026
        └── ...                # One file per month
```

## Key Configuration

`src/constants/gameConfig.ts`:
- `BOARD_SIZE`: Grid dimensions (default: 9)
- `PUZZLE_LETTER_COUNT`: Letters given to player (default: 14)
- `MIN_VOWELS`: Minimum vowels guaranteed (default: 4)
- `LETTER_POINTS`: Standard Scrabble letter values
- `LETTER_DISTRIBUTION`: Letter frequency in pool
- `SCORING_CONFIG.letterUsageBonus`: Bonus points for letter milestones

## Pre-Generated Puzzles

Uses a pool/assigned architecture for stable archives while allowing algorithm improvements:

### Architecture

```
public/puzzles/
├── pool.json              # Only UNASSIGNED puzzles (can be regenerated anytime)
└── assigned/
    ├── 2026-02.json       # Full puzzle data for Feb 2026 (stable, never change)
    ├── 2026-03.json       # Full puzzle data for Mar 2026
    └── ...
```

**pool.json** - Contains only unassigned puzzles. Safe to delete and regenerate with improved algorithms.

**assigned/{YYYY-MM}.json** - Contains full puzzle data for each month. Once assigned, puzzles are immutable to preserve archive history. Each file has:
- `gameId`: "dabble"
- `baseDate`: First day of the month
- `puzzles`: Object keyed by puzzle number with full puzzle data

### Commands

```bash
# Generate new puzzles into the pool (adds to existing)
npx tsx scripts/generatePuzzles.ts           # 100 puzzles (default)
npx tsx scripts/generatePuzzles.ts 200       # 200 puzzles

# Assign puzzles from pool to monthly files
npx tsx scripts/assignPuzzles.ts             # Assign up to today
npx tsx scripts/assignPuzzles.ts 100         # Ensure puzzles 1-100 are assigned
```

### Workflow

1. **Generate puzzles** into pool (can regenerate with improved algorithms anytime)
2. **Assign puzzles** to numbers - this MOVES puzzles from pool to assigned/ files
3. **Game fetches** puzzle by number from the appropriate monthly file

### Safe to Regenerate Pool

Because assigned puzzles are stored separately with full data:
```bash
# This is always safe - won't affect any assigned puzzles
rm public/puzzles/pool.json
npx tsx scripts/generatePuzzles.ts 100
```

### What's Stored

Pre-generated puzzles include:
- Board layout and bonuses
- Letter set
- Star thresholds (from beam search heuristic)

The game loads pre-generated puzzles when available, falling back to client-side generation.

## Implementation Notes

### Drag and Drop
Uses `@dnd-kit/core` for tile dragging:
- `PointerSensor` for mouse with 8px activation distance
- `TouchSensor` with 150ms hold delay (allows normal taps)

### Debug Mode

Add `?debug=true` to URL:
- Bypasses localStorage saved state (start fresh every time)
- Console-only output (no on-screen panel):
  - `[Dabble Debug] Board archetype: X`
  - `[Dabble Debug] Thresholds: { heuristicMax, star1, star2, star3 }`

### Debug Page (Puzzle Browser)

Visit `http://localhost:3001/debug` to browse unpublished puzzles:
- Shows pool puzzles (unassigned) and future assigned puzzles
- Displays puzzle info: archetype, letters, heuristic max, star thresholds
- "Play This Puzzle" button navigates to `/?debug=true&poolId=X` or `/?puzzle=X&debug=true`
- Only available on localhost

### Puzzle Generation
- Uses `seedrandom` with date string as seed
- Board shape generated from 4 archetypes (diamond, corridor, scattered, open)
- Connectivity ensured via BFS from center
- Letter validation requires 3+ formable 3-letter words, 2+ 4-letter words, 1+ 5-letter word

### Word Validation Flow
1. Check tiles form a line (horizontal or vertical)
2. Check placement is contiguous (no gaps)
3. Check connection to existing words (or center star for first word)
4. Extract all formed words (main word + cross words)
5. Validate each word against dictionary
6. Calculate score with bonuses

### State Persistence

Storage module: `src/lib/storage.ts`

**In-progress state:**
- `board` - current board state with placed tiles
- `rackLetters` - remaining letters
- `placedTiles` - tiles placed on board (positions and letters)
- `submittedWords` - words already submitted
- `turnCount` - number of turns taken
- `totalScore` - current score

**Completion state:**
- `board` - final board state
- `submittedWords` - all submitted words with scores
- `lockedRackIndices` - indices of used letters
- `totalScore` - final score
- `thresholds` - star thresholds (for archive display)

## Dependencies

- `@dnd-kit/core` - Drag and drop
- `seedrandom` - Deterministic random generation
- Shared packages: `@grid-games/config`, `@grid-games/ui`, `@grid-games/shared`

## Future Enhancements

- [ ] Keyboard support for desktop
- [ ] Undo/redo functionality
- [ ] Visual feedback for invalid placements
- [ ] Animations for tile placement
- [ ] Statistics tracking (localStorage)
- [ ] Tutorial/how-to-play modal
