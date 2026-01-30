'use client';

import { Piece as PieceType } from '@/types';
import { SLIDE_ANIMATION_DURATION } from '@/constants/gameConfig';

interface PieceProps {
  piece: PieceType;
  isSelected: boolean;
  onClick: () => void;
  cellSize: number;
}

export function Piece({ piece, isSelected, onClick, cellSize }: PieceProps) {
  const isTarget = piece.type === 'target';
  const pieceSize = cellSize * 0.6;
  const offset = (cellSize - pieceSize) / 2;

  return (
    <button
      onClick={onClick}
      className={`
        absolute rounded-full cursor-pointer
        flex items-center justify-center
        transition-all
        ${isTarget ? 'bg-[var(--piece-target)]' : 'bg-[var(--piece-blocker)]'}
        ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[var(--background)] shadow-lg scale-105' : ''}
        hover:brightness-110
        active:scale-95
      `}
      style={{
        width: pieceSize,
        height: pieceSize,
        top: piece.position.row * cellSize + offset,
        left: piece.position.col * cellSize + offset,
        transitionDuration: `${SLIDE_ANIMATION_DURATION}ms`,
        transitionProperty: 'top, left, transform, box-shadow',
        zIndex: isSelected ? 10 : 1,
      }}
      aria-label={`${piece.type} piece at row ${piece.position.row + 1}, column ${piece.position.col + 1}${isSelected ? ', selected' : ''}`}
    />
  );
}
