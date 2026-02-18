/**
 * Tessera Game Types
 */

/** Rotation state (0-3 representing 0°, 90°, 180°, 270°) */
export type Rotation = 0 | 1 | 2 | 3;

/** Cell offset relative to piece origin */
export interface CellOffset {
  row: number;
  col: number;
}

/** Position on the board */
export interface Position {
  row: number;
  col: number;
}

/** Pentomino piece identifier (F, I, L, N, P, T, U, V, W, X, Y, Z) */
export type PentominoId = 'F' | 'I' | 'L' | 'N' | 'P' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';

/** Pentomino piece definition with all rotation states */
export interface PentominoDefinition {
  id: PentominoId;
  name: string;
  color: string;
  /** Pre-computed rotations (0-3), each containing 5 cell offsets */
  rotations: [CellOffset[], CellOffset[], CellOffset[], CellOffset[]];
}

/** A placed piece on the board */
export interface PlacedPiece {
  pentominoId: PentominoId;
  position: Position;
  rotation: Rotation;
}

/** Board cell state */
export type CellState = 'playable' | 'dead' | 'filled';

/** Board cell with fill information */
export interface BoardCell {
  state: CellState;
  /** If filled, which pentomino occupies this cell */
  pentominoId?: PentominoId;
}

/** Game board */
export interface Board {
  cells: BoardCell[][];
  rows: number;
  cols: number;
  /** Total number of playable (non-dead) cells */
  playableCellCount: number;
}

/** Puzzle definition */
export interface Puzzle {
  id: string;
  puzzleNumber?: number;
  /** The target shape - true = playable, false = dead */
  shape: boolean[][];
  /** Name of the shape (e.g., "Heart", "Star") */
  shapeName: string;
  /** Pentomino IDs available for this puzzle */
  pentominoIds: PentominoId[];
  /** Pre-computed solution for verification */
  solution?: PlacedPiece[];
}

/** Game phase */
export type GamePhase = 'landing' | 'playing' | 'finished';

/** Game state */
export interface GameState {
  phase: GamePhase;
  puzzle: Puzzle | null;
  board: Board | null;
  /** Available pieces (not yet placed) */
  availablePieces: PentominoId[];
  /** Pieces placed on the board */
  placedPieces: PlacedPiece[];
  /** Currently selected piece in the tray */
  selectedPieceId: PentominoId | null;
  /** Current rotation for selected piece */
  selectedRotation: Rotation;
  /** Whether the puzzle has been completed */
  won: boolean;
}

/** Game actions */
export type GameAction =
  | { type: 'LOAD_PUZZLE'; puzzle: Puzzle }
  | { type: 'START_GAME' }
  | { type: 'SELECT_PIECE'; pentominoId: PentominoId }
  | { type: 'DESELECT_PIECE' }
  | { type: 'ROTATE_PIECE' }
  | { type: 'PLACE_PIECE'; position: Position }
  | { type: 'REMOVE_PIECE'; pentominoId: PentominoId }
  | { type: 'ROTATE_PLACED_PIECE'; pentominoId: PentominoId }
  | { type: 'CLEAR_ALL' }
  | { type: 'FINISH_GAME' }
  | { type: 'RESTORE_STATE'; state: Partial<GameState> };

/** Puzzle state for storage */
export interface TesseraPuzzleState {
  puzzleNumber: number;
  puzzleId?: string;
  status: 'in-progress' | 'completed';
  data: {
    placedPieces: PlacedPiece[];
    /** Rotation state for each piece in tray */
    pieceRotations: Record<string, Rotation>;
  };
}

/** Drag and drop data */
export type DragData =
  | { type: 'piece'; pentominoId: PentominoId; rotation: Rotation }
  | { type: 'board-piece'; pentominoId: PentominoId; rotation: Rotation; position: Position };
