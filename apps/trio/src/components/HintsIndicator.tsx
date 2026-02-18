'use client';

interface HintsIndicatorProps {
  hintAvailable: boolean;
  hasThreeSelected: boolean;
  onUseHint: () => void;
}

/**
 * Button showing hint availability for the current round.
 * Shows "Hint" when available, "Used" when already used this round.
 * Disabled when hint used this round or when 3 cards are selected.
 */
export function HintsIndicator({ hintAvailable, hasThreeSelected, onUseHint }: HintsIndicatorProps) {
  const isDisabled = !hintAvailable || hasThreeSelected;

  return (
    <button
      onClick={onUseHint}
      disabled={isDisabled}
      className={`
        flex items-center gap-1.5 px-4 py-3 rounded-lg
        text-base font-semibold
        transition-colors
        bg-[var(--tile-bg)] text-[var(--foreground)]
        hover:bg-[var(--tile-bg-selected)]
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      aria-label={hintAvailable ? 'Use hint' : 'Hint already used this round'}
    >
      <span>{hintAvailable ? 'Hint' : 'Used'}</span>
    </button>
  );
}

export default HintsIndicator;
