'use client';

interface HeaderMoveCounterProps {
  moves: number;
  optimalMoves?: number;
}

export function HeaderMoveCounter({ moves, optimalMoves }: HeaderMoveCounterProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-bold text-[var(--foreground)]">{moves}</span>
      <span className="text-[var(--muted)]">
        {optimalMoves ? `moves (par: ${optimalMoves})` : 'moves'}
      </span>
    </div>
  );
}
