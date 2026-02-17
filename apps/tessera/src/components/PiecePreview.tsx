'use client';

import { useMemo } from 'react';
import type { PentominoId, Rotation } from '@/types';
import { PENTOMINOES, getPentominoCells, getPentominoBounds } from '@/constants/pentominoes';

interface PiecePreviewProps {
  pentominoId: PentominoId;
  rotation: Rotation;
  isSelected?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export function PiecePreview({
  pentominoId,
  rotation,
  isSelected = false,
  size = 'medium',
  onClick,
}: PiecePreviewProps) {
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

  // Size configurations
  const sizeConfig = {
    small: { cellSize: 8, gap: 1, padding: 4 },
    medium: { cellSize: 10, gap: 1, padding: 6 },
    large: { cellSize: 14, gap: 2, padding: 8 },
  };

  const config = sizeConfig[size];
  const totalWidth = bounds.cols * config.cellSize + (bounds.cols - 1) * config.gap + config.padding * 2;
  const totalHeight = bounds.rows * config.cellSize + (bounds.rows - 1) * config.gap + config.padding * 2;

  // Make the container square for consistent layout
  const containerSize = Math.max(totalWidth, totalHeight, size === 'small' ? 44 : size === 'medium' ? 56 : 72);

  return (
    <button
      className={`
        flex items-center justify-center rounded-lg
        transition-all duration-150
        ${isSelected ? 'ring-2 ring-[var(--accent)] animate-pulse-selected' : ''}
        ${onClick ? 'cursor-pointer hover:bg-[var(--tile-bg-selected)]' : ''}
      `}
      style={{
        width: containerSize,
        height: containerSize,
        backgroundColor: isSelected ? 'var(--tile-bg-selected)' : 'var(--tile-bg)',
      }}
      onClick={onClick}
      aria-label={`${pentomino.name}${isSelected ? ' (selected)' : ''}`}
      aria-pressed={isSelected}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${bounds.cols}, ${config.cellSize}px)`,
          gridTemplateRows: `repeat(${bounds.rows}, ${config.cellSize}px)`,
          gap: `${config.gap}px`,
        }}
      >
        {grid.map((row, rowIndex) =>
          row.map((filled, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="rounded-sm"
              style={{
                backgroundColor: filled ? pentomino.color : 'transparent',
                width: config.cellSize,
                height: config.cellSize,
              }}
            />
          ))
        )}
      </div>
    </button>
  );
}
