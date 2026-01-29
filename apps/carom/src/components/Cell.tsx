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

  if (walls & WALL_TOP) {
    wallClasses.push('border-t-[3px] border-t-[var(--wall-color)]');
  }
  if (walls & WALL_RIGHT) {
    wallClasses.push('border-r-[3px] border-r-[var(--wall-color)]');
  }
  if (walls & WALL_BOTTOM) {
    wallClasses.push('border-b-[3px] border-b-[var(--wall-color)]');
  }
  if (walls & WALL_LEFT) {
    wallClasses.push('border-l-[3px] border-l-[var(--wall-color)]');
  }

  // Determine background: obstacle takes priority, then goal, then default
  let bgClass = 'bg-[var(--cell-bg)]';
  if (isObstacle) {
    bgClass = 'bg-[var(--muted)]';
  } else if (isGoal) {
    bgClass = 'bg-[var(--goal-bg)]';
  }

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
      {isGoal && !isObstacle && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg
            className="w-5 h-5 text-[var(--accent)] opacity-60"
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
