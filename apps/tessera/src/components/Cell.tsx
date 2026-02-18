'use client';

import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { BoardCell, PentominoId } from '@/types';
import { PENTOMINOES } from '@/constants/pentominoes';

interface CellProps {
  cell: BoardCell;
  row: number;
  col: number;
  isValidDropTarget?: boolean;
  isPreview?: boolean;
  previewPentominoId?: PentominoId;
  isDragPreview?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
}

export function Cell({
  cell,
  row,
  col,
  isValidDropTarget = false,
  isPreview = false,
  previewPentominoId,
  isDragPreview = false,
  onClick,
  onMouseEnter,
}: CellProps) {
  // Set up droppable
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${row}-${col}`,
    data: { row, col },
    disabled: cell.state !== 'playable',
  });

  const backgroundColor = useMemo(() => {
    if (cell.state === 'dead') {
      return 'var(--cell-dead)';
    }
    if ((isPreview || isDragPreview) && previewPentominoId) {
      return PENTOMINOES[previewPentominoId].color;
    }
    if (cell.state === 'filled' && cell.pentominoId) {
      return PENTOMINOES[cell.pentominoId].color;
    }
    if (isValidDropTarget || isOver) {
      return 'var(--accent-secondary)';
    }
    return 'var(--cell-playable)';
  }, [cell.state, cell.pentominoId, isValidDropTarget, isPreview, isDragPreview, previewPentominoId, isOver]);

  const opacity = isPreview || isDragPreview ? 0.6 : 1;

  // Dead cells are not interactive
  if (cell.state === 'dead') {
    return (
      <div
        className="aspect-square rounded-sm"
        style={{ backgroundColor }}
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`
        aspect-square rounded-sm cursor-pointer
        transition-colors duration-150
        ${cell.state === 'filled' ? 'animate-piece-place' : ''}
        ${isValidDropTarget ? 'ring-2 ring-[var(--accent)] ring-opacity-50' : ''}
      `}
      style={{ backgroundColor, opacity }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      role="button"
      tabIndex={0}
      aria-label={
        cell.state === 'filled' && cell.pentominoId
          ? `Cell (${row}, ${col}) filled with ${cell.pentominoId}-pentomino`
          : `Cell (${row}, ${col}) ${cell.state}`
      }
    />
  );
}
