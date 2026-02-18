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
  accent: '#2563eb',        // vibrant blue (blue-600)
  accentForeground: '#ffffff',
  accentSecondary: '#1d4ed8', // blue-700
  tileBg: '#1a1a2e',
  tileBgSelected: '#4a5580',
  tileBorder: '#2d2d44',
};

/** Edgewise game theme - purple accent */
export const edgewiseTheme: GameTheme = {
  ...baseTheme,
  accent: '#9333ea',        // deeper purple (purple-600)
  accentForeground: '#ffffff',
  accentSecondary: '#7c3aed', // violet-600
  tileBg: '#1e1b4b',        // indigo-950
  tileBgSelected: '#312e81', // indigo-900
  tileBorder: '#4c1d95',    // purple-800
};

/** Trio game theme - cyan accent */
export const trioTheme: GameTheme = {
  ...baseTheme,
  accent: '#06b6d4',        // vibrant cyan (cyan-500)
  accentForeground: '#000000', // dark text for bright cyan
  accentSecondary: '#0891b2', // cyan-600
  tileBg: '#1c1c1c',
  tileBgSelected: '#2a4a47',
  tileBorder: '#3f3f46',
};

/** Tessera game theme - emerald green accent */
export const tesseraTheme: GameTheme = {
  ...baseTheme,
  accent: '#0da678',        // brighter emerald
  accentForeground: '#ffffff',
  accentSecondary: '#059669', // emerald-600 (old accent as secondary)
  tileBg: '#1c1c1c',
  tileBgSelected: '#1a4a3a',
  tileBorder: '#3f3f46',
};

/** Game identifiers */
export type GameId = 'dabble' | 'jumble' | 'edgewise' | 'trio' | 'tessera';

/** Map of all game themes */
export const gameThemes: Record<GameId, GameTheme> = {
  dabble: dabbleTheme,
  jumble: jumbleTheme,
  edgewise: edgewiseTheme,
  trio: trioTheme,
  tessera: tesseraTheme,
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
