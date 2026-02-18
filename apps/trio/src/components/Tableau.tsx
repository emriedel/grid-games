'use client';

import { useMemo } from 'react';
import { Card } from './Card';
import type { Card as CardType } from '@/types';
import { GAME_CONFIG } from '@/constants';

interface TableauProps {
  cards: CardType[];
  selectedCardIds: string[];
  removingCardIds?: string[];
  addingCardIds?: string[];
  shakingCardIds?: string[];
  hintedCardIds?: string[];
  correctTrioCardIds?: string[];
  successCardIds?: string[];
  onCardClick: (cardId: string) => void;
}

/**
 * The game tableau - a 3x3 grid of cards for Sequential Mode.
 * Cards are positioned based on their position property.
 * Uses full width for square cards.
 */
export function Tableau({
  cards,
  selectedCardIds,
  removingCardIds = [],
  addingCardIds = [],
  shakingCardIds = [],
  hintedCardIds = [],
  correctTrioCardIds = [],
  successCardIds = [],
  onCardClick,
}: TableauProps) {
  const { BOARD_COLS, CARD_COUNT } = GAME_CONFIG;

  // Create a position-indexed array for the grid
  // This ensures cards appear in the correct grid positions
  const positionedCards = useMemo(() => {
    const grid: (CardType | null)[] = Array(CARD_COUNT).fill(null);
    for (const card of cards) {
      if (card.position !== undefined && card.position < CARD_COUNT) {
        grid[card.position] = card;
      }
    }
    return grid;
  }, [cards]);

  return (
    <div
      className="grid gap-3 sm:gap-4 w-full max-w-md mx-auto"
      style={{
        gridTemplateColumns: `repeat(${BOARD_COLS}, 1fr)`,
        // Rows are auto-sized based on aspect-square cards to prevent resizing
      }}
    >
      {positionedCards.map((card, position) => {
        if (!card) {
          // Empty slot (shouldn't happen in normal gameplay)
          return (
            <div
              key={`empty-${position}`}
              className="aspect-square rounded-lg bg-[var(--muted)]/20"
            />
          );
        }

        return (
          <Card
            key={card.id}
            card={card}
            isSelected={selectedCardIds.includes(card.id)}
            isRemoving={removingCardIds.includes(card.id)}
            isAdding={addingCardIds.includes(card.id)}
            isShaking={shakingCardIds.includes(card.id)}
            isHinted={hintedCardIds.includes(card.id)}
            isCorrectReveal={correctTrioCardIds.includes(card.id)}
            isSuccess={successCardIds.includes(card.id)}
            onClick={() => onCardClick(card.id)}
          />
        );
      })}
    </div>
  );
}

export default Tableau;
