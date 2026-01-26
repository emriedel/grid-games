// Edge positions (clockwise from top)
export type Edge = 0 | 1 | 2 | 3; // 0=top, 1=right, 2=bottom, 3=left

// Rotation states (number of 90° clockwise rotations)
export type Rotation = 0 | 1 | 2 | 3;

// Square position in the 2x2 grid
export type SquarePosition = 0 | 1 | 2 | 3; // 0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left

// Category positions on the border
export type CategoryPosition = 'top' | 'right' | 'bottom' | 'left';

// Stored puzzle format (solved configuration)
export interface PuzzleSquare {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface Puzzle {
  date: string; // YYYY-MM-DD
  categories: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  squares: [PuzzleSquare, PuzzleSquare, PuzzleSquare, PuzzleSquare];
}

// Runtime state for a square
export interface SquareState {
  words: [string, string, string, string]; // [top, right, bottom, left] in original orientation
  rotation: Rotation;
}

// Feedback for a single guess (number of correct categories)
export type GuessFeedback = [number, number, number, number]; // sorted: greens first, then yellows, then grays

// Full game statistics
export interface GameStats {
  guessesUsed: number;
  solved: boolean;
  feedbackHistory: GuessFeedback[];
}

// Daily result for localStorage
export interface DailyResult {
  date: string;
  puzzleNumber: number;
  solved: boolean;
  guessesUsed: number;
  feedbackHistory: GuessFeedback[];
}

// Game state enum
export type GameState = 'landing' | 'playing' | 'finished';

// Category check result
export interface CategoryResult {
  category: CategoryPosition;
  correct: boolean;
  words: [string, string];
}
