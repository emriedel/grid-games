# Jumble - Daily Word Search Game

Part of **Nerdcube Games** monorepo. Uses shared packages: `@grid-games/ui`, `@grid-games/config`, `@grid-games/shared`.

## Project Overview

Jumble is a timed word search game where players find words on a Big Boggle-style 5x5 letter grid by connecting adjacent tiles. Same puzzle for all players each day, with shareable results.

- **Accent Color:** Red/Pink (#e94560)
- **Dev Port:** 3002
- **Package Name:** `@grid-games/jumble`

**Theme:** Always use CSS variables, never hardcode colors:
```tsx
<button className="bg-[var(--accent)]">  // Good
<button className="bg-[#e94560]">        // Bad
```

## Quick Start

```bash
# From monorepo root
npx turbo dev --filter=@grid-games/jumble

# Or run all apps
npm run dev
```

Then open http://localhost:3002

## Game Rules

### Core Gameplay
1. Find words by connecting adjacent tiles (including diagonals)
2. Each tile can only be used once per word
3. Drag/swipe across tiles to form words, or tap to select
4. Release drag or double-tap last tile to submit the word
5. Tap outside grid to clear selection
6. Timer: 2 minutes

### Word Requirements
- Minimum word length: 3 letters
- "Qu" is a single tile (counts as 2 letters for scoring)
- Must be a valid dictionary word

### Scoring
| Word Length | Points |
|-------------|--------|
| 3-4 letters | 1 |
| 5 letters | 2 |
| 6 letters | 3 |
| 7 letters | 5 |
| 8+ letters | 11 |

## File Structure

```
src/
├── app/
│   ├── layout.tsx       # Root layout with metadata
│   ├── page.tsx         # Main game page
│   └── globals.css      # Theme CSS variables (red/pink accent)
├── components/
│   ├── Game.tsx         # Main game orchestrator (includes JumbleResultsModal wrapper)
│   ├── BoggleGrid.tsx   # Letter grid with touch/mouse path tracing
│   ├── Tile.tsx         # Individual tile components
│   ├── CurrentWord.tsx  # Currently selected word display
│   ├── FoundWordsList.tsx  # List of found words (always visible)
│   ├── Timer.tsx        # Countdown timer
│   ├── StatsModal.tsx   # Statistics display
│   └── HowToPlayModal.tsx # Instructions
├── lib/
│   ├── boardGenerator.ts   # Seeded daily board generation with validation
│   ├── dictionary.ts       # Trie-based word lookup
│   ├── wordValidator.ts    # Path adjacency validation
│   └── scoring.ts          # Score calculation
├── types/
│   └── index.ts         # TypeScript interfaces
├── constants/
│   └── gameConfig.ts    # Timer, scoring, board config
└── hooks/               # Custom React hooks
```

## Key Configuration

`src/constants/gameConfig.ts`:
- `BOARD_SIZE`: Board dimensions (5x5 Big Boggle)
- `TIMER_DURATION`: Game time in seconds (120 = 2 minutes)
- `MIN_WORD_LENGTH`: Minimum word length (default: 3)
- `BOGGLE_DICE`: Standard Big Boggle 25-dice set
- `SCORING_TABLE`: Points per word length

## Implementation Notes

### Path Tracing
Touch/mouse input tracks a path of connected tiles:
- Path displayed with connecting lines
- Each tile can only appear once in path
- Only adjacent tiles can be added (including diagonals)
- CSS class `path-line` styles the connecting SVG lines
- Tap outside tiles to clear the path

### Board Generation
- Uses custom seeded RNG (date-based)
- Uses standard Big Boggle 25-dice set
- Validates board for playability:
  - At least 4 vowels spread across 3+ rows and columns
  - Maximum 2 rare letters (Q, Z, X, J, K)
- Retries with deterministic seed increment if validation fails

### Touch Handling
Special CSS classes in `globals.css`:
- `.no-select` - Prevents text selection during drag
- `.touch-none` - Disables native touch behaviors
- `overscroll-behavior: none` - Prevents pull-to-refresh

### Results & Sharing
Share format shows words found by length:
```
Jumble 🟥
Score: 47 pts
3L: 8 | 4L: 5 | 5L: 3 | 6L: 1 | 7L+: 0

https://nerdcube.games/jumble
```

### State Persistence

Storage module: `src/lib/storage.ts`

**In-progress state:**
- `date` - puzzle date
- `foundWords` - array of found word strings
- `timeRemaining` - seconds left on timer

**Completion state:**
- `date` - puzzle date
- `foundWords` - array of found words with scores and paths
- `maxPossible` - maximum possible score for the puzzle
- `score` - final score

**Timer Visibility API:**
Timer pauses when tab is hidden using `document.visibilitychange` event:
```tsx
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      if (isRunning) { wasRunningBeforeHidden.current = true; setIsRunning(false); }
    } else {
      if (wasRunningBeforeHidden.current && timeRemaining > 0) setIsRunning(true);
      wasRunningBeforeHidden.current = false;
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [isRunning, timeRemaining]);
```

## Dependencies

- No game-specific external dependencies
- Uses custom RNG instead of seedrandom
- Shared packages: `@grid-games/config`, `@grid-games/ui`, `@grid-games/shared`

## Future Enhancements

- [ ] Hint system
- [ ] Statistics tracking (localStorage)
- [ ] Sound effects
- [ ] Animations for word submission
