'use client';

import { useMemo } from 'react';
import type { BoardCell, PentominoId } from '@/types';
import { PENTOMINOES } from '@/constants/pentominoes';

interface CellProps {
  cell: BoardCell;
  row: number;
  col: number;
  isValidDropTarget?: boolean;
  isPreview?: boolean;
  previewPentominoId?: PentominoId;
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
  onClick,
  onMouseEnter,
}: CellProps) {
  const backgroundColor = useMemo(() => {
    if (cell.state === 'dead') {
      return 'var(--cell-dead)';
    }
    if (isPreview && previewPentominoId) {
      return PENTOMINOES[previewPentominoId].color;
    }
    if (cell.state === 'filled' && cell.pentominoId) {
      return PENTOMINOES[cell.pentominoId].color;
    }
    if (isValidDropTarget) {
      return 'var(--accent-secondary)';
    }
    return 'var(--cell-playable)';
  }, [cell.state, cell.pentominoId, isValidDropTarget, isPreview, previewPentominoId]);

  const opacity = isPreview ? 0.6 : 1;

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
