import type { ColorId } from '@/types';

/**
 * Color definitions for Trio cards.
 * Each color has a primary fill color.
 */

export interface ColorDefinition {
  id: ColorId;
  name: string;
  value: string;      // CSS color value
  cssVar: string;     // CSS variable name (defined in globals.css)
}

// All available colors in the pool - rich, saturated colors
export const COLORS: ColorDefinition[] = [
  {
    id: 'red',
    name: 'Red',
    value: '#dc2626',      // Deeper, richer red
    cssVar: 'var(--trio-red)',
  },
  {
    id: 'green',
    name: 'Green',
    value: '#059669',      // Emerald green - richer
    cssVar: 'var(--trio-green)',
  },
  {
    id: 'purple',
    name: 'Purple',
    value: '#7c3aed',      // Vivid violet
    cssVar: 'var(--trio-purple)',
  },
  {
    id: 'blue',
    name: 'Blue',
    value: '#2563eb',      // Royal blue - more saturated
    cssVar: 'var(--trio-blue)',
  },
  {
    id: 'orange',
    name: 'Orange',
    value: '#ea580c',      // Deeper orange
    cssVar: 'var(--trio-orange)',
  },
  {
    id: 'teal',
    name: 'Teal',
    value: '#0d9488',      // Deeper teal
    cssVar: 'var(--trio-teal)',
  },
];

// Color conflict groups - colors that are too similar to appear together
// Each group can only have ONE color used in a puzzle
export const COLOR_CONFLICT_GROUPS: ColorId[][] = [
  ['green', 'teal'],      // Both greenish
  ['red', 'orange'],      // Both warm/reddish
  ['blue', 'purple'],     // Both cool, can look similar
];

// Map for quick lookup
export const COLOR_MAP: Record<ColorId, ColorDefinition> = Object.fromEntries(
  COLORS.map(color => [color.id, color])
) as Record<ColorId, ColorDefinition>;

// Get color by ID
export function getColor(id: ColorId): ColorDefinition {
  return COLOR_MAP[id];
}
