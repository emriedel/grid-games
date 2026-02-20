export interface GameInfo {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  href: string;
  hasArchive?: boolean;
  launchDate?: string; // 'YYYY-MM-DD' format for puzzle numbering
}

export const GAMES: GameInfo[] = [
  {
    id: 'dabble',
    name: 'Dabble',
    description: 'Build the highest-scoring words on a unique daily board',
    accentColor: '#c41e3a',
    href: '/dabble',
    hasArchive: true,
    launchDate: '2026-02-01',
  },
  {
    id: 'carom',
    name: 'Carom',
    description: 'Slide pieces around a grid to reach the goal in the fewest moves',
    accentColor: '#f59e0b',
    href: '/carom',
    hasArchive: true,
    launchDate: '2026-02-01',
  },
  {
    id: 'inlay',
    name: 'Inlay',
    description: 'Fill the target shape using pentomino pieces',
    accentColor: '#0da678',
    href: '/inlay',
    hasArchive: true,
    launchDate: '2026-02-01',
  },
  {
    id: 'trio',
    name: 'Trio',
    description: 'Find all five groups of shapes that make up a Trio',
    accentColor: '#06b6d4',
    href: '/trio',
    hasArchive: true,
    launchDate: '2026-02-01',
  },
  {
    id: 'jumble',
    name: 'Jumble',
    description: 'Find words in a grid of letters before time runs out',
    accentColor: '#2563eb',
    href: '/jumble',
    hasArchive: true,
    launchDate: '2026-02-01',
  },
  // {
  //   id: 'edgewise',
  //   name: 'Edgewise',
  //   description: 'Rotate tiles to match words with their categories',
  //   accentColor: '#9333ea',
  //   href: '/edgewise',
  //   hasArchive: true,
  //   launchDate: '2026-02-01',
  // },
];

export function getIconUrl(gameId: string): string {
  return `https://nerdcube.games/icons/${gameId}.png`;
}
