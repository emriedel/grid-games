'use client';

import { Position } from '@/types';

interface GoalProps {
  position: Position;
  cellSize: number;
}

export function Goal({ position, cellSize }: GoalProps) {
  const goalSize = cellSize * 0.4;
  const offset = (cellSize - goalSize) / 2;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        width: goalSize,
        height: goalSize,
        top: position.row * cellSize + offset,
        left: position.col * cellSize + offset,
      }}
    >
      <div className="w-full h-full rounded-full border-2 border-[var(--accent)] opacity-60 animate-pulse" />
    </div>
  );
}
