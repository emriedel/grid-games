'use client';

import { SquareState, Edge } from '@/types';
import { CENTER_FACING_EDGES } from '@/constants/gameConfig';

interface SquareProps {
  square: SquareState;
  squareIndex: number;
  onRotate: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

// Get the word that appears at a visual position after rotation
function getWordAtVisualPosition(square: SquareState, visualPosition: Edge): string {
  // If rotated by R, the word at visual position P comes from original position (P - R + 4) % 4
  const originalIndex = ((visualPosition - square.rotation + 4) % 4) as Edge;
  return square.words[originalIndex];
}

export function Square({ square, squareIndex, onRotate, disabled, style }: SquareProps) {
  // Visual center-facing positions for this square
  const centerFacingVisual = CENTER_FACING_EDGES[squareIndex as 0 | 1 | 2 | 3];

  const isCenterFacing = (visualPosition: Edge): boolean => {
    return (centerFacingVisual as readonly number[]).includes(visualPosition);
  };

  const getWordColor = (visualPosition: Edge) =>
    isCenterFacing(visualPosition) ? 'var(--muted)' : 'var(--foreground)';

  // Get the word for each visual position
  const topWord = getWordAtVisualPosition(square, 0);
  const rightWord = getWordAtVisualPosition(square, 1);
  const bottomWord = getWordAtVisualPosition(square, 2);
  const leftWord = getWordAtVisualPosition(square, 3);

  return (
    <button
      onClick={onRotate}
      disabled={disabled}
      className={`
        bg-[var(--tile-bg)] border-2 border-[var(--tile-border)]
        rounded-lg overflow-hidden
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--accent)] active:scale-95'}
        select-none
      `}
      style={style}
    >
      {/* Top word - horizontal */}
      <div className="absolute top-1 left-0 right-0 flex justify-center">
        <span
          className="text-[11px] font-bold"
          style={{ color: getWordColor(0) }}
        >
          {topWord}
        </span>
      </div>

      {/* Right word - vertical, reading top-to-bottom */}
      <div className="absolute right-1 top-0 bottom-0 flex items-center justify-center">
        <span
          className="text-[11px] font-bold"
          style={{
            color: getWordColor(1),
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
          }}
        >
          {rightWord}
        </span>
      </div>

      {/* Bottom word - horizontal */}
      <div className="absolute bottom-1 left-0 right-0 flex justify-center">
        <span
          className="text-[11px] font-bold"
          style={{ color: getWordColor(2) }}
        >
          {bottomWord}
        </span>
      </div>

      {/* Left word - vertical, reading bottom-to-top */}
      <div className="absolute left-1 top-0 bottom-0 flex items-center justify-center">
        <span
          className="text-[11px] font-bold"
          style={{
            color: getWordColor(3),
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
          }}
        >
          {leftWord}
        </span>
      </div>
    </button>
  );
}
