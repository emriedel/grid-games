'use client';

import { WallFlags, WALL_TOP, WALL_RIGHT, WALL_BOTTOM, WALL_LEFT } from '@/types';

interface CellProps {
  row: number;
  col: number;
  walls: WallFlags;
  isGoal: boolean;
  isObstacle: boolean;
  children?: React.ReactNode;
}

export function Cell({ row, col, walls, isGoal, isObstacle, children }: CellProps) {
  // Build wall border classes
  const wallClasses: string[] = [];
  const hasTop = (walls & WALL_TOP) !== 0;
  const hasRight = (walls & WALL_RIGHT) !== 0;
  const hasBottom = (walls & WALL_BOTTOM) !== 0;
  const hasLeft = (walls & WALL_LEFT) !== 0;

  if (hasTop) {
    wallClasses.push('border-t-[3px] border-t-[var(--wall-color)]');
  }
  if (hasRight) {
    wallClasses.push('border-r-[3px] border-r-[var(--wall-color)]');
  }
  if (hasBottom) {
    wallClasses.push('border-b-[3px] border-b-[var(--wall-color)]');
  }
  if (hasLeft) {
    wallClasses.push('border-l-[3px] border-l-[var(--wall-color)]');
  }

  // Determine background: obstacle takes priority, then goal, then default
  let bgClass = 'bg-[var(--cell-bg)]';
  if (isObstacle) {
    bgClass = 'bg-[var(--muted)]';
  } else if (isGoal) {
    bgClass = 'bg-[var(--goal-bg)]';
  }

  // Corner fills to close gaps where walls meet
  const cornerSize = '4px';

  return (
    <div
      className={`
        relative w-full aspect-square
        ${bgClass} border border-[var(--cell-border)]
        ${wallClasses.join(' ')}
      `}
      data-row={row}
      data-col={col}
    >
      {/* Corner fills where walls meet */}
      {hasTop && hasLeft && (
        <div
          className="absolute bg-[var(--wall-color)] pointer-events-none"
          style={{ top: -4, left: -4, width: cornerSize, height: cornerSize }}
        />
      )}
      {hasTop && hasRight && (
        <div
          className="absolute bg-[var(--wall-color)] pointer-events-none"
          style={{ top: -4, right: -4, width: cornerSize, height: cornerSize }}
        />
      )}
      {hasBottom && hasLeft && (
        <div
          className="absolute bg-[var(--wall-color)] pointer-events-none"
          style={{ bottom: -4, left: -4, width: cornerSize, height: cornerSize }}
        />
      )}
      {hasBottom && hasRight && (
        <div
          className="absolute bg-[var(--wall-color)] pointer-events-none"
          style={{ bottom: -4, right: -4, width: cornerSize, height: cornerSize }}
        />
      )}
      {isGoal && !isObstacle && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg
            className="w-8 h-8 text-[var(--accent)] opacity-60"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
          </svg>
        </div>
      )}
      {isObstacle && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4 h-4 bg-[var(--obstacle-block)] rounded-sm" />
        </div>
      )}
      {children}
    </div>
  );
}
