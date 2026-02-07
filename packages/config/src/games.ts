export interface GameInfo {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  href: string;
  hasArchive?: boolean;
}

export const GAMES: GameInfo[] = [
  {
    id: 'carom',
    name: 'Carom',
    description: 'Slide pieces around a grid to reach the goal in the fewest moves',
    accentColor: '#f59e0b',
    href: '/carom',
    hasArchive: true,
  },
  {
    id: 'dabble',
    name: 'Dabble',
    description: 'Build the highest-scoring words on a unique daily board',
    accentColor: '#c41e3a',
    href: '/dabble',
    hasArchive: true,
  },
  {
    id: 'jumble',
    name: 'Jumble',
    description: 'Find words in a grid of letters before time runs out',
    accentColor: '#4a5d7a',
    href: '/jumble',
    hasArchive: true,
  },
  // Edgewise hidden from navigation (project still exists)
  // {
  //   id: 'edgewise',
  //   name: 'Edgewise',
  //   description: 'Rotate tiles to match words with their categories',
  //   accentColor: '#a855f7',
  //   href: '/edgewise',
  //   hasArchive: false,
  // },
];

export function getIconUrl(gameId: string): string {
  return `https://nerdcube.games/icons/${gameId}.png`;
}
