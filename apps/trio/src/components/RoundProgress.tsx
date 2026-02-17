'use client';

import type { RoundOutcome } from '@/types';
import { GAME_CONFIG } from '@/constants';

interface RoundProgressProps {
  roundOutcomes: RoundOutcome[];
  currentRound: number;
}

/**
 * Shows progress through 5 rounds with visual indicators.
 * - Empty box (with border) = pending (current round highlighted)
 * - Checkmark (green) = found without hint
 * - Lightbulb (orange) = found with hint
 * - X (red) = missed
 */
export function RoundProgress({ roundOutcomes, currentRound }: RoundProgressProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: GAME_CONFIG.ROUND_COUNT }).map((_, index) => {
        const outcome = roundOutcomes[index];
        const isCurrentRound = index === currentRound - 1;

        return (
          <div
            key={index}
            className={`
              w-6 h-6 flex items-center justify-center rounded
              text-sm font-bold transition-all duration-200
              ${outcome === 'pending'
                ? isCurrentRound
                  ? 'border-2 border-[var(--accent)] bg-[var(--accent)]/10'
                  : 'border-2 border-[var(--border)]'
                : ''
              }
              ${outcome === 'found' ? 'bg-green-500/20 text-green-400' : ''}
              ${outcome === 'found-with-hint' ? 'bg-orange-500/20 text-orange-400' : ''}
              ${outcome === 'missed' ? 'bg-red-500/20 text-red-400' : ''}
            `}
            aria-label={`Round ${index + 1}: ${outcome}`}
          >
            {outcome === 'found' && '✓'}
            {outcome === 'found-with-hint' && '💡'}
            {outcome === 'missed' && '✗'}
          </div>
        );
      })}
    </div>
  );
}

export default RoundProgress;
