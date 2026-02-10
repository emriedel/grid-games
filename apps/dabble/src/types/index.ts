// Core game types for Dabble

export type BonusType = 'DL' | 'TL' | 'DW' | 'TW' | 'START' | null;

export interface Cell {
  row: number;
  col: number;
  bonus: BonusType;
  isPlayable: boolean; // false = dead space
  letter: string | null;
  isLocked: boolean; // true = part of a previously placed word
}

export interface PlacedTile {
  row: number;
  col: number;
  letter: string;
  rackIndex?: number; // Track which rack letter this came from (optional for submitted words)
}

export interface Word {
  word: string;
  tiles: PlacedTile[];
  score: number;
  startRow: number;
  startCol: number;
  direction: 'horizontal' | 'vertical';
}

export interface GameBoard {
  cells: Cell[][];
  size: number;
}

// Star thresholds for a puzzle (determined by heuristic solver)
// Only stores heuristicMax - star1/star2/star3 are calculated at runtime
// using STAR_THRESHOLDS percentages from constants/gameConfig.ts
export interface StarThresholds {
  heuristicMax: number; // Best score found by beam search
}

export interface DailyPuzzle {
  date: string; // YYYY-MM-DD
  board: GameBoard;
  letters: string[];
  seed: number;
  archetype?: string; // Board archetype used for generation (debug info)
  thresholds?: StarThresholds; // Star thresholds (from pre-generated puzzles)
  puzzleId?: string; // Unique puzzle identifier for storage key
}

export interface GameState {
  puzzle: DailyPuzzle;
  placedTiles: PlacedTile[];
  rackLetters: string[];
  submittedWords: Word[];
  totalScore: number;
  isComplete: boolean;
}

export interface ShareResult {
  date: string;
  words: { word: string; score: number }[];
  totalScore: number;
}

// Letter tile with its point value
export interface LetterTile {
  letter: string;
  points: number;
}

// Drag-and-drop data for tiles
export type DragData =
  | { type: 'rack-tile'; letter: string; rackIndex: number }
  | { type: 'board-tile'; letter: string; row: number; col: number; rackIndex: number };
