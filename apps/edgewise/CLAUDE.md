# Edgewise - Game Documentation

## Overview
Edgewise is a daily puzzle game combining elements from NYT Connections and So Clover. Players rotate tiles in a 2×2 grid to match word pairs with categories on the border.

**Accent Color:** Purple (#a855f7)

---

## Game Mechanics

### Layout
- **Grid:** 2×2 arrangement of square tiles
- **Categories:** 4 labels on the outer border (top, right, bottom, left)
- **Tiles:** Each has 4 words (one per edge), 2 face categories, 2 face center

### Controls
- **Tap tile:** Rotate 90° clockwise
- **Center button:** Swap all 4 tiles' positions clockwise (group rotation)

### Win Condition
- All 4 categories must have their 2 matching words facing them
- Maximum 4 attempts

### Feedback
- After each guess: 4 dots (🟢 correct, ⚪ incorrect)
- Dots are sorted green-first to hide which categories are correct

---

## File Structure

```
apps/edgewise/
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── CLAUDE.md (this file)
├── public/puzzles/puzzles.json    # Puzzle data
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css            # Purple theme
│   ├── components/
│   │   ├── Game.tsx               # Main orchestrator
│   │   ├── GameBoard.tsx          # Grid + categories layout
│   │   ├── Square.tsx             # Rotatable tile
│   │   ├── CategoryLabel.tsx      # Border category
│   │   ├── CenterButton.tsx       # Group rotation button
│   │   ├── FeedbackDots.tsx       # Guess feedback
│   │   ├── AttemptsIndicator.tsx  # Remaining attempts
│   │   ├── ResultsModal.tsx       # Win/lose modal
│   │   └── HowToPlayModal.tsx
│   ├── lib/
│   │   ├── puzzleLoader.ts        # Load/scramble puzzles
│   │   ├── gameLogic.ts           # Validation logic
│   │   └── storage.ts             # localStorage
│   ├── types/index.ts
│   ├── constants/gameConfig.ts
│   └── config.ts
```

---

## Key Types

```typescript
interface Puzzle {
  date: string;
  categories: { top, right, bottom, left: string };
  squares: [PuzzleSquare, PuzzleSquare, PuzzleSquare, PuzzleSquare];
}

interface SquareState {
  words: [string, string, string, string];  // [top, right, bottom, left]
  rotation: 0 | 1 | 2 | 3;  // 90° increments
}

type GuessFeedback = [number, number, number, number];  // 2=correct, 0=wrong
```

---

## Puzzle JSON Format

Puzzles are stored in solved configuration. The game scrambles rotations using the date as seed.

```json
{
  "puzzles": [{
    "date": "2026-01-25",
    "categories": {
      "top": "Bodies of Water",
      "right": "Stone _____",
      "bottom": "Furniture",
      "left": "Musical Instruments"
    },
    "squares": [
      { "top": "RIVER", "right": "BENCH", "bottom": "DRUM", "left": "PIANO" },
      ...
    ]
  }]
}
```

### Position Mapping

```
         [TOP CATEGORY]
            ↓     ↓
        ┌────┬────┐
[LEFT]→ │ 0  │  1 │ ←[RIGHT]
        ├────┼────┤
[LEFT]→ │ 3  │  2 │ ←[RIGHT]
        └────┴────┘
            ↑     ↑
        [BOTTOM CATEGORY]
```

### Center-Facing Edges (Red Herrings)
- Square 0: right, bottom
- Square 1: left, bottom
- Square 2: top, left
- Square 3: top, right

---

## Core Logic

### Rotation Formula
```typescript
function getWordAtEdge(square: SquareState, visualEdge: Edge): string {
  const originalIndex = ((visualEdge - square.rotation + 4) % 4);
  return square.words[originalIndex];
}
```

### Group Rotation
```typescript
function groupRotate(squares: SquareState[]): SquareState[] {
  return [squares[3], squares[0], squares[1], squares[2]];
}
```

---

## Commands

```bash
# Development
npx turbo dev --filter=@grid-games/edgewise

# Build
npx turbo build --filter=@grid-games/edgewise

# Debug mode (bypasses localStorage)
http://localhost:3003?debug=true
```

---

## Adding New Puzzles

1. Edit `public/puzzles/puzzles.json`
2. Add new puzzle object with:
   - `date`: YYYY-MM-DD format
   - `categories`: 4 category labels
   - `squares`: 4 squares with words in solved positions
3. Ensure the words match the category-edge mapping

---

## Theme Variables

```css
--accent: #a855f7;           /* Purple */
--accent-foreground: #faf5ff;
--accent-secondary: #7e22ce;
--tile-bg: #1e1b4b;
--tile-bg-selected: #312e81;
--tile-border: #4c1d95;
```

## State Persistence

Storage module: `src/lib/storage.ts`

**In-progress state:**
- `date` - puzzle date
- `squareRotations` - rotation state of each square (0-3)
- `squarePositions` - positions of squares after group rotations
- `guessCount` - number of guesses made
- `feedbackHistory` - array of previous guess feedback

**Completion state:**
- `date` - puzzle date
- `solved` - whether puzzle was solved
- `guessCount` - total guesses used
- `feedbackHistory` - all feedback from guesses
- `squareStates` - final state of all squares
