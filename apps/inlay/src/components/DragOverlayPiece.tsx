'use client';

import { useMemo } from 'react';
import type { PentominoId, Rotation } from '@/types';
import { PENTOMINOES, getPentominoCells, getPentominoBounds } from '@/constants/pentominoes';

interface DragOverlayPieceProps {
  pentominoId: PentominoId;
  rotation: Rotation;
  cellSize: number;
  isValid: boolean;
}

/**
 * Renders a pentomino piece for use in DragOverlay.
 * Matches the board cell appearance with proper sizing.
 */
export function DragOverlayPiece({
  pentominoId,
  rotation,
  cellSize,
  isValid,
}: DragOverlayPieceProps) {
  const pentomino = PENTOMINOES[pentominoId];
  const cells = getPentominoCells(pentominoId, rotation);
  const bounds = getPentominoBounds(pentominoId, rotation);

  // Create a grid representation
  const grid = useMemo(() => {
    const g: boolean[][] = [];
    for (let row = 0; row < bounds.rows; row++) {
      const rowCells: boolean[] = [];
      for (let col = 0; col < bounds.cols; col++) {
        rowCells.push(false);
      }
      g.push(rowCells);
    }
    for (const cell of cells) {
      g[cell.row][cell.col] = true;
    }
    return g;
  }, [cells, bounds]);

  // Match the board's gap of 2px
  const gap = 2;

  return (
    <div
      className="pointer-events-none"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${bounds.cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${bounds.rows}, ${cellSize}px)`,
        gap: `${gap}px`,
        filter: isValid ? 'none' : 'grayscale(0.7) brightness(0.8)',
        opacity: isValid ? 0.85 : 0.5,
      }}
    >
      {grid.map((row, rowIndex) =>
        row.map((isFilled, colIndex) => (
          <div
            key={`${rowIndex}-${colIndex}`}
            className="rounded-sm"
            style={{
              backgroundColor: isFilled ? pentomino.color : 'transparent',
              width: cellSize,
              height: cellSize,
              opacity: isFilled ? 0.85 : 0,
            }}
          />
        ))
      )}
    </div>
  );
}
