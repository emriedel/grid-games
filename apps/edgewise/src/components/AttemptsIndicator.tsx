'use client';

import { MAX_ATTEMPTS } from '@/constants/gameConfig';

interface AttemptsIndicatorProps {
  attemptsUsed: number;
}

export function AttemptsIndicator({ attemptsUsed }: AttemptsIndicatorProps) {
  const remaining = MAX_ATTEMPTS - attemptsUsed;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--muted)]">Attempts:</span>
      <div className="flex gap-1">
        {Array.from({ length: MAX_ATTEMPTS }).map((_, index) => (
          <div
            key={index}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index < remaining
                ? 'bg-[var(--accent)]'
                : 'bg-[var(--border)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
