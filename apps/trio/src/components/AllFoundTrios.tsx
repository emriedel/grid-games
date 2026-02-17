'use client';

import { CardShape } from './CardShape';
import type { Card } from '@/types';

interface AllFoundTriosProps {
  /** Array of all trios (found + missed), each containing 3 cards */
  allTrios: Card[][];
}

/**
 * Displays all trios in a vertical list with separators.
 * Shown when the game is finished.
 */
export function AllFoundTrios({ allTrios }: AllFoundTriosProps) {
  if (allTrios.length === 0) {
    return (
      <div className="text-center text-[var(--muted)] py-8">
        No trios found
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center py-4">
      {allTrios.map((trio, index) => (
        <div key={index} className="w-full">
          {/* Separator between trios (not before the first one) */}
          {index > 0 && (
            <div className="w-full h-px bg-[var(--border)]/30 my-4" />
          )}

          <div className="flex items-center justify-center">
            {/* Trio cards */}
            <div className="flex gap-2">
              {trio.map((card, cardIndex) => (
                <div
                  key={card.id || `card-${index}-${cardIndex}`}
                  className="w-20 h-20 flex items-center justify-center p-2"
                >
                  <CardShape
                    shape={card.shape}
                    color={card.color}
                    pattern={card.pattern}
                    count={card.count}
                    size="md"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AllFoundTrios;
