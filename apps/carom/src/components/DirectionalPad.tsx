'use client';

import { Direction } from '@/types';

interface DirectionalPadProps {
  onMove: (direction: Direction) => void;
  disabled?: boolean;
}

function ArrowButton({
  direction,
  onClick,
  disabled,
}: {
  direction: Direction;
  onClick: () => void;
  disabled?: boolean;
}) {
  const arrows: Record<Direction, string> = {
    up: '▲',
    down: '▼',
    left: '◀',
    right: '▶',
  };

  const positions: Record<Direction, string> = {
    up: 'col-start-2 row-start-1',
    left: 'col-start-1 row-start-2',
    right: 'col-start-3 row-start-2',
    down: 'col-start-2 row-start-3',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${positions[direction]}
        w-14 h-14 rounded-lg
        bg-[var(--tile-bg)] border border-[var(--tile-border)]
        text-[var(--foreground)] text-xl
        flex items-center justify-center
        transition-all duration-100
        hover:bg-[var(--tile-bg-selected)] hover:border-[var(--accent)]
        active:scale-95 active:bg-[var(--accent)] active:text-[var(--accent-foreground)]
        disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[var(--tile-bg)] disabled:hover:border-[var(--tile-border)]
      `}
      aria-label={`Move ${direction}`}
    >
      {arrows[direction]}
    </button>
  );
}

export function DirectionalPad({ onMove, disabled = false }: DirectionalPadProps) {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-2 w-fit mx-auto">
      <ArrowButton direction="up" onClick={() => onMove('up')} disabled={disabled} />
      <ArrowButton direction="left" onClick={() => onMove('left')} disabled={disabled} />
      <ArrowButton direction="right" onClick={() => onMove('right')} disabled={disabled} />
      <ArrowButton direction="down" onClick={() => onMove('down')} disabled={disabled} />
    </div>
  );
}
