'use client';

import { useMemo } from 'react';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { BoardCell, PentominoId, Rotation, DragData, Position } from '@/types';
import { PENTOMINOES } from '@/constants/pentominoes';

interface CellProps {
  cell: BoardCell;
  row: number;
  col: number;
  isPreview?: boolean;
  previewPentominoId?: PentominoId;
  isDragPreview?: boolean;
  pieceRotation?: Rotation;
  pieceAnchorPosition?: Position;
  onClick?: () => void;
  onMouseEnter?: () => void;
}

export function Cell({
  cell,
  row,
  col,
  isPreview = false,
  previewPentominoId,
  isDragPreview = false,
  pieceRotation = 0,
  pieceAnchorPosition,
  onClick,
  onMouseEnter,
}: CellProps) {
  // Set up droppable (for empty playable cells)
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `cell-${row}-${col}`,
    data: { row, col },
    disabled: cell.state !== 'playable',
  });

  // Set up draggable (for filled cells)
  const dragData: DragData | undefined = cell.state === 'filled' && cell.pentominoId
    ? {
        type: 'board-piece',
        pentominoId: cell.pentominoId,
        rotation: pieceRotation,
        position: { row, col },
        grabOffset: pieceAnchorPosition ? {
          row: row - pieceAnchorPosition.row,
          col: col - pieceAnchorPosition.col,
        } : undefined,
      }
    : undefined;
  const { setNodeRef: setDragRef, attributes, listeners, isDragging } = useDraggable({
    id: `board-piece-${row}-${col}`,
    data: dragData,
    disabled: cell.state !== 'filled',
  });

  // Combine refs - use drag ref for filled cells, drop ref for playable cells
  const setNodeRef = cell.state === 'filled' ? setDragRef : setDropRef;

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
    // Note: removed isOver highlighting since drag preview already shows where piece will land
    return 'var(--cell-playable)';
  }, [cell.state, cell.pentominoId, isPreview, isDragPreview, previewPentominoId]);

  const opacity = isPreview || isDragPreview || isDragging ? 0.6 : 1;

  // Dead cells are not interactive
  if (cell.state === 'dead') {
    return (
      <div
        className="aspect-square rounded-sm"
        style={{ backgroundColor }}
      />
    );
  }

  // For filled cells, add drag attributes
  const dragProps = cell.state === 'filled' ? { ...attributes, ...listeners } : {};

  return (
    <div
      ref={setNodeRef}
      {...dragProps}
      className={`
        aspect-square rounded-sm cursor-pointer
        transition-colors duration-150 touch-none
        ${cell.state === 'filled' && !isDragging ? 'animate-piece-place' : ''}
        ${isDragging ? 'opacity-50' : ''}
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
