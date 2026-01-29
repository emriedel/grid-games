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
  obstacles: Position[]; // Solid blocks that pieces cannot pass through or land on
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

// L-wall orientations: NE, NW, SE, SW indicate which corner the L opens toward
export type LWallOrientation = 'NE' | 'NW' | 'SE' | 'SW';

// Reverse move for backward puzzle generation
export interface ReverseMove {
  pieceId: string;
  fromPosition: Position; // Where the piece ends up (current position in backward gen)
  toPosition: Position; // Where the piece came from (origin before the move)
  direction: Direction; // The direction the piece traveled to get to fromPosition
  stoppedBy: 'wall' | 'edge' | 'piece' | 'obstacle';
  distance: number;
}
