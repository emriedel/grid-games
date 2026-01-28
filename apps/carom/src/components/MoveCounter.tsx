'use client';

interface MoveCounterProps {
  moves: number;
  optimalMoves?: number;
}

export function MoveCounter({ moves, optimalMoves }: MoveCounterProps) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-[var(--foreground)]">{moves}</div>
      <div className="text-sm text-[var(--muted)]">
        {optimalMoves ? `Moves (Par: ${optimalMoves})` : 'Moves'}
      </div>
    </div>
  );
}
