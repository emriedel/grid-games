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

  // Calculate position centered in the adjacent cell
  const arrowSize = cellSize * 0.5;

  let top: number;
  let left: number;

  switch (direction) {
    case 'up':
      top = (piecePosition.row - 1) * cellSize + cellSize / 2 - arrowSize / 2;
      left = piecePosition.col * cellSize + cellSize / 2 - arrowSize / 2;
      break;
    case 'down':
      top = (piecePosition.row + 1) * cellSize + cellSize / 2 - arrowSize / 2;
      left = piecePosition.col * cellSize + cellSize / 2 - arrowSize / 2;
      break;
    case 'left':
      top = piecePosition.row * cellSize + cellSize / 2 - arrowSize / 2;
      left = (piecePosition.col - 1) * cellSize + cellSize / 2 - arrowSize / 2;
      break;
    case 'right':
      top = piecePosition.row * cellSize + cellSize / 2 - arrowSize / 2;
      left = (piecePosition.col + 1) * cellSize + cellSize / 2 - arrowSize / 2;
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
