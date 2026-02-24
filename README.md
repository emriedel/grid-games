# Nerdcube Games

A collection of daily puzzle games. New puzzles every day at midnight. Share your results with friends. No account required.

**Play now at [nerdcube.games](https://nerdcube.games)**

---

## The Games

| Game | Description | Color |
|------|-------------|-------|
| **Dabble** | Build high-scoring words on a unique daily board | Red |
| **Carom** | Slide pieces to reach the goal in fewest moves | Amber |
| **Inlay** | Fill target shapes with pentomino pieces | Emerald |
| **Trio** | Find five groups of matching shapes | Cyan |
| **Jumble** | Find words in a grid before time runs out | Blue |
| **Edgewise** | Rotate tiles to match words with categories | Purple *(Coming Soon)* |

---

## Features

- **Daily Puzzles** - New puzzles at midnight local time
- **Share Results** - Emoji summaries to share with friends
- **Archives** - Play any past puzzle you missed
- **Star Ratings** - Earn up to 3 stars based on performance
- **Trophies** - Track your best scores
- **Mobile-Friendly** - Works great on phone, tablet, and desktop
- **Dark Mode** - Easy on the eyes
- **No Account Required** - Just play

---

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- npm 10+

### Setup

```bash
# Install dependencies
npm install

# Start all apps
npm run dev
```

### Local URLs

| App | URL | Port |
|-----|-----|------|
| Landing Page | http://localhost:3000 | 3000 |
| Dabble | http://localhost:3001 | 3001 |
| Jumble | http://localhost:3002 | 3002 |
| Trio | http://localhost:3003 | 3003 |
| Carom | http://localhost:3004 | 3004 |
| Edgewise | http://localhost:3005 | 3005 |
| Inlay | http://localhost:3006 | 3006 |

### Run a Single App

```bash
npx turbo dev --filter=@grid-games/dabble
npx turbo dev --filter=@grid-games/carom
npx turbo dev --filter=@grid-games/inlay
npx turbo dev --filter=@grid-games/trio
npx turbo dev --filter=@grid-games/jumble
```

---

## Project Structure

```
grid-games/
├── apps/
│   ├── web/           # Landing page (port 3000)
│   ├── dabble/        # Word scoring game (port 3001)
│   ├── jumble/        # Timed word search (port 3002)
│   ├── trio/          # Shape matching game (port 3003)
│   ├── carom/         # Sliding puzzle game (port 3004)
│   ├── edgewise/      # Tile rotation game (port 3005)
│   └── inlay/         # Pentomino puzzle (port 3006)
├── packages/
│   ├── ui/            # Shared React components
│   ├── config/        # Theme system & game config
│   ├── shared/        # Utilities (share, storage, dates)
│   └── dictionary/    # Word validation (Collins 2019)
├── turbo.json
├── package.json
└── vercel.json
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all apps for production |
| `npm run lint` | Run ESLint across all packages |
| `npm run type-check` | TypeScript type checking |
| `npm run clean` | Clean all build artifacts |

---

## Shared Packages

### @grid-games/ui
Shared React components: `Modal`, `Button`, `LandingScreen`, `NavBar`, `GameContainer`, `ResultsModal`, `ArchivePage`, `ToastProvider`

### @grid-games/config
Theme system with per-game accent colors and game metadata

### @grid-games/shared
Common utilities: share text generation, archive storage, date helpers, puzzle loading

### @grid-games/dictionary
Word validation using Collins Scrabble Words (2019) - 279,495 words with Trie-based lookups

---

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Monorepo**: Turborepo with npm workspaces
- **Deployment**: Vercel

---

## Game Documentation

Each game has its own `CLAUDE.md` with detailed documentation:

```
apps/dabble/CLAUDE.md
apps/carom/CLAUDE.md
apps/inlay/CLAUDE.md
apps/trio/CLAUDE.md
apps/jumble/CLAUDE.md
apps/edgewise/CLAUDE.md
```
