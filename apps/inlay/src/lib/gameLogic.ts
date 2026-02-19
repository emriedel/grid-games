/**
 * Inlay Game Logic
 *
 * Core functions for pentomino placement, collision detection, and win condition.
 */

import type {
  Board,
  BoardCell,
  Position,
  PlacedPiece,
  Puzzle,
  PentominoId,
  Rotation,
  CellOffset,
} from '@/types';
import { getPentominoCells, getPentominoBounds, getAnchorCell } from '@/constants/pentominoes';

/**
 * Create an empty board from a puzzle shape
 */
export function createBoardFromShape(shape: boolean[][]): Board {
  const rows = shape.length;
  const cols = shape[0]?.length ?? 0;
  let playableCellCount = 0;

  const cells: BoardCell[][] = shape.map((row) =>
    row.map((isPlayable) => {
      if (isPlayable) {
        playableCellCount++;
        return { state: 'playable' as const };
      }
      return { state: 'dead' as const };
    })
  );

  return { cells, rows, cols, playableCellCount };
}

/**
 * Get the absolute cells a piece would occupy on the board
 */
export function getPieceCells(
  pentominoId: PentominoId,
  position: Position,
  rotation: Rotation
): Position[] {
  const offsets = getPentominoCells(pentominoId, rotation);
  return offsets.map((offset) => ({
    row: position.row + offset.row,
    col: position.col + offset.col,
  }));
}

/**
 * Check if a piece can be placed at a position
 */
export function canPlacePiece(
  board: Board,
  pentominoId: PentominoId,
  position: Position,
  rotation: Rotation,
  excludePieceId?: PentominoId
): boolean {
  const cells = getPieceCells(pentominoId, position, rotation);

  for (const cell of cells) {
    // Check bounds
    if (cell.row < 0 || cell.row >= board.rows || cell.col < 0 || cell.col >= board.cols) {
      return false;
    }

    const boardCell = board.cells[cell.row][cell.col];

    // Can't place on dead cells
    if (boardCell.state === 'dead') {
      return false;
    }

    // Can't place on cells filled by other pieces (unless it's the piece we're excluding)
    if (boardCell.state === 'filled' && boardCell.pentominoId !== excludePieceId) {
      return false;
    }
  }

  return true;
}

/**
 * Place a piece on the board
 * Returns a new board with the piece placed
 */
export function placePiece(
  board: Board,
  pentominoId: PentominoId,
  position: Position,
  rotation: Rotation
): Board {
  const cells = getPieceCells(pentominoId, position, rotation);

  // Deep copy the board cells
  const newCells: BoardCell[][] = board.cells.map((row) =>
    row.map((cell) => ({ ...cell }))
  );

  // Place the piece
  for (const cell of cells) {
    newCells[cell.row][cell.col] = {
      state: 'filled',
      pentominoId,
    };
  }

  return { ...board, cells: newCells };
}

/**
 * Remove a piece from the board
 * Returns a new board with the piece removed
 */
export function removePiece(board: Board, pentominoId: PentominoId): Board {
  const newCells: BoardCell[][] = board.cells.map((row) =>
    row.map((cell) => {
      if (cell.state === 'filled' && cell.pentominoId === pentominoId) {
        return { state: 'playable' as const };
      }
      return { ...cell };
    })
  );

  return { ...board, cells: newCells };
}

/**
 * Check if the puzzle is complete (all playable cells filled)
 */
export function isPuzzleComplete(board: Board): boolean {
  for (const row of board.cells) {
    for (const cell of row) {
      if (cell.state === 'playable') {
        return false;
      }
    }
  }
  return true;
}

/**
 * Count the number of filled cells on the board
 */
export function countFilledCells(board: Board): number {
  let count = 0;
  for (const row of board.cells) {
    for (const cell of row) {
      if (cell.state === 'filled') {
        count++;
      }
    }
  }
  return count;
}

/**
 * Find valid placement positions for a piece
 * Used for highlighting valid drop zones during drag
 */
export function findValidPlacements(
  board: Board,
  pentominoId: PentominoId,
  rotation: Rotation
): Position[] {
  const validPositions: Position[] = [];
  const bounds = getPentominoBounds(pentominoId, rotation);

  // Try all positions within the board
  for (let row = 0; row <= board.rows - bounds.rows; row++) {
    for (let col = 0; col <= board.cols - bounds.cols; col++) {
      const position = { row, col };
      if (canPlacePiece(board, pentominoId, position, rotation)) {
        validPositions.push(position);
      }
    }
  }

  return validPositions;
}

/**
 * Find the piece at a given board position
 */
export function getPieceAtPosition(
  board: Board,
  position: Position
): PentominoId | null {
  if (
    position.row < 0 ||
    position.row >= board.rows ||
    position.col < 0 ||
    position.col >= board.cols
  ) {
    return null;
  }

  const cell = board.cells[position.row][position.col];
  return cell.state === 'filled' ? (cell.pentominoId ?? null) : null;
}

/**
 * Get the position of a placed piece on the board
 * Returns the position of the piece's anchor (top-left of bounding box)
 */
export function getPlacedPiecePosition(
  board: Board,
  pentominoId: PentominoId
): Position | null {
  // Find all cells occupied by this piece
  const cells: Position[] = [];
  for (let row = 0; row < board.rows; row++) {
    for (let col = 0; col < board.cols; col++) {
      const cell = board.cells[row][col];
      if (cell.state === 'filled' && cell.pentominoId === pentominoId) {
        cells.push({ row, col });
      }
    }
  }

  if (cells.length === 0) return null;

  // Return top-left corner
  const minRow = Math.min(...cells.map((c) => c.row));
  const minCol = Math.min(...cells.map((c) => c.col));
  return { row: minRow, col: minCol };
}

/**
 * Clear all pieces from the board
 */
export function clearBoard(board: Board): Board {
  const newCells: BoardCell[][] = board.cells.map((row) =>
    row.map((cell) => {
      if (cell.state === 'filled') {
        return { state: 'playable' as const };
      }
      return { ...cell };
    })
  );

  return { ...board, cells: newCells };
}

/**
 * Apply placed pieces to a board
 */
export function applyPlacedPieces(
  initialBoard: Board,
  placedPieces: PlacedPiece[]
): Board {
  let board = initialBoard;
  for (const piece of placedPieces) {
    board = placePiece(board, piece.pentominoId, piece.position, piece.rotation);
  }
  return board;
}

/**
 * Find the anchor position for a piece such that the designated anchor cell
 * aligns with the clicked position. Returns null if placement is invalid.
 */
export function findAnchorForClickedCell(
  board: Board,
  pentominoId: PentominoId,
  clickedPosition: Position,
  rotation: Rotation
): Position | null {
  // Use the designated anchor cell for this piece/rotation
  const anchorOffset = getAnchorCell(pentominoId, rotation);
  const anchor: Position = {
    row: clickedPosition.row - anchorOffset.row,
    col: clickedPosition.col - anchorOffset.col,
  };

  if (canPlacePiece(board, pentominoId, anchor, rotation)) {
    return anchor;
  }
  return null;
}
