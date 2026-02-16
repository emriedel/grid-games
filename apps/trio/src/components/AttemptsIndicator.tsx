'use client';

import { GAME_CONFIG } from '@/constants';

interface AttemptsIndicatorProps {
  incorrectGuesses: number;
}

/**
 * Shows remaining attempts as dots.
 * Teal = remaining, gray = used.
 */
export function AttemptsIndicator({ incorrectGuesses }: AttemptsIndicatorProps) {
  const remaining = GAME_CONFIG.MAX_INCORRECT_GUESSES - incorrectGuesses;

  return (
    <div className="flex gap-1.5 items-center" aria-label={`${remaining} attempts remaining`}>
      {Array.from({ length: GAME_CONFIG.MAX_INCORRECT_GUESSES }, (_, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${
            i < remaining
              ? 'bg-[var(--accent)]'
              : 'bg-[var(--border)]'
          }`}
        />
      ))}
    </div>
  );
}

export default AttemptsIndicator;
