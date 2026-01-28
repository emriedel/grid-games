export type Direction = 'up' | 'right' | 'down' | 'left';
export type PieceType = 'target' | 'blocker';
export type GamePhase = 'landing' | 'playing' | 'finished';

/**
 * Wall bit flags for each cell
 * 0b0001 = top wall
 * 0b0010 = right wall
 * 0b0100 = bottom wall
 * 0b1000 = left wall
 */
export type WallFlags = number;

export const WALL_TOP = 0b0001;
export const WALL_RIGHT = 0b0010;
export const WALL_BOTTOM = 0b0100;
export const WALL_LEFT = 0b1000;

export interface Position {
  row: number;
  col: number;
}

export interface Piece {
  id: string;
  type: PieceType;
  position: Position;
}

export interface Board {
  size: number;
  walls: WallFlags[][];
  goal: Position;
}

export interface Puzzle {
  board: Board;
  pieces: Piece[];
  optimalMoves: number;
  date: string;
}

export interface GameState {
  phase: GamePhase;
  puzzle: Puzzle | null;
  pieces: Piece[];
  selectedPieceId: string | null;
  moveCount: number;
  isAnimating: boolean;
}

export interface Move {
  pieceId: string;
  direction: Direction;
  from: Position;
  to: Position;
}

export interface SolverState {
  positions: Position[];
  moves: number;
  path: Move[];
}
