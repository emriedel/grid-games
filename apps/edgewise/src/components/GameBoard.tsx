'use client';

import { useState, useCallback } from 'react';
import { SquareState, Puzzle, CategoryPosition } from '@/types';
import { Square } from './Square';
import { CategoryLabel } from './CategoryLabel';
import { CenterButton } from './CenterButton';

interface GameBoardProps {
  squares: SquareState[];
  puzzle: Puzzle;
  onRotateSquare: (index: number) => void;
  onGroupRotate: () => void;
  categoryResults?: Record<CategoryPosition, boolean | null>;
  disabled?: boolean;
}

// Position coordinates as percentages [x, y]
const POSITIONS: Record<number, [number, number]> = {
  0: [0, 0],     // top-left
  1: [50, 0],    // top-right
  2: [50, 50],   // bottom-right
  3: [0, 50],    // bottom-left
};

export function GameBoard({
  squares,
  puzzle,
  onRotateSquare,
  onGroupRotate,
  categoryResults,
  disabled,
}: GameBoardProps) {
  const gridSize = 'min(70vw, 320px)';

  // Track visual positions for animation
  // This maps: which visual position is each of the 4 slots currently at?
  const [visualPositions, setVisualPositions] = useState<[number, number, number, number]>([0, 1, 2, 3]);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleGroupRotate = useCallback(() => {
    if (isAnimating || disabled) return;

    setIsAnimating(true);

    // Animate: each slot slides to the next position clockwise
    // Position 0 -> 1, 1 -> 2, 2 -> 3, 3 -> 0
    setVisualPositions(prev => [
      (prev[0] + 1) % 4,
      (prev[1] + 1) % 4,
      (prev[2] + 1) % 4,
      (prev[3] + 1) % 4,
    ] as [number, number, number, number]);

    // After animation completes, swap the data and reset positions instantly
    setTimeout(() => {
      // First, call the data swap
      onGroupRotate();
      // Reset positions to [0,1,2,3] - this happens after data swap
      // so the new data appears at the "home" positions
      setVisualPositions([0, 1, 2, 3]);
      setIsAnimating(false);
    }, 300);
  }, [isAnimating, disabled, onGroupRotate]);

  // Calculate the style for a square based on its current visual position
  const getSquareStyle = (slotIndex: number): React.CSSProperties => {
    const visualPos = visualPositions[slotIndex];
    const [x, y] = POSITIONS[visualPos];
    return {
      position: 'absolute',
      width: 'calc(50% - 4px)',
      height: 'calc(50% - 4px)',
      left: `calc(${x}% + ${x > 0 ? 4 : 0}px)`,
      top: `calc(${y}% + ${y > 0 ? 4 : 0}px)`,
      // Only animate during the sliding phase, not during reset
      transition: isAnimating ? 'left 300ms ease-out, top 300ms ease-out' : 'none',
    };
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Top category */}
      <div className="mb-3" style={{ width: gridSize }}>
        <CategoryLabel
          position="top"
          label={puzzle.categories.top}
          isCorrect={categoryResults?.top}
        />
      </div>

      {/* Middle section with left category, grid, right category */}
      <div className="flex items-center gap-2">
        {/* Left category */}
        <div style={{ height: gridSize }}>
          <CategoryLabel
            position="left"
            label={puzzle.categories.left}
            isCorrect={categoryResults?.left}
          />
        </div>

        {/* Grid container with explicit size */}
        <div
          className="relative"
          style={{ width: gridSize, height: gridSize }}
        >
          {/* Squares with absolute positioning for sliding animation */}
          <Square
            square={squares[0]}
            squareIndex={visualPositions[0]}
            onRotate={() => onRotateSquare(0)}
            disabled={disabled || isAnimating}
            style={getSquareStyle(0)}
          />
          <Square
            square={squares[1]}
            squareIndex={visualPositions[1]}
            onRotate={() => onRotateSquare(1)}
            disabled={disabled || isAnimating}
            style={getSquareStyle(1)}
          />
          <Square
            square={squares[2]}
            squareIndex={visualPositions[2]}
            onRotate={() => onRotateSquare(2)}
            disabled={disabled || isAnimating}
            style={getSquareStyle(2)}
          />
          <Square
            square={squares[3]}
            squareIndex={visualPositions[3]}
            onRotate={() => onRotateSquare(3)}
            disabled={disabled || isAnimating}
            style={getSquareStyle(3)}
          />

          {/* Center rotation button */}
          <CenterButton onRotate={handleGroupRotate} disabled={disabled || isAnimating} />
        </div>

        {/* Right category */}
        <div style={{ height: gridSize }}>
          <CategoryLabel
            position="right"
            label={puzzle.categories.right}
            isCorrect={categoryResults?.right}
          />
        </div>
      </div>

      {/* Bottom category */}
      <div className="mt-3" style={{ width: gridSize }}>
        <CategoryLabel
          position="bottom"
          label={puzzle.categories.bottom}
          isCorrect={categoryResults?.bottom}
        />
      </div>
    </div>
  );
}
