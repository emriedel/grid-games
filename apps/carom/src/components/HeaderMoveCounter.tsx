'use client';

interface HeaderMoveCounterProps {
  moves: number;
  optimalMoves?: number;
  achievedOptimal?: boolean;
  isFinished?: boolean;
  onClick?: () => void;
}

export function HeaderMoveCounter({
  moves,
  optimalMoves,
  achievedOptimal,
  isFinished,
  onClick,
}: HeaderMoveCounterProps) {
  const isClickable = optimalMoves !== undefined && onClick;

  // Check if user somehow got fewer moves than optimal (cheating/bug)
  const isCheating = optimalMoves !== undefined && moves < optimalMoves;

  return (
    <button
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      className={`flex items-center gap-2 text-md pr-2 ${
        isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'
      }`}
    >
      <span className="text-[var(--muted)]">Moves: </span>
      <span className="font-bold text-[var(--accent)] text-2xl">{moves}</span>
      {isFinished && isCheating && (
        <span className="text-xl" title="Impossible!">💀</span>
      )}
      {isFinished && achievedOptimal && !isCheating && (
        <span className="text-xl" title="Optimal solution!">🏆</span>
      )}
    </button>
  );
}
