import type { PatternId } from '@/types';

/**
 * Pattern definitions for Trio cards.
 * Patterns determine how the shape is filled/rendered.
 */

export interface PatternDefinition {
  id: PatternId;
  name: string;
  description: string;
}

// All available patterns
export const PATTERNS: PatternDefinition[] = [
  {
    id: 'solid',
    name: 'Solid',
    description: 'Solid filled shape',
  },
  {
    id: 'outline',
    name: 'Outline',
    description: 'Shape outline only',
  },
  {
    id: 'striped',
    name: 'Striped',
    description: 'Diagonal stripes fill',
  },
];

// Map for quick lookup
export const PATTERN_MAP: Record<PatternId, PatternDefinition> = Object.fromEntries(
  PATTERNS.map(pattern => [pattern.id, pattern])
) as Record<PatternId, PatternDefinition>;

// Get pattern by ID
export function getPattern(id: PatternId): PatternDefinition {
  return PATTERN_MAP[id];
}
