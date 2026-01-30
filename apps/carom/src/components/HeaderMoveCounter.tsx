'use client';

interface HeaderMoveCounterProps {
  moves: number;
  optimalMoves?: number;
}

export function HeaderMoveCounter({ moves, optimalMoves }: HeaderMoveCounterProps) {
  return (
    <div className="flex items-center gap-2 text-md pr-2">
      <span className="text-[var(--muted)]">Moves: </span>
      <span className="font-bold text-[var(--foreground)] text-3xl">{moves}</span>
    </div>
  );
}
