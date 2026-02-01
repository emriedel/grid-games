export interface GameInfo {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  href: string;
}

export const GAMES: GameInfo[] = [
  {
    id: 'dabble',
    name: 'Dabble',
    description: 'Place tiles to form words and get a high score on a unique daily board',
    accentColor: '#c41e3a',
    href: '/dabble',
  },
  {
    id: 'jumble',
    name: 'Jumble',
    description: 'Find as many words as you can before time runs out',
    accentColor: '#4a5d7a',
    href: '/jumble',
  },
  {
    id: 'edgewise',
    name: 'Edgewise',
    description: 'Rotate tiles to match words with their categories',
    accentColor: '#a855f7',
    href: '/edgewise',
  },
  {
    id: 'carom',
    name: 'Carom',
    description: 'Navigate pieces across the board to reach the goal in the fewest moves',
    accentColor: '#f59e0b',
    href: '/carom',
  },
];

export function getIconUrl(gameId: string): string {
  return `https://nerdcube.games/icons/${gameId}.png`;
}
