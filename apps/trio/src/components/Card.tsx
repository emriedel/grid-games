'use client';

import { CardShape } from './CardShape';
import type { Card as CardType } from '@/types';

interface CardProps {
  card: CardType;
  isSelected: boolean;
  isRemoving?: boolean;
  isAdding?: boolean;
  isShaking?: boolean;
  isHinted?: boolean;
  isCorrectReveal?: boolean;
  onClick: () => void;
}

/**
 * Interactive card component for Trio.
 * Shows shapes with proper styling for selected/removed/hinted/reveal states.
 * Uses square aspect ratio with cream background.
 */
export function Card({ card, isSelected, isRemoving, isAdding, isShaking, isHinted, isCorrectReveal, onClick }: CardProps) {
  // Removing animation - fade out and scale down
  if (isRemoving) {
    return (
      <div
        className="aspect-square rounded-lg transition-all duration-300 ease-out
          opacity-0 scale-75 pointer-events-none"
      />
    );
  }

  return (
    <button
      onClick={onClick}
      className={`
        aspect-square rounded-lg
        flex items-center justify-center
        transition-all duration-150 ease-out
        cursor-pointer select-none
        ${isCorrectReveal
          ? 'ring-4 ring-green-500 scale-105 shadow-lg shadow-green-500/30'
          : isSelected
            ? 'ring-4 ring-[var(--accent)] scale-105'
            : isHinted
              ? 'ring-2 ring-[var(--hint-color)] shadow-md shadow-amber-500/30 animate-pulse-subtle'
              : 'hover:scale-[1.02] hover:bg-white/5'
        }
        ${isShaking ? 'animate-shake' : ''}
        ${isAdding ? 'animate-card-add' : ''}
      `}
      aria-pressed={isSelected}
      aria-label={`${card.count} ${card.color} ${card.pattern} ${card.shape}${card.count > 1 ? 's' : ''}${isHinted ? ' (hinted)' : ''}${isCorrectReveal ? ' (correct answer)' : ''}`}
    >
      <div className="w-full h-full p-3 flex items-center justify-center">
        <CardShape
          shape={card.shape}
          color={card.color}
          pattern={card.pattern}
          count={card.count}
          size="md"
        />
      </div>
    </button>
  );
}

export default Card;
