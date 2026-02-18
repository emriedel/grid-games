'use client';

import { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { PentominoId, Rotation, DragData } from '@/types';
import { PENTOMINOES, getPentominoCells, getPentominoBounds, getAnchorCell } from '@/constants/pentominoes';

interface PiecePreviewProps {
  pentominoId: PentominoId;
  rotation: Rotation;
  isSelected?: boolean;
  isPlaced?: boolean;
  draggable?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export function PiecePreview({
  pentominoId,
  rotation,
  isSelected = false,
  isPlaced = false,
  draggable = false,
  size = 'medium',
  onClick,
}: PiecePreviewProps) {
  const pentomino = PENTOMINOES[pentominoId];
  const cells = getPentominoCells(pentominoId, rotation);
  const bounds = getPentominoBounds(pentominoId, rotation);
  const anchorCell = getAnchorCell(pentominoId, rotation);

  // Set up draggable
  const dragData: DragData = { type: 'piece', pentominoId, rotation };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `piece-${pentominoId}`,
    data: dragData,
    disabled: isPlaced || !draggable,
  });

  // Create a grid representation with anchor info
  const grid = useMemo(() => {
    const g: { filled: boolean; isAnchor: boolean }[][] = [];
    for (let row = 0; row < bounds.rows; row++) {
      const rowCells: { filled: boolean; isAnchor: boolean }[] = [];
      for (let col = 0; col < bounds.cols; col++) {
        rowCells.push({ filled: false, isAnchor: false });
      }
      g.push(rowCells);
    }
    for (const cell of cells) {
      const isAnchor = cell.row === anchorCell.row && cell.col === anchorCell.col;
      g[cell.row][cell.col] = { filled: true, isAnchor };
    }
    return g;
  }, [cells, bounds, anchorCell]);

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
      ref={setNodeRef}
      {...(draggable && !isPlaced ? { ...attributes, ...listeners } : {})}
      className={`
        flex items-center justify-center rounded-lg
        transition-all duration-150 touch-none
        ${isSelected ? 'ring-2 ring-[var(--accent)] animate-pulse-selected' : ''}
        ${onClick && !isPlaced ? 'cursor-pointer hover:bg-[var(--tile-bg-selected)]' : ''}
        ${isPlaced ? 'opacity-40 grayscale pointer-events-none' : ''}
        ${isDragging ? 'opacity-50' : ''}
      `}
      style={{
        width: containerSize,
        height: containerSize,
        backgroundColor: isSelected ? 'var(--tile-bg-selected)' : 'var(--tile-bg)',
      }}
      onClick={isPlaced ? undefined : onClick}
      disabled={isPlaced}
      aria-label={`${pentomino.name}${isSelected ? ' (selected)' : ''}${isPlaced ? ' (placed)' : ''}`}
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
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className="rounded-sm"
              style={{
                backgroundColor: cell.filled ? pentomino.color : 'transparent',
                width: config.cellSize,
                height: config.cellSize,
                boxSizing: 'border-box',
                ...(cell.isAnchor && !isPlaced ? {
                  boxShadow: 'inset 0 0 0 2px rgba(255, 255, 255, 0.8)',
                } : {}),
              }}
            />
          ))
        )}
      </div>
    </button>
  );
}
