import { GameTheme } from './theme';

/**
 * Configuration interface for Grid Games
 * Each game defines this to integrate with shared UI components
 */
export interface GameConfig {
  /** Unique game identifier */
  id: string;
  /** Display name shown in UI */
  name: string;
  /** Emoji icon for the game */
  emoji: string;
  /** Brief description */
  description: string;
  /** Game theme configuration */
  theme: GameTheme;
  /** Function to get current puzzle info */
  getPuzzleInfo: () => { number?: number; date: string };
  /** URL to navigate back to home */
  homeUrl: string;
}

/**
 * Helper to create a game config with type safety
 */
export function defineGameConfig(config: GameConfig): GameConfig {
  return config;
}
