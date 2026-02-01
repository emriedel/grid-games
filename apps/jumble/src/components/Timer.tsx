'use client';

import { formatTime } from '@/lib/scoring';

interface TimerProps {
  timeRemaining: number;
}

export default function Timer({ timeRemaining }: TimerProps) {
  const isWarning = timeRemaining <= 30 && timeRemaining > 10;
  const isDanger = timeRemaining <= 10;

  const textColorClass = isDanger
    ? 'text-[var(--danger)] animate-pulse'
    : isWarning
      ? 'text-[var(--warning)]'
      : 'text-[var(--foreground)]';

  return (
    <div
      className={`
        text-2xl sm:text-2xl font-mono font-bold tracking-wider
        transition-colors duration-300
        ${textColorClass}
        pr-2
      `}
    >
      {formatTime(timeRemaining)}
    </div>
  );
}
