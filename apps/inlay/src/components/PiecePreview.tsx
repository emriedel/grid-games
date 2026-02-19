'use client';

import { useMemo, useRef, useEffect } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { PentominoId, Rotation, DragData } from '@/types';
import { PENTOMINOES, getPentominoCells, getPentominoBounds, getAnchorCell } from '@/constants/pentominoes';

interface PiecePreviewProps {
  pentominoId: PentominoId;
  rotation: Rotation;
  isSelected?: boolean;
  isPlaced?: boolean;
  isError?: boolean;
  draggable?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export function PiecePreview({
  pentominoId,
  rotation,
  isSelected = false,
  isPlaced = false,
  isError = false,
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

  // Track drag state to prevent click from firing after drag
  const dragStartedRef = useRef(false);
  const lastDragEndRef = useRef(0);

  useEffect(() => {
    if (isDragging) {
      dragStartedRef.current = true;
    } else if (dragStartedRef.current) {
      // Drag just ended - record the timestamp
      lastDragEndRef.current = Date.now();
      dragStartedRef.current = false;
    }
  }, [isDragging]);

  // Handle click - skip if we just finished dragging (within 100ms)
  const handleClick = () => {
    const timeSinceDragEnd = Date.now() - lastDragEndRef.current;
    if (timeSinceDragEnd < 100) {
      return;
    }
    onClick?.();
  };


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

  // Fixed container sizes for consistent layout across all piece shapes
  const containerSizes = {
    small: 48,
    medium: 60,
    large: 80,  // Accommodate largest piece (I-piece at 5 cells)
  };
  const containerSize = containerSizes[size];

  return (
    <button
      ref={setNodeRef}
      {...(draggable && !isPlaced ? { ...attributes, ...listeners } : {})}
      className={`
        flex items-center justify-center rounded-lg
        transition-all duration-150 touch-none select-none
        ${isSelected && !isError ? 'ring-2 ring-[var(--accent)] animate-pulse-selected' : ''}
        ${isError ? 'ring-2 ring-red-500 animate-shake' : ''}
        ${onClick ? 'cursor-pointer hover:bg-[var(--tile-bg-selected)]' : ''}
        ${isPlaced ? 'opacity-40 grayscale' : ''}
        ${isDragging ? 'opacity-50' : ''}
      `}
      style={{
        width: containerSize,
        height: containerSize,
        backgroundColor: isError ? 'rgba(239, 68, 68, 0.2)' : isSelected ? 'var(--tile-bg-selected)' : 'var(--tile-bg)',
      }}
      onClick={handleClick}
      disabled={false}
      aria-label={`${pentomino.name}${isSelected ? ' (selected)' : ''}${isPlaced ? ' (placed)' : ''}`}
      aria-pressed={isSelected}
    >
      <div
        className="pointer-events-none"
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
              className="rounded-sm pointer-events-none"
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
