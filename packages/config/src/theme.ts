/**
 * Theme contract for all Nerdcube Games
 * Each game defines its theme using this interface
 */
export interface GameTheme {
  /** Primary accent color for the game */
  accent: string;
  /** Text color on accent backgrounds */
  accentForeground: string;
  /** Secondary accent (optional) */
  accentSecondary?: string;

  // Base tokens (games can override these)
  background?: string;
  foreground?: string;
  muted?: string;
  border?: string;

  // Game-specific tokens
  tileBg?: string;
  tileBgSelected?: string;
  tileBorder?: string;

  // Status colors
  success?: string;
  warning?: string;
  danger?: string;
}

/** Base theme tokens shared across all games */
export const baseTheme = {
  background: '#0a0a0a',
  foreground: '#ededed',
  muted: '#a1a1aa',
  border: '#27272a',
  success: '#22c55e',
  warning: '#eab308',
  danger: '#ef4444',
} as const;

/** Dabble (Scrabble) game theme - red accent */
export const dabbleTheme: GameTheme = {
  ...baseTheme,
  accent: '#c41e3a',        // crimson red
  accentForeground: '#ffffff',
  accentSecondary: '#8b1429', // darker red
  tileBg: '#292524',        // stone-800
  tileBgSelected: '#44403c', // stone-700
  tileBorder: '#57534e',    // stone-600
};

/** Jumble game theme - blue accent */
export const jumbleTheme: GameTheme = {
  ...baseTheme,
  accent: '#6b8ab8',        // brighter slate blue
  accentForeground: '#ffffff',
  accentSecondary: '#3d5a7f', // mid-tone navy
  tileBg: '#1a1a2e',
  tileBgSelected: '#4a5580',
  tileBorder: '#2d2d44',
};

/** Edgewise game theme - purple accent */
export const edgewiseTheme: GameTheme = {
  ...baseTheme,
  accent: '#a855f7',        // purple-500
  accentForeground: '#faf5ff',
  accentSecondary: '#7e22ce', // purple-700
  tileBg: '#1e1b4b',        // indigo-950
  tileBgSelected: '#312e81', // indigo-900
  tileBorder: '#4c1d95',    // purple-800
};

/** Game identifiers */
export type GameId = 'dabble' | 'jumble' | 'edgewise';

/** Map of all game themes */
export const gameThemes: Record<GameId, GameTheme> = {
  dabble: dabbleTheme,
  jumble: jumbleTheme,
  edgewise: edgewiseTheme,
};

/**
 * Generate CSS custom properties from a theme
 */
export function themeToCssVars(theme: GameTheme): Record<string, string> {
  return {
    '--accent': theme.accent,
    '--accent-foreground': theme.accentForeground,
    '--accent-secondary': theme.accentSecondary || theme.accent,
    '--background': theme.background || baseTheme.background,
    '--foreground': theme.foreground || baseTheme.foreground,
    '--muted': theme.muted || baseTheme.muted,
    '--border': theme.border || baseTheme.border,
    '--tile-bg': theme.tileBg || '#1a1a2e',
    '--tile-bg-selected': theme.tileBgSelected || '#4a4a6e',
    '--tile-border': theme.tileBorder || '#2d2d44',
    '--success': theme.success || baseTheme.success,
    '--warning': theme.warning || baseTheme.warning,
    '--danger': theme.danger || baseTheme.danger,
  };
}
