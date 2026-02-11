# Edgewise - Game Documentation

## Overview
Edgewise is a daily puzzle game combining elements from NYT Connections and So Clover. Players rotate tiles in a 2×2 grid to match word pairs with categories on the border.

**Accent Color:** Purple (#a855f7)
**Dev Port:** 3003
**Package Name:** `@grid-games/edgewise`

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
- Category labels turn green when correct after submission
- Results show emoji line: ❌ for wrong guesses, ✅ for winning guess

---

## File Structure

```
apps/edgewise/
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── CLAUDE.md (this file)
├── data/
│   └── categories.json           # Category/word database for puzzle generation
├── public/puzzles/
│   ├── puzzles.json              # Legacy puzzle data (fallback)
│   ├── pool.json                 # Unassigned puzzles (pending/approved/rejected)
│   └── assigned/
│       └── 2026-01.json          # Monthly assigned puzzles
├── scripts/
│   ├── types.ts                  # TypeScript types for puzzle generation
│   ├── generatePuzzles.ts        # Generate puzzles from categories
│   └── assignPuzzles.ts          # Assign approved puzzles to dates
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── archive/page.tsx      # Archive page
│   │   ├── debug/page.tsx        # Debug puzzle browser (localhost only)
│   │   ├── api/debug/...         # API routes for puzzle management
│   │   └── globals.css           # Purple theme
│   ├── components/
│   │   ├── Game.tsx              # Main orchestrator
│   │   ├── GameBoard.tsx         # Grid + categories layout
│   │   ├── Square.tsx            # Rotatable tile
│   │   ├── CategoryLabel.tsx     # Border category
│   │   ├── CenterButton.tsx      # Group rotation button
│   │   ├── AttemptsIndicator.tsx # Remaining attempts
│   │   ├── ArchivePageContent.tsx# Archive page logic
│   │   ├── DebugPageContent.tsx  # Debug page UI
│   │   └── HowToPlayModal.tsx
│   ├── lib/
│   │   ├── puzzleLoader.ts       # Load puzzles from monthly files
│   │   ├── gameLogic.ts          # Validation logic
│   │   ├── storage.ts            # Archive-enabled storage
│   │   └── debugHelpers.ts       # Load pool puzzles for debug
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

## Pre-Generated Puzzles (Archive Support)

Uses a pool/assigned architecture for stable archives:

### Architecture

```
public/puzzles/
├── pool.json                 # Unassigned puzzles (safe to regenerate)
└── assigned/
    └── 2026-01.json          # Full puzzle data for Jan 2026 (stable)
```

**Monthly File Format:**
```json
{
  "gameId": "edgewise",
  "baseDate": "2026-01-01",
  "puzzles": {
    "1": { "id": "fb6065bf", "date": "2026-01-25", "categories": {...}, "squares": [...] },
    "2": { "id": "ee8bb7bd", "date": "2026-01-26", "categories": {...}, "squares": [...] }
  }
}
```

### Commands

```bash
# Generate puzzles from categories into pool.json
npm run generate-puzzles              # Generate 10 puzzles
npm run generate-puzzles -- 50        # Generate 50 puzzles

# Assign approved puzzles from pool to monthly files
npm run assign-puzzles                # Assign up to today's puzzle
npm run assign-puzzles -- 100         # Ensure puzzles 1-100 are assigned
```

---

## Puzzle Generation System

### Category Database

Categories are stored in `data/categories.json` (~200 categories):

```typescript
interface CategoryDatabase {
  categories: Category[];
  generatedAt: string;
  metadata: {
    totalCategories: number;
    byCategoryType: Record<CategoryType, number>;
  };
}

interface Category {
  name: string;           // e.g., "NBA Teams", "Spring _____"
  type: CategoryType;
  words: string[];        // 8-20 single words per category
}

type CategoryType =
  | 'compound-word-prefix'   // "Spring _____" → BREAK, BOARD, ROLL
  | 'compound-word-suffix'   // "_____ Ball" → BASKET, VOLLEY, FOOT
  | 'proper-noun-group'      // NBA Teams, Pixar Movies, Rock Bands
  | 'finite-group'           // Planets, Bones, Playing Card Suits
  | 'general-category'       // Kitchen Utensils, School Supplies
  | 'things-that'            // Things that are round, Things in pairs
  | 'adjective-category';    // Shades of Blue, Types of Green
```

### Generation Algorithm

The script `scripts/generatePuzzles.ts` uses the following approach:

**1. Build Word Index**
- Maps each word to the categories it belongs to
- Identifies "overlap words" that appear in multiple categories (used for misdirection)

**2. Category Usage Tracking**
```typescript
const MAX_CATEGORY_USES = 2;        // Each category used at most 2x per batch
const MIN_WORDS_PER_CATEGORY = 4;   // Need enough words to fill edges
```
- Tracks how many times each category has been used
- Prefers less-used categories when selecting (exponential distribution)
- Ensures variety across generated puzzles

**3. Select 4 Categories (CategoryQuad)**
- Finds combinations where words can be assigned to create misdirection
- At least some "overlap words" that fit multiple categories
- Each category must have enough unique words for outward-facing edges

**4. Assign Words to Tile Edges**
For each puzzle:
- 8 outward-facing edges get words that match their category
- 8 center-facing edges (red herrings) get overlap words or category words
- Overlap words are placed on center-facing edges to create misdirection

**5. Validate Unique Solution**
Brute-force checks all 6,144 possible configurations:
- 4! = 24 tile position permutations
- 4^4 = 256 rotation combinations
- Puzzle is only valid if exactly ONE configuration solves all 4 categories

### Generation Workflow

1. **Build Categories** - Generate categories interactively, review in batches by type
2. **Generate Puzzles** - Run `npm run generate-puzzles` to create puzzles from categories
3. **Curate Puzzles** - Visit `/debug` to browse, play, approve/reject puzzles
4. **Assign Puzzles** - Run `npm run assign-puzzles` to move approved puzzles to dates

### Lessons Learned

**Category Variety is Critical**
- Early versions reused the same 3-4 categories (Fire _____, Light _____, _____ Box) in almost every puzzle
- Solution: Track category usage and limit each to MAX_CATEGORY_USES (2) per generation batch
- Prefer less-used categories with exponential weighting

**Why Some Categories Dominate**
- Categories with many common "overlap words" (like compound-word prefixes) are easier to combine
- The algorithm naturally gravitates toward these without usage limits
- ~200 categories ensures enough variety for 50+ unique puzzles per batch

**Red Herring Quality**
- Overlap words make better red herrings (they genuinely fit multiple categories)
- Center-facing edges should have words that could plausibly match adjacent categories

### Pool.json Format

```typescript
interface PoolPuzzle {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  categories: { top: string; right: string; bottom: string; left: string };
  squares: [PuzzleSquare, PuzzleSquare, PuzzleSquare, PuzzleSquare];
  metadata: {
    categoryTypes: CategoryType[];
    overlapWords: string[];        // Words that fit multiple categories
    generatedAt: string;
  };
}
```

### Debug Page

Visit `http://localhost:3003/debug` to:
- Browse pool puzzles and future assigned puzzles
- Preview puzzle tiles and categories
- Play any puzzle with "Play This Puzzle" button
- Approve/Reject pending puzzles
- Filter by status (all/pending/approved/rejected)

Only available on localhost.

---

## State Persistence

Storage module: `src/lib/storage.ts` - uses shared `createArchiveStorage` factory.

**Storage Key Format:** `edgewise-{puzzleNumber}-{puzzleId}`

**Puzzle State Interface:**
```typescript
interface EdgewisePuzzleState extends BasePuzzleState {
  puzzleNumber: number;
  puzzleId?: string;
  status: 'in-progress' | 'completed';
  data: {
    squareRotations: Rotation[];
    guessesUsed: number;
    feedbackHistory: GuessFeedback[];
    solved?: boolean;  // Only set on completion
  };
}
```

**Helper Functions:**
- `saveGameProgress(puzzleNumber, squares, guessesUsed, feedbackHistory, puzzleId?)` - Save in-progress state
- `saveGameCompletion(puzzleNumber, squares, guessesUsed, feedbackHistory, solved, puzzleId?)` - Save completion
- `getTodayResult()` - Get today's completion result
- `getTodayInProgress()` - Get today's in-progress state
- `clearTodayPuzzle()` - Clear all state for today
- `findPuzzleState(puzzleNumber)` - Find any saved state for a puzzle
- `getPuzzleIdsForRange(start, end)` - Load puzzleIds from monthly files (for archive)

---

## Archive Page

The archive page at `/archive` shows past puzzles with completion status.

**Key Patterns:**
- Loads puzzleIds from monthly files using `getPuzzleIdsForRange`
- Verifies saved puzzleId matches current puzzleId before showing completion
- Navigates to `/?puzzle=N` for archive puzzles
- Archive puzzles skip landing screen, go straight to game

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

### Initial Scrambling
- Individual tile rotations: seeded by `{date}-scramble`
- Group rotations (0-3): seeded by `{date}-group-scramble`

---

## Position Mapping

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

## Commands

```bash
# Development
npx turbo dev --filter=@grid-games/edgewise

# Build
npx turbo build --filter=@grid-games/edgewise

# Debug mode (bypasses localStorage)
http://localhost:3003?debug=true

# Play specific puzzle
http://localhost:3003/?puzzle=1
```

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

---

## Adding New Puzzles

### From Categories (Recommended)

1. Ensure categories are populated in `data/categories.json`
2. Generate puzzles: `npm run generate-puzzles -- 20`
3. Browse and approve at `http://localhost:3003/debug`
4. Assign approved puzzles: `npm run assign-puzzles`

**Tips for Generation:**
- Generate in batches of 20-50 puzzles at a time
- Each category is limited to 2 uses per batch (MAX_CATEGORY_USES)
- Clear pool.json before regenerating to reset category usage counts
- After generation, the script prints category usage stats to verify variety
- If certain categories dominate, consider adding more categories to the database

**Expanding the Category Database:**
- Current database has ~200 categories across 7 types
- To add more variety, expand categories interactively in conversation
- Review categories by type (compound-word-prefix, proper-noun-group, etc.)
- Each category should have 8-20 single words
- Avoid multi-word entries (e.g., "ICE CREAM" should just be "ICE")

### Manual (Legacy)

1. Add puzzles to `public/puzzles/puzzles.json` with:
   - `date`: YYYY-MM-DD format
   - `categories`: 4 category labels
   - `squares`: 4 squares with words in solved positions

2. Run the assign script to migrate to monthly files:
   ```bash
   npm run assign-puzzles
   ```

3. The script generates unique IDs and creates/updates monthly files in `assigned/`
