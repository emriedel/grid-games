'use client';

import { SquareState, Edge } from '@/types';
import { getWordAtEdge } from '@/lib/gameLogic';
import { CENTER_FACING_EDGES } from '@/constants/gameConfig';

interface SquareProps {
  square: SquareState;
  squareIndex: number;
  onRotate: () => void;
  disabled?: boolean;
}

export function Square({ square, squareIndex, onRotate, disabled }: SquareProps) {
  const rotationDeg = square.rotation * 90;

  const isCenterFacing = (edge: Edge): boolean => {
    const centerEdges = CENTER_FACING_EDGES[squareIndex as 0 | 1 | 2 | 3];
    return (centerEdges as readonly number[]).includes(edge);
  };

  const getEdgeWord = (edge: Edge): string => {
    return getWordAtEdge(square, edge);
  };

  const getWordStyle = (edge: Edge) => ({
    color: isCenterFacing(edge) ? 'var(--muted)' : 'var(--foreground)',
  });

  return (
    <button
      onClick={onRotate}
      disabled={disabled}
      className={`
        relative w-full h-full
        bg-[var(--tile-bg)] border-2 border-[var(--tile-border)]
        rounded-lg overflow-hidden
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--accent)] active:scale-95'}
        transition-all duration-150
        select-none
      `}
      style={{
        transform: `rotate(${rotationDeg}deg)`,
        transition: 'transform 250ms ease-out',
      }}
    >
      {/* Top word */}
      <div
        className="absolute inset-x-0 top-0 h-1/4 flex items-center justify-center"
        style={{ transform: `rotate(-${rotationDeg}deg)`, transition: 'transform 250ms ease-out' }}
      >
        <span className="text-[11px] font-bold" style={getWordStyle(0)}>
          {getEdgeWord(0)}
        </span>
      </div>

      {/* Right word */}
      <div
        className="absolute inset-y-0 right-0 w-1/4 flex items-center justify-center"
        style={{ transform: `rotate(-${rotationDeg}deg)`, transition: 'transform 250ms ease-out' }}
      >
        <span
          className="text-[11px] font-bold"
          style={{ ...getWordStyle(1), writingMode: 'vertical-rl' }}
        >
          {getEdgeWord(1)}
        </span>
      </div>

      {/* Bottom word */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/4 flex items-center justify-center"
        style={{ transform: `rotate(-${rotationDeg}deg)`, transition: 'transform 250ms ease-out' }}
      >
        <span className="text-[11px] font-bold" style={getWordStyle(2)}>
          {getEdgeWord(2)}
        </span>
      </div>

      {/* Left word */}
      <div
        className="absolute inset-y-0 left-0 w-1/4 flex items-center justify-center"
        style={{ transform: `rotate(-${rotationDeg}deg)`, transition: 'transform 250ms ease-out' }}
      >
        <span
          className="text-[11px] font-bold"
          style={{ ...getWordStyle(3), writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {getEdgeWord(3)}
        </span>
      </div>
    </button>
  );
}
