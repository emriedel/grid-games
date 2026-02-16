import type { ShapeId } from '@/types';

/**
 * Shape definitions for Trio cards.
 * Each shape has an SVG path that fits within a 100x100 viewBox.
 */

export interface ShapeDefinition {
  id: ShapeId;
  name: string;
  // SVG path data for the shape (centered in 100x100 viewBox)
  path: string;
  // Whether this shape needs a stroke (for outline pattern)
  strokeWidth?: number;
}

// All available shapes in the pool
export const SHAPES: ShapeDefinition[] = [
  {
    id: 'circle',
    name: 'Circle',
    path: 'M 50 10 A 40 40 0 1 1 50 90 A 40 40 0 1 1 50 10',
    strokeWidth: 6,
  },
  {
    id: 'triangle',
    name: 'Triangle',
    path: 'M 50 10 L 90 85 L 10 85 Z',
    strokeWidth: 6,
  },
  {
    id: 'square',
    name: 'Square',
    path: 'M 15 15 L 85 15 L 85 85 L 15 85 Z',
    strokeWidth: 6,
  },
  {
    id: 'diamond',
    name: 'Diamond',
    path: 'M 50 5 L 95 50 L 50 95 L 5 50 Z',
    strokeWidth: 6,
  },
  {
    id: 'pentagon',
    name: 'Pentagon',
    path: 'M 50 10 L 90 40 L 75 88 L 25 88 L 10 40 Z',
    strokeWidth: 6,
  },
  {
    id: 'hexagon',
    name: 'Hexagon',
    path: 'M 50 5 L 93 27.5 L 93 72.5 L 50 95 L 7 72.5 L 7 27.5 Z',
    strokeWidth: 6,
  },
  {
    id: 'star',
    name: 'Star',
    path: 'M 50 5 L 61 39 L 97 39 L 68 61 L 79 95 L 50 73 L 21 95 L 32 61 L 3 39 L 39 39 Z',
    strokeWidth: 5,
  },
  {
    id: 'cross',
    name: 'Cross',
    path: 'M 35 10 L 65 10 L 65 35 L 90 35 L 90 65 L 65 65 L 65 90 L 35 90 L 35 65 L 10 65 L 10 35 L 35 35 Z',
    strokeWidth: 6,
  },
  {
    id: 'heart',
    name: 'Heart',
    path: 'M 50 88 C 20 60 5 40 20 25 C 35 10 50 25 50 25 C 50 25 65 10 80 25 C 95 40 80 60 50 88 Z',
    strokeWidth: 6,
  },
];

// Shape conflict groups - shapes that are too similar to appear together
// Each group can only have ONE shape used in a puzzle
export const SHAPE_CONFLICT_GROUPS: ShapeId[][] = [
  ['pentagon', 'hexagon'],  // Multi-sided polygons look similar
  ['square', 'diamond'],    // Diamond is just a rotated square
];

// Map for quick lookup
export const SHAPE_MAP: Record<ShapeId, ShapeDefinition> = Object.fromEntries(
  SHAPES.map(shape => [shape.id, shape])
) as Record<ShapeId, ShapeDefinition>;

// Get shape by ID
export function getShape(id: ShapeId): ShapeDefinition {
  return SHAPE_MAP[id];
}
