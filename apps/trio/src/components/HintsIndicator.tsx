'use client';

import { GAME_CONFIG } from '@/constants';

interface HintsIndicatorProps {
  hintsUsed: number;
  hasThreeSelected: boolean;
  onUseHint: () => void;
}

/**
 * Button showing remaining hints with lightbulb icon.
 * Disabled when no hints remaining or when 3 cards are selected.
 */
export function HintsIndicator({ hintsUsed, hasThreeSelected, onUseHint }: HintsIndicatorProps) {
  const hintsRemaining = GAME_CONFIG.MAX_HINTS - hintsUsed;
  const isDisabled = hintsRemaining === 0 || hasThreeSelected;

  return (
    <button
      onClick={onUseHint}
      disabled={isDisabled}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg
        text-sm font-medium
        transition-all duration-150
        ${isDisabled
          ? 'bg-[var(--border)] text-[var(--muted)] cursor-not-allowed opacity-50'
          : 'bg-[var(--hint-color)] text-black hover:brightness-110 active:scale-95'
        }
      `}
      aria-label={`Use hint (${hintsRemaining} remaining)`}
    >
      <span className="text-base">💡</span>
      <span>{hintsRemaining}</span>
    </button>
  );
}

export default HintsIndicator;
