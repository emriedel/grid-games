# The Grid - Daily Word Games

A Turborepo monorepo containing a collection of daily word puzzle games. Each day, players get a new puzzle to solve and can share their results.

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- npm 10+

### Setup

```bash
# Clone the repo (if not already)
cd /Users/Eric_1/Documents/Coding\ Projects/grid-games

# Install all dependencies (this installs for all apps and packages)
npm install

# Start development server for all apps
npm run dev
```

### Access the Apps

Once running, open these URLs in your browser:

| App | URL | Description |
|-----|-----|-------------|
| Landing Page | http://localhost:3000 | Game selection hub |
| Dabble | http://localhost:3001 | Scrabble-style tile game |
| Jumble | http://localhost:3002 | Timed word search game |

### Run a Single App (Faster)

If you're only working on one game:

```bash
# Dabble only
npx turbo dev --filter=@grid-games/dabble

# Jumble only
npx turbo dev --filter=@grid-games/jumble

# Landing page only
npx turbo dev --filter=@grid-games/web
```

## Project Structure

```
grid-games/
├── apps/
│   ├── web/                    # Landing page (port 3000)
│   │   └── src/app/page.tsx    # "Pick a game" grid
│   ├── dabble/                 # Scrabble-style game (port 3001)
│   │   ├── src/
│   │   │   ├── app/            # Next.js app directory
│   │   │   ├── components/     # Game components
│   │   │   ├── lib/            # Game logic, dictionary, puzzle gen
│   │   │   ├── types/          # TypeScript types
│   │   │   └── constants/      # Game configuration
│   │   └── public/dict/        # Word dictionary
│   └── jumble/                 # Word search game (port 3002)
│       ├── src/
│       │   ├── app/            # Next.js app directory
│       │   ├── components/     # Game components
│       │   ├── lib/            # Game logic, scoring
│       │   ├── types/          # TypeScript types
│       │   └── constants/      # Game configuration
│       └── public/dict/        # Word dictionary
├── packages/
│   ├── ui/                     # Shared React components
│   │   └── src/
│   │       ├── Modal.tsx       # Overlay + card + escape handling
│   │       ├── Button.tsx      # Primary/secondary variants
│   │       ├── PageContainer.tsx
│   │       └── GameHeader.tsx
│   ├── config/                 # Shared theme & configuration
│   │   └── src/
│   │       └── theme.ts        # GameTheme interface, per-game themes
│   └── shared/                 # Shared utilities
│       └── src/
│           ├── share.ts        # Share text generation, clipboard
│           └── date.ts         # Date formatting, puzzle numbers
├── turbo.json                  # Turborepo task configuration
├── package.json                # Root workspace configuration
└── vercel.json                 # Vercel deployment config
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all apps for production |
| `npm run lint` | Run ESLint across all packages |
| `npm run type-check` | TypeScript type checking |
| `npm run clean` | Clean all build artifacts and node_modules |

## Games

### Dabble
Scrabble-style daily puzzle where players place tiles on a unique board to form words.
- **Port**: 3001
- **Accent Color**: Amber (#f59e0b)
- **Key Features**: Drag-and-drop tiles, bonus squares, daily seeded puzzles

### Jumble
Timed word search where players find words by connecting adjacent letters.
- **Port**: 3002
- **Accent Color**: Red/Pink (#e94560)
- **Key Features**: Timer, path tracing, word validation

### Web (Landing)
Game selection hub showing all available games.
- **Port**: 3000

## Shared Packages

### @grid-games/ui
Shared React components that use CSS custom properties for theming:
- `Modal` - Overlay container with escape handling
- `Button` - Primary/secondary/ghost variants
- `PageContainer` - Consistent page layout
- `GameHeader` - Title and score display

### @grid-games/config
Theme system with per-game accent colors:
- `GameTheme` interface
- `dabbleTheme`, `jumbleTheme` presets
- `themeToCssVars()` helper

### @grid-games/shared
Common utilities:
- `buildShareText()` - Consistent share format
- `shareOrCopy()` - Native share with clipboard fallback
- Date utilities for daily puzzles

## Deployment

### Option 1: Separate Vercel Projects (Recommended)

Deploy each app as its own Vercel project:

1. Create a Vercel project
2. Set "Root Directory" to the app folder (e.g., `apps/dabble`)
3. Vercel auto-detects Turborepo

### Option 2: Separate Domains

- `dabble.yourdomain.com` → dabble app
- `jumble.yourdomain.com` → jumble app
- `thegrid.yourdomain.com` → landing page

### Option 3: Path-Based (Single Domain)

Use `NEXT_PUBLIC_BASE_PATH` env var to deploy at paths like `/dabble`, `/jumble`.

## Adding a New Game

```bash
# Copy an existing game as a template
cp -r apps/dabble apps/new-game

# Update apps/new-game/package.json:
# - Change "name" to "@grid-games/new-game"
# - Update port in scripts

# Add the new game to apps/web/src/app/page.tsx

# Install and run
npm install
npm run dev
```

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Monorepo**: Turborepo
- **Package Manager**: npm workspaces
- **Deployment**: Vercel
