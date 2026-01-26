'use client';

import { GuessFeedback } from '@/types';

interface FeedbackDotsProps {
  feedback: GuessFeedback;
}

export function FeedbackDots({ feedback }: FeedbackDotsProps) {
  // Sort feedback: greens (2) first, then yellows (1), then grays (0)
  const sortedFeedback = [...feedback].sort((a, b) => b - a);

  const getColor = (value: number): string => {
    if (value === 2) return 'bg-[var(--success)]'; // green - correct
    if (value === 1) return 'bg-[var(--warning)]'; // yellow - partial
    return 'bg-[var(--muted)] opacity-50'; // gray - wrong
  };

  return (
    <div className="flex gap-2 justify-center">
      {sortedFeedback.map((value, index) => (
        <div
          key={index}
          className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${getColor(value)} transition-all duration-300`}
        />
      ))}
    </div>
  );
}

interface FeedbackHistoryProps {
  history: GuessFeedback[];
}

export function FeedbackHistory({ history }: FeedbackHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {history.map((feedback, index) => (
        <FeedbackDots key={index} feedback={feedback} />
      ))}
    </div>
  );
}
