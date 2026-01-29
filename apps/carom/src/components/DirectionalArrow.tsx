'use client';

import { Direction } from '@/types';

interface DirectionalArrowProps {
  direction: Direction;
  onClick: () => void;
  cellSize: number;
  piecePosition: { row: number; col: number };
}

export function DirectionalArrow({
  direction,
  onClick,
  cellSize,
  piecePosition,
}: DirectionalArrowProps) {
  // Arrow symbols for each direction
  const arrowSymbols: Record<Direction, string> = {
    up: '▲',
    down: '▼',
    left: '◀',
    right: '▶',
  };

  // Calculate position at the edge of the selected piece
  const arrowSize = cellSize * 0.25;
  const pieceSize = cellSize * 0.7;
  const pieceOffset = (cellSize - pieceSize) / 2;
  const pieceCenter = cellSize / 2;

  // Position the arrow at the edge of the piece (not in adjacent cell)
  let top: number;
  let left: number;

  switch (direction) {
    case 'up':
      top = piecePosition.row * cellSize + pieceOffset - arrowSize / 2;
      left = piecePosition.col * cellSize + pieceCenter - arrowSize / 2;
      break;
    case 'down':
      top = piecePosition.row * cellSize + pieceOffset + pieceSize - arrowSize / 2;
      left = piecePosition.col * cellSize + pieceCenter - arrowSize / 2;
      break;
    case 'left':
      top = piecePosition.row * cellSize + pieceCenter - arrowSize / 2;
      left = piecePosition.col * cellSize + pieceOffset - arrowSize / 2;
      break;
    case 'right':
      top = piecePosition.row * cellSize + pieceCenter - arrowSize / 2;
      left = piecePosition.col * cellSize + pieceOffset + pieceSize - arrowSize / 2;
      break;
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="absolute flex items-center justify-center
        bg-white/90 text-[var(--background)] rounded-full
        hover:bg-[var(--accent)] hover:text-[var(--accent-foreground)]
        active:scale-90 transition-all duration-100
        shadow-md z-20"
      style={{
        width: arrowSize,
        height: arrowSize,
        top,
        left,
        fontSize: arrowSize * 0.5,
      }}
      aria-label={`Move ${direction}`}
    >
      {arrowSymbols[direction]}
    </button>
  );
}
