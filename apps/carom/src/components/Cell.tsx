'use client';

import { WallFlags, WALL_TOP, WALL_RIGHT, WALL_BOTTOM, WALL_LEFT } from '@/types';

interface CellProps {
  row: number;
  col: number;
  walls: WallFlags;
  isGoal: boolean;
  children?: React.ReactNode;
}

export function Cell({ row, col, walls, isGoal, children }: CellProps) {
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

  return (
    <div
      className={`
        relative w-full aspect-square
        bg-[var(--cell-bg)] border border-[var(--cell-border)]
        ${wallClasses.join(' ')}
        ${isGoal ? 'bg-[var(--goal-bg)]' : ''}
      `}
      data-row={row}
      data-col={col}
    >
      {isGoal && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-3 h-3 rounded-full bg-[var(--accent)] opacity-50" />
        </div>
      )}
      {children}
    </div>
  );
}
