'use client';

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

export function GameBoard({
  squares,
  puzzle,
  onRotateSquare,
  onGroupRotate,
  categoryResults,
  disabled,
}: GameBoardProps) {
  // Calculate grid size based on viewport
  // On mobile, we want the grid to be about 70% of the viewport width
  const gridSize = 'min(70vw, 320px)';

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
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-2">
            <Square
              square={squares[0]}
              squareIndex={0}
              onRotate={() => onRotateSquare(0)}
              disabled={disabled}
            />
            <Square
              square={squares[1]}
              squareIndex={1}
              onRotate={() => onRotateSquare(1)}
              disabled={disabled}
            />
            <Square
              square={squares[3]}
              squareIndex={3}
              onRotate={() => onRotateSquare(3)}
              disabled={disabled}
            />
            <Square
              square={squares[2]}
              squareIndex={2}
              onRotate={() => onRotateSquare(2)}
              disabled={disabled}
            />
          </div>

          {/* Center rotation button */}
          <CenterButton onRotate={onGroupRotate} disabled={disabled} />
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
