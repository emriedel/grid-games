import {
  SquareState,
  Rotation,
  Edge,
  CategoryPosition,
  CategoryResult,
  Puzzle,
  GuessFeedback
} from '@/types';
import { CATEGORY_EDGE_MAP, CENTER_FACING_EDGES } from '@/constants/gameConfig';

/**
 * Get the word at a specific edge of a rotated square
 * Edge 0=top, 1=right, 2=bottom, 3=left (visual position)
 * Rotation: number of 90° clockwise rotations applied
 */
export function getWordAtEdge(square: SquareState, visualEdge: Edge): string {
  // To find which original word is now at visualEdge:
  // If square rotated clockwise by R, the word originally at position (visualEdge - R + 4) % 4
  // is now at visualEdge
  const originalIndex = ((visualEdge - square.rotation + 4) % 4) as Edge;
  return square.words[originalIndex];
}

/**
 * Rotate a single square clockwise by one step
 */
export function rotateSquare(square: SquareState): SquareState {
  return {
    ...square,
    rotation: ((square.rotation + 1) % 4) as Rotation,
  };
}

/**
 * Perform group rotation - swap all 4 squares' positions clockwise
 * Position order: 0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left
 * After rotation: what was at 3 goes to 0, 0→1, 1→2, 2→3
 */
export function groupRotate(squares: SquareState[]): SquareState[] {
  return [squares[3], squares[0], squares[1], squares[2]];
}

/**
 * Get the two words that face a specific category
 */
export function getWordsForCategory(
  squares: SquareState[],
  category: CategoryPosition
): [string, string] {
  const edges = CATEGORY_EDGE_MAP[category];
  return [
    getWordAtEdge(squares[edges[0].square], edges[0].edge as Edge),
    getWordAtEdge(squares[edges[1].square], edges[1].edge as Edge),
  ];
}

/**
 * Check if a category is correctly solved
 * The words facing the category must match the original words for that category
 */
export function isCategoryCorrect(
  squares: SquareState[],
  category: CategoryPosition,
  puzzle: Puzzle
): boolean {
  const currentWords = getWordsForCategory(squares, category);
  const edges = CATEGORY_EDGE_MAP[category];

  // Get the expected words from the solved puzzle
  const expectedWords = [
    puzzle.squares[edges[0].square][getEdgeName(edges[0].edge as Edge)],
    puzzle.squares[edges[1].square][getEdgeName(edges[1].edge as Edge)],
  ];

  // Check if current words match expected (order matters based on square positions)
  return currentWords[0] === expectedWords[0] && currentWords[1] === expectedWords[1];
}

/**
 * Get edge name from edge index
 */
function getEdgeName(edge: Edge): 'top' | 'right' | 'bottom' | 'left' {
  const names: ['top', 'right', 'bottom', 'left'] = ['top', 'right', 'bottom', 'left'];
  return names[edge];
}

/**
 * Check all categories and return results
 */
export function checkAllCategories(
  squares: SquareState[],
  puzzle: Puzzle
): CategoryResult[] {
  const categories: CategoryPosition[] = ['top', 'right', 'bottom', 'left'];

  return categories.map(category => ({
    category,
    correct: isCategoryCorrect(squares, category, puzzle),
    words: getWordsForCategory(squares, category),
  }));
}

/**
 * Generate feedback for a guess
 * Returns sorted array: greens (correct) first, then partial matches (yellow), then wrong (gray)
 * For simplicity, we just count correct categories
 */
export function generateFeedback(results: CategoryResult[]): GuessFeedback {
  const correctCount = results.filter(r => r.correct).length;

  // Create feedback array: 1 for correct, 0 for incorrect
  // Sorted so greens come first
  const feedback: number[] = [];
  for (let i = 0; i < correctCount; i++) feedback.push(2); // green
  for (let i = 0; i < 4 - correctCount; i++) feedback.push(0); // gray

  return feedback as GuessFeedback;
}

/**
 * Check if the puzzle is completely solved
 */
export function isPuzzleSolved(squares: SquareState[], puzzle: Puzzle): boolean {
  const results = checkAllCategories(squares, puzzle);
  return results.every(r => r.correct);
}

/**
 * Check if an edge faces the center (is a red herring)
 */
export function isEdgeFacingCenter(squareIndex: number, visualEdge: Edge): boolean {
  const centerEdges = CENTER_FACING_EDGES[squareIndex as 0 | 1 | 2 | 3];
  return (centerEdges as readonly number[]).includes(visualEdge);
}

/**
 * Get all edges of a square with their center-facing status
 */
export function getSquareEdgeInfo(
  square: SquareState,
  squareIndex: number
): Array<{ edge: Edge; word: string; facesCenter: boolean }> {
  return [0, 1, 2, 3].map(edge => ({
    edge: edge as Edge,
    word: getWordAtEdge(square, edge as Edge),
    facesCenter: isEdgeFacingCenter(squareIndex, edge as Edge),
  }));
}
