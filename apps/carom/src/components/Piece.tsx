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

  // Build radial gradient for 3D ball effect (using hex colors since CSS vars don't work in inline gradients)
  const gradient = isTarget
    ? 'radial-gradient(circle at 30% 30%, #fbbf24, #f59e0b 60%)'
    : 'radial-gradient(circle at 30% 30%, #60a5fa, #3b82f6 60%)';

  // Shadow effects: amber glow when selected, subtle drop shadow otherwise
  const boxShadow = isSelected
    ? '0 0 16px rgba(245, 158, 11, 0.6), 0 4px 8px rgba(0,0,0,0.4)'
    : '0 2px 4px rgba(0,0,0,0.3)';

  return (
    <button
      onClick={onClick}
      className={`
        absolute rounded-lg cursor-pointer
        flex items-center justify-center
        transition-all
        ${isSelected ? 'scale-105' : ''}
        hover:brightness-110
        active:scale-95
      `}
      style={{
        width: pieceSize,
        height: pieceSize,
        top: piece.position.row * cellSize + offset,
        left: piece.position.col * cellSize + offset,
        background: gradient,
        boxShadow,
        transitionDuration: `${SLIDE_ANIMATION_DURATION}ms`,
        transitionProperty: 'top, left, transform, box-shadow',
        zIndex: isSelected ? 10 : 1,
      }}
      aria-label={`${piece.type} piece at row ${piece.position.row + 1}, column ${piece.position.col + 1}${isSelected ? ', selected' : ''}`}
    />
  );
}
