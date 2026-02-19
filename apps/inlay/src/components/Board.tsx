'use client';

import { useMemo, useState, useCallback } from 'react';
import type { Board as BoardType, Position, PentominoId, Rotation, DragData, PlacedPiece } from '@/types';
import { Cell } from './Cell';
import { getPieceCells, canPlacePiece, findAnchorForClickedCell } from '@/lib/gameLogic';
import { getAnchorCell } from '@/constants/pentominoes';

interface BoardProps {
  board: BoardType;
  selectedPieceId: PentominoId | null;
  selectedRotation: Rotation;
  activeDrag: DragData | null;
  dragOverCell: Position | null;
  placedPieces: PlacedPiece[];
  onCellClick: (position: Position) => void;
  onPieceClick: (pentominoId: PentominoId) => void;
  onInvalidPlacement?: () => void;
}

export function Board({
  board,
  selectedPieceId,
  selectedRotation,
  activeDrag,
  dragOverCell,
  placedPieces,
  onCellClick,
  onPieceClick,
  onInvalidPlacement,
}: BoardProps) {
  // Track hover position for preview
  const [hoverPosition, setHoverPosition] = useState<Position | null>(null);

  // Calculate preview cells for hover position (click-to-place)
  const hoverPreviewCells = useMemo(() => {
    if (!selectedPieceId || !hoverPosition) {
      return new Set<string>();
    }

    const anchor = findAnchorForClickedCell(board, selectedPieceId, hoverPosition, selectedRotation);
    if (!anchor) {
      return new Set<string>();
    }

    const cells = getPieceCells(selectedPieceId, anchor, selectedRotation);
    return new Set(cells.map((c) => `${c.row},${c.col}`));
  }, [board, selectedPieceId, selectedRotation, hoverPosition]);

  // Calculate preview cells for drag-and-drop
  const dragPreviewCells = useMemo(() => {
    if (!activeDrag || !dragOverCell) {
      return new Set<string>();
    }

    // Use anchor-based positioning for drag preview too
    const anchorOffset = getAnchorCell(activeDrag.pentominoId, activeDrag.rotation);
    const anchor: Position = {
      row: dragOverCell.row - anchorOffset.row,
      col: dragOverCell.col - anchorOffset.col,
    };

    if (!canPlacePiece(board, activeDrag.pentominoId, anchor, activeDrag.rotation)) {
      return new Set<string>();
    }

    const cells = getPieceCells(activeDrag.pentominoId, anchor, activeDrag.rotation);
    return new Set(cells.map((c) => `${c.row},${c.col}`));
  }, [board, activeDrag, dragOverCell]);

  // Build a map of pentominoId -> rotation from placedPieces
  const pieceRotationMap = useMemo(() => {
    const map = new Map<PentominoId, Rotation>();
    for (const piece of placedPieces) {
      map.set(piece.pentominoId, piece.rotation);
    }
    return map;
  }, [placedPieces]);

  // Get the pentominoId currently being dragged from board (to hide its cells)
  const draggingFromBoardPieceId = activeDrag?.type === 'board-piece' ? activeDrag.pentominoId : null;

  const handleCellClick = (row: number, col: number) => {
    const cell = board.cells[row][col];
    const clickPosition = { row, col };

    // If clicking on a filled cell, remove that piece
    if (cell.state === 'filled' && cell.pentominoId) {
      onPieceClick(cell.pentominoId);
      return;
    }

    // If we have a selected piece, find anchor so clicked cell is part of the piece
    if (selectedPieceId && cell.state === 'playable') {
      const anchor = findAnchorForClickedCell(board, selectedPieceId, clickPosition, selectedRotation);
      if (anchor) {
        onCellClick(anchor);
      } else {
        // Invalid placement - notify parent
        onInvalidPlacement?.();
      }
    } else if (selectedPieceId && cell.state === 'dead') {
      // Clicked on dead cell with selected piece - also invalid
      onInvalidPlacement?.();
    }
  };

  const handleCellHover = useCallback((row: number, col: number) => {
    setHoverPosition({ row, col });
  }, []);

  const handleBoardLeave = useCallback(() => {
    setHoverPosition(null);
  }, []);

  // Calculate grid size based on board dimensions
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${board.cols}, 1fr)`,
    gridTemplateRows: `repeat(${board.rows}, 1fr)`,
    gap: '2px',
  };

  return (
    <div
      className="w-full bg-[var(--board-bg)] p-1.5 sm:p-2 rounded-lg overflow-hidden"
      style={{ aspectRatio: `${board.cols} / ${board.rows}` }}
      onMouseLeave={handleBoardLeave}
    >
      <div style={gridStyle} className="h-full">
        {board.cells.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const key = `${rowIndex},${colIndex}`;
            const isHoverPreview = hoverPreviewCells.has(key);
            const isDragPreview = dragPreviewCells.has(key);

            // Hide cells of piece being dragged from board
            const isBeingDragged = draggingFromBoardPieceId !== null &&
              cell.state === 'filled' &&
              cell.pentominoId === draggingFromBoardPieceId;

            // Get rotation for this cell's piece (for drag data)
            const pieceRotation = cell.pentominoId ? pieceRotationMap.get(cell.pentominoId) ?? 0 : 0;

            return (
              <Cell
                key={key}
                cell={isBeingDragged ? { state: 'playable' } : cell}
                row={rowIndex}
                col={colIndex}
                isPreview={isHoverPreview}
                isDragPreview={isDragPreview}
                previewPentominoId={
                  isDragPreview
                    ? activeDrag?.pentominoId
                    : isHoverPreview
                      ? selectedPieceId ?? undefined
                      : undefined
                }
                pieceRotation={pieceRotation}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                onMouseEnter={() => handleCellHover(rowIndex, colIndex)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
