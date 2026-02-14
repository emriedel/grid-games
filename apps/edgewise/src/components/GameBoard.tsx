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
  shake?: boolean;
  hideCategories?: boolean; // Hide all categories except top (for harder mode)
  hiddenCategoryNames?: string[]; // Names of hidden categories to show floating above board
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
  shake,
  hideCategories = false,
  hiddenCategoryNames = [],
}: GameBoardProps) {
  // When hideCategories is true, only show top category (others show "?" until solved)
  const shouldShowCategory = (position: CategoryPosition): boolean => {
    if (!hideCategories) return true;
    if (position === 'top') return true; // Always show top
    // Show other categories only when solved (all correct)
    return categoryResults?.[position] === true;
  };

  // Check if all categories are solved (for reveal)
  const allSolved = categoryResults?.top === true &&
    categoryResults?.right === true &&
    categoryResults?.bottom === true &&
    categoryResults?.left === true;

  // Show floating categories only when hiding categories and not yet solved
  const showFloatingCategories = hideCategories && hiddenCategoryNames.length > 0 && !allSolved;

  const gridSize = 'min(70vw, 320px)';

  // Track visual positions for animation
  // This maps: which visual position is each of the 4 slots currently at?
  const [visualPositions, setVisualPositions] = useState<[number, number, number, number]>([0, 1, 2, 3]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [transitionsEnabled, setTransitionsEnabled] = useState(true);

  const handleGroupRotate = useCallback(() => {
    if (isAnimating || disabled) return;

    setIsAnimating(true);
    setTransitionsEnabled(true);

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
      // Disable transitions for instant reset (prevents word flashing)
      setTransitionsEnabled(false);

      // First, call the data swap
      onGroupRotate();
      // Reset positions to [0,1,2,3] - this happens after data swap
      // so the new data appears at the "home" positions
      setVisualPositions([0, 1, 2, 3]);

      // Re-enable transitions after a frame
      requestAnimationFrame(() => {
        setTransitionsEnabled(true);
        setIsAnimating(false);
      });
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
      // Only animate during the sliding phase when transitions are enabled
      transition: transitionsEnabled && isAnimating ? 'left 300ms ease-out, top 300ms ease-out' : 'none',
    };
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Floating hidden categories (shown above board when in hidden mode) */}
      {showFloatingCategories && (
        <div className="mb-4 text-center">
          <span className="text-[var(--muted)] text-xs uppercase tracking-wider mb-2 block">
            Also find:
          </span>
          <div className="flex flex-wrap justify-center gap-2">
            {hiddenCategoryNames.map((name, index) => (
              <span
                key={index}
                className="px-3 py-1 text-sm bg-[var(--border)]/50 text-[var(--foreground)] rounded-full border border-[var(--border)]"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

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
            label={shouldShowCategory('left') ? puzzle.categories.left : '?'}
            isCorrect={categoryResults?.left}
            isHidden={!shouldShowCategory('left')}
          />
        </div>

        {/* Grid container with explicit size */}
        <div
          className={`relative ${shake ? 'shake' : ''}`}
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
            label={shouldShowCategory('right') ? puzzle.categories.right : '?'}
            isCorrect={categoryResults?.right}
            isHidden={!shouldShowCategory('right')}
          />
        </div>
      </div>

      {/* Bottom category */}
      <div className="mt-3" style={{ width: gridSize }}>
        <CategoryLabel
          position="bottom"
          label={shouldShowCategory('bottom') ? puzzle.categories.bottom : '?'}
          isCorrect={categoryResults?.bottom}
          isHidden={!shouldShowCategory('bottom')}
        />
      </div>
    </div>
  );
}
