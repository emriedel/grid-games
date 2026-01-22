'use client';

import { formatTime } from '@/lib/scoring';

interface TimerProps {
  timeRemaining: number;
}

export default function Timer({ timeRemaining }: TimerProps) {
  const isWarning = timeRemaining <= 30 && timeRemaining > 10;
  const isDanger = timeRemaining <= 10;

  return (
    <div
      className={`
        text-4xl sm:text-5xl font-mono font-bold tracking-wider
        transition-colors duration-300
        ${isDanger ? 'text-[var(--danger)] animate-pulse' : ''}
        ${isWarning && !isDanger ? 'text-[var(--warning)]' : ''}
        ${!isWarning && !isDanger ? 'text-[var(--foreground)]' : ''}
      `}
    >
      {formatTime(timeRemaining)}
    </div>
  );
}
