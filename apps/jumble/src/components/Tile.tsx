'use client';

import { Position } from '@/types';
import { QU_DISPLAY } from '@/constants/gameConfig';

interface TileProps {
  letter: string;
  position: Position;
  isSelected: boolean;
  isLastSelected: boolean;
  selectionIndex: number | null;
  onPointerDown: (pos: Position, e: React.PointerEvent) => void;
  onClick: (pos: Position) => void;
}

export default function Tile({
  letter,
  position,
  isSelected,
  isLastSelected,
  selectionIndex,
  onPointerDown,
  onClick,
}: TileProps) {
  const displayLetter = letter === 'QU' ? QU_DISPLAY : letter;

  return (
    <div
      data-row={position.row}
      data-col={position.col}
      className={`
        relative flex items-center justify-center
        w-full aspect-square
        rounded-lg border-2 cursor-pointer
        tile-transition no-select touch-none
        text-2xl sm:text-3xl font-bold
        ${isSelected
          ? isLastSelected
            ? 'bg-[var(--accent)] border-[var(--accent)] scale-105'
            : 'bg-[var(--tile-bg-selected)] border-[var(--accent)] scale-102'
          : 'bg-[var(--tile-bg)] border-[var(--tile-border)] hover:border-[var(--accent-secondary)]'
        }
      `}
      onPointerDown={(e) => onPointerDown(position, e)}
      onClick={() => onClick(position)}
    >
      {displayLetter}
      {selectionIndex !== null && (
        <span className="absolute top-1 right-1 text-xs opacity-50">
          {selectionIndex + 1}
        </span>
      )}
    </div>
  );
}
