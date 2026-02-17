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

// 3 highly-distinguishable colors (vibrant, saturated palette)
export const COLORS: ColorDefinition[] = [
  {
    id: 'red',
    name: 'Red',
    value: '#dc2626',  // Tailwind red-600
    cssVar: 'var(--trio-red)',
  },
  {
    id: 'blue',
    name: 'Blue',
    value: '#2563eb',  // Tailwind blue-600
    cssVar: 'var(--trio-blue)',
  },
  {
    id: 'gold',
    name: 'Gold',
    value: '#f59e0b',  // Tailwind amber-500
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
