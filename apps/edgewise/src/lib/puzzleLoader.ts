import seedrandom from 'seedrandom';
import { Puzzle, SquareState, Rotation, PuzzleSquare } from '@/types';
import { getTodayDateString } from '@grid-games/shared';
import { groupRotate } from './gameLogic';

// Import puzzles from JSON
import puzzlesData from '../../public/puzzles/puzzles.json';

// Type assertion needed because JSON inference doesn't know squares is always a 4-tuple
const puzzles: Puzzle[] = puzzlesData.puzzles.map(p => ({
  ...p,
  squares: p.squares as [PuzzleSquare, PuzzleSquare, PuzzleSquare, PuzzleSquare],
}));

/**
 * Get the puzzle for a specific date
 * Falls back to a random puzzle if date not found
 */
export function getPuzzleForDate(dateStr: string): Puzzle | null {
  // First try to find exact date match
  const exactMatch = puzzles.find(p => p.date === dateStr);
  if (exactMatch) return exactMatch;

  // Fallback: use date as seed to pick a puzzle
  if (puzzles.length === 0) return null;

  const rng = seedrandom(dateStr);
  const index = Math.floor(rng() * puzzles.length);
  return puzzles[index];
}

/**
 * Get today's puzzle
 */
export function getTodayPuzzle(): Puzzle | null {
  return getPuzzleForDate(getTodayDateString());
}

/**
 * Generate initial rotations for squares based on date
 * Same date always produces same scramble
 */
export function getInitialRotations(dateStr: string): [Rotation, Rotation, Rotation, Rotation] {
  const rng = seedrandom(dateStr + '-scramble');
  return [
    Math.floor(rng() * 4) as Rotation,
    Math.floor(rng() * 4) as Rotation,
    Math.floor(rng() * 4) as Rotation,
    Math.floor(rng() * 4) as Rotation,
  ];
}

/**
 * Generate initial group rotations based on date
 * Returns number of group rotations (0-3) to apply
 */
export function getInitialGroupRotations(dateStr: string): number {
  const rng = seedrandom(dateStr + '-group-scramble');
  return Math.floor(rng() * 4);
}

/**
 * Convert puzzle to initial game state with scrambled rotations and positions
 */
export function initializeGameState(puzzle: Puzzle, dateStr: string): SquareState[] {
  const rotations = getInitialRotations(dateStr);
  const groupRotationCount = getInitialGroupRotations(dateStr);

  let squares: SquareState[] = puzzle.squares.map((square, index) => ({
    words: [square.top, square.right, square.bottom, square.left],
    rotation: rotations[index],
  }));

  // Apply group rotations for position scrambling
  for (let i = 0; i < groupRotationCount; i++) {
    squares = groupRotate(squares);
  }

  return squares;
}

/**
 * Get the puzzle number based on date
 */
export function getPuzzleNumber(baseDate: Date, currentDate?: Date): number {
  const current = currentDate || new Date();
  const diffTime = current.getTime() - baseDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

/**
 * Get a random puzzle (for debug mode)
 */
export function getRandomPuzzle(): { puzzle: Puzzle; dateStr: string } | null {
  if (puzzles.length === 0) return null;

  const randomDate = new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000);
  const dateStr = randomDate.toISOString().split('T')[0];
  const rng = seedrandom(dateStr);
  const index = Math.floor(rng() * puzzles.length);

  return { puzzle: puzzles[index], dateStr };
}
