# Adding a New Game to The Grid

Use this skill when creating a new game for the Grid Games monorepo.

---

## Step 1: Copy Template

```bash
cp -r apps/dabble apps/new-game
```

## Step 2: Update Package Identity

Edit `apps/new-game/package.json`:
```json
{
  "name": "@grid-games/new-game",
  "scripts": {
    "dev": "next dev --port 3003",
    "start": "next start --port 3003"
  }
}
```

## Step 3: Define Theme

Edit `apps/new-game/src/app/globals.css`:
```css
:root {
  /* Base tokens (keep these consistent) */
  --background: #0a0a0a;
  --foreground: #ededed;
  --muted: #a1a1aa;
  --border: #27272a;

  /* Game theme - Your accent color */
  --accent: #your-color;
  --accent-foreground: #text-on-accent;
  --accent-secondary: #secondary-color;

  /* Tile styling */
  --tile-bg: #your-tile-bg;
  --tile-bg-selected: #your-tile-selected;
  --tile-border: #your-tile-border;

  /* Status colors (keep consistent) */
  --success: #22c55e;
  --warning: #eab308;
  --danger: #ef4444;
}
```

## Step 4: Create Game Config

Create `apps/new-game/src/config.ts`:
```tsx
import { defineGameConfig } from '@grid-games/config';
import { formatDisplayDate, getTodayDateString, getPuzzleNumber } from '@grid-games/shared';

const PUZZLE_BASE_DATE = new Date('2026-01-01');

export const newGameConfig = defineGameConfig({
  id: 'new-game',
  name: 'New Game',
  emoji: '🎮',
  description: 'Your game description.',
  theme: { /* your theme */ },
  homeUrl: '/',
  getPuzzleInfo: () => ({
    number: getPuzzleNumber(PUZZLE_BASE_DATE),
    date: formatDisplayDate(getTodayDateString()),
  }),
});
```

## Step 5: Update Game.tsx Structure

Use the shared components:
```tsx
import { LandingScreen, NavBar, GameContainer, Button, Modal } from '@grid-games/ui';
import { newGameConfig } from '@/config';

// Implement landing → playing → finished state machine
```

## Step 6: Add to Landing Page

Edit `apps/web/src/app/page.tsx`:
```tsx
const games: GameCard[] = [
  // ... existing games
  {
    id: 'new-game',
    name: 'New Game',
    description: 'Description here.',
    accentColor: '#your-color',
    emoji: '🎮',
    href: '/new-game',
  },
];
```

## Step 7: Add to Config Package (Optional)

If the theme should be programmatically accessible, add to `packages/config/src/theme.ts`:
```tsx
export const newGameTheme: GameTheme = {
  accent: '#your-color',
  accentForeground: '#text-color',
  // ...
};
```

## Step 8: Deploy to Vercel

### 8a. Deploy the new game app

1. Go to https://vercel.com/new
2. Import the `grid-games` GitHub repo
3. Set **Root Directory** to `apps/new-game`
4. Add Environment Variable: `NEXT_PUBLIC_BASE_PATH` = `/new-game`
5. Deploy and note the URL (e.g., `grid-games-new-game.vercel.app`)
6. Verify it works at `https://grid-games-new-game.vercel.app/new-game`

### 8b. Add rewrite to the web app

Edit `apps/web/next.config.ts` and add rewrites for the new game:
```typescript
{
  source: '/new-game',
  destination: 'https://grid-games-new-game.vercel.app/new-game',
},
{
  source: '/new-game/:path*',
  destination: 'https://grid-games-new-game.vercel.app/new-game/:path*',
},
```

### 8c. Push and redeploy

```bash
git add .
git commit -m "Add new-game to deployment"
git push
```

The web app will automatically redeploy with the new rewrites.

---

## Checklist

- [ ] Package.json updated with unique name and port
- [ ] Theme CSS variables defined in globals.css
- [ ] Game config created in src/config.ts
- [ ] Game.tsx uses shared LandingScreen, NavBar, GameContainer
- [ ] Added to landing page in apps/web
- [ ] Deployed to Vercel
- [ ] Rewrites added to apps/web/next.config.ts
- [ ] Game-specific CLAUDE.md created in apps/new-game/
