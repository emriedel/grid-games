'use client';

import { formatTime } from '@/lib/scoring';

interface TimerProps {
  timeRemaining: number;
}

export default function Timer({ timeRemaining }: TimerProps) {
  const isWarning = timeRemaining <= 30 && timeRemaining > 10;
  const isDanger = timeRemaining <= 10;

  // Build color/animation classes based on state
  // Don't use transition-colors when in danger mode to avoid conflicts with animate-pulse
  const stateClasses = isDanger
    ? 'text-[var(--danger)] animate-pulse'
    : isWarning
      ? 'text-[var(--warning)] transition-colors duration-300'
      : 'text-[var(--foreground)] transition-colors duration-300';

  return (
    <div
      className={`
        text-2xl sm:text-2xl font-mono font-bold tracking-wider tabular-nums
        ${stateClasses}
        pr-2
      `}
      style={{
        // Force GPU compositing from the start to prevent layer promotion issues
        // when animate-pulse kicks in - this fixes mobile ghosting where both
        // the old (yellow 0:11) and new (red 0:10) renders are visible simultaneously
        transform: 'translateZ(0)',
      }}
    >
      {formatTime(timeRemaining)}
    </div>
  );
}
