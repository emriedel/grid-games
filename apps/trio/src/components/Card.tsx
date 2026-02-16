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
  onClick: () => void;
}

/**
 * Interactive card component for Trio.
 * Shows shapes with proper styling for selected/removed/hinted states.
 * Uses square aspect ratio with cream background.
 */
export function Card({ card, isSelected, isRemoving, isAdding, isShaking, isHinted, onClick }: CardProps) {
  // Removing animation - fade out and scale down
  if (isRemoving) {
    return (
      <div
        className="aspect-square rounded-lg bg-[var(--card-bg)] transition-all duration-300 ease-out
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
        ${isSelected
          ? 'bg-[var(--card-bg-selected)] ring-4 ring-[var(--accent)] scale-105 shadow-lg'
          : isHinted
            ? 'bg-[var(--card-bg-hinted)] ring-4 ring-amber-400 shadow-lg shadow-amber-400/50 animate-pulse-subtle'
            : 'bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] hover:scale-[1.02]'
        }
        ${isShaking ? 'animate-shake' : ''}
        ${isAdding ? 'animate-card-add' : ''}
      `}
      aria-pressed={isSelected}
      aria-label={`${card.count} ${card.color} ${card.pattern} ${card.shape}${card.count > 1 ? 's' : ''}${isHinted ? ' (hinted)' : ''}`}
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
