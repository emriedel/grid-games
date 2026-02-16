'use client';

import { CardShape } from './CardShape';
import type { Card } from '@/types';

interface FoundSetDisplayProps {
  cards: Card[] | undefined;
}

/**
 * Displays the last found trio at the bottom of the screen.
 * Shows three mini card representations.
 */
export function FoundSetDisplay({ cards }: FoundSetDisplayProps) {
  if (!cards || cards.length !== 3) {
    return null;
  }

  return (
    <div className="animate-found-set-appear">
      <div className="text-xs text-[var(--muted)] text-center mb-2">Last found:</div>
      <div className="flex justify-center gap-2">
        {cards.map((card) => (
          <div
            key={card.id}
            className="w-12 h-12 bg-[var(--card-bg)] rounded-lg flex items-center justify-center p-1"
          >
            <CardShape
              shape={card.shape}
              color={card.color}
              pattern={card.pattern}
              count={card.count}
              size="sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default FoundSetDisplay;
