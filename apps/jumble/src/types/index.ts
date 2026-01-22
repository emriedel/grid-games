export interface Position {
  row: number;
  col: number;
}

export interface Tile {
  letter: string;
  position: Position;
}

export type Board = string[][];

export interface FoundWord {
  word: string;
  score: number;
  path: Position[];
}

export type GameStatus = 'loading' | 'ready' | 'playing' | 'finished';

export interface GameState {
  board: Board;
  foundWords: FoundWord[];
  currentPath: Position[];
  currentWord: string;
  status: GameStatus;
  timeRemaining: number;
  puzzleNumber: number;
}

export interface GameStats {
  gamesPlayed: number;
  totalScore: number;
  totalWords: number;
  bestScore: number;
  bestWordCount: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string | null;
}

export interface DailyResult {
  puzzleNumber: number;
  date: string;
  wordsFound: number;
  totalPossibleWords: number;
  score: number;
  maxPossibleScore: number;
}
