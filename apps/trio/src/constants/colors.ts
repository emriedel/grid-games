import type { ColorId } from '@/types';

/**
 * Color definitions for Trio cards.
 * 3 highly-distinguishable colors: Red, Blue, Gold.
 */

export interface ColorDefinition {
  id: ColorId;
  name: string;
  value: string;      // CSS color value
  cssVar: string;     // CSS variable name (defined in globals.css)
}

// 3 highly-distinguishable colors (Jewel Tones palette - brightened for dark bg)
export const COLORS: ColorDefinition[] = [
  {
    id: 'red',
    name: 'Ruby',
    value: '#db2777',  // Jewel tone ruby (pink-600)
    cssVar: 'var(--trio-red)',
  },
  {
    id: 'blue',
    name: 'Sapphire',
    value: '#3b82f6',  // Jewel tone sapphire (blue-500)
    cssVar: 'var(--trio-blue)',
  },
  {
    id: 'gold',
    name: 'Emerald',
    value: '#10b981',  // Jewel tone emerald (emerald-500)
    cssVar: 'var(--trio-gold)',
  },
];

// Map for quick lookup
export const COLOR_MAP: Record<ColorId, ColorDefinition> = Object.fromEntries(
  COLORS.map(color => [color.id, color])
) as Record<ColorId, ColorDefinition>;

// Get color by ID
export function getColor(id: ColorId): ColorDefinition {
  return COLOR_MAP[id];
}
