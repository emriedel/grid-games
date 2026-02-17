'use client';

import { useMemo, useState, useCallback } from 'react';
import type { Board as BoardType, Position, PentominoId, Rotation } from '@/types';
import { Cell } from './Cell';
import { getPieceCells, canPlacePiece, findAnchorForClickedCell } from '@/lib/gameLogic';

interface BoardProps {
  board: BoardType;
  selectedPieceId: PentominoId | null;
  selectedRotation: Rotation;
  onCellClick: (position: Position) => void;
  onPieceClick: (pentominoId: PentominoId) => void;
}

export function Board({
  board,
  selectedPieceId,
  selectedRotation,
  onCellClick,
  onPieceClick,
}: BoardProps) {
  // Track hover position for preview
  const [hoverPosition, setHoverPosition] = useState<Position | null>(null);

  // Calculate valid drop targets for selected piece (cells that can be clicked to place)
  const validDropTargets = useMemo(() => {
    if (!selectedPieceId) return new Set<string>();

    const targets = new Set<string>();
    for (let row = 0; row < board.rows; row++) {
      for (let col = 0; col < board.cols; col++) {
        const clickPosition = { row, col };
        // Check if clicking this cell would result in a valid placement
        const anchor = findAnchorForClickedCell(board, selectedPieceId, clickPosition, selectedRotation);
        if (anchor) {
          targets.add(`${row},${col}`);
        }
      }
    }
    return targets;
  }, [board, selectedPieceId, selectedRotation]);

  // Calculate preview cells for hover position
  // Find anchor so that the hovered cell is part of the placed piece
  const previewCells = useMemo(() => {
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
      }
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
      className="w-full max-w-md mx-auto bg-[var(--board-bg)] p-2 rounded-lg"
      style={{ aspectRatio: `${board.cols} / ${board.rows}` }}
      onMouseLeave={handleBoardLeave}
    >
      <div style={gridStyle} className="h-full">
        {board.cells.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const key = `${rowIndex},${colIndex}`;
            const isValidDropTarget =
              selectedPieceId !== null && validDropTargets.has(key);
            const isPreview = previewCells.has(key);

            return (
              <Cell
                key={key}
                cell={cell}
                row={rowIndex}
                col={colIndex}
                isValidDropTarget={isValidDropTarget && !isPreview}
                isPreview={isPreview}
                previewPentominoId={isPreview ? selectedPieceId ?? undefined : undefined}
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
