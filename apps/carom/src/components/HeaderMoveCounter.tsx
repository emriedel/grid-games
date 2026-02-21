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
      className={`flex items-center gap-1.5 text-md ${
        isClickable
          ? 'px-2.5 py-1 rounded-lg bg-[var(--tile-bg)] hover:bg-[var(--tile-bg-selected)] cursor-pointer transition-colors'
          : 'cursor-default'
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
      {isClickable && (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-[var(--muted)]">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      )}
    </button>
  );
}
