# Jumble - Daily Word Search Game

Part of **The Grid** monorepo. Uses shared packages: `@grid-games/ui`, `@grid-games/config`, `@grid-games/shared`.

## Project Overview

Jumble is a timed word search game where players find words on a Boggle-style letter grid by connecting adjacent tiles. Same puzzle for all players each day, with shareable results.

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
3. Drag/swipe across tiles to form words
4. Release to submit the word
5. Timer: 3 minutes (configurable)

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
│   ├── Game.tsx         # Main game orchestrator
│   ├── BoggleGrid.tsx   # Letter grid with touch/mouse path tracing
│   ├── Tile.tsx         # Individual tile components
│   ├── CurrentWord.tsx  # Currently selected word display
│   ├── FoundWordsList.tsx  # List of found words
│   ├── Timer.tsx        # Countdown timer
│   ├── ResultsModal.tsx # End-game results
│   ├── StatsModal.tsx   # Statistics display
│   ├── HowToPlayModal.tsx # Instructions
│   └── ShareButton.tsx  # Share results button
├── lib/
│   ├── boardGenerator.ts   # Seeded daily board generation
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
- `GRID_SIZE`: Board dimensions (default: 4x4)
- `TIMER_DURATION`: Game time in seconds (default: 180)
- `MIN_WORD_LENGTH`: Minimum word length (default: 3)
- `SCORING`: Points per word length

## Implementation Notes

### Path Tracing
Touch/mouse input tracks a path of connected tiles:
- Path displayed with connecting lines
- Each tile can only appear once in path
- Only adjacent tiles can be added (including diagonals)
- CSS class `path-line` styles the connecting SVG lines

### Board Generation
- Uses custom seeded RNG (date-based)
- Letter distribution weighted for playability
- Ensures "Qu" appears as single tile

### Touch Handling
Special CSS classes in `globals.css`:
- `.no-select` - Prevents text selection during drag
- `.touch-none` - Disables native touch behaviors
- `overscroll-behavior: none` - Prevents pull-to-refresh

### Results & Sharing
- Performance bar shows percentage of possible words found
- Share format includes puzzle number, time, words found, score

## Dependencies

- No game-specific external dependencies
- Uses custom RNG instead of seedrandom
- Shared packages: `@grid-games/config`, `@grid-games/ui`, `@grid-games/shared`

## Future Enhancements

- [ ] Hint system
- [ ] Statistics tracking (localStorage)
- [ ] Difficulty variants (larger grids, longer timers)
- [ ] Sound effects
- [ ] Animations for word submission
