'use client';

import { CategoryPosition } from '@/types';

interface CategoryLabelProps {
  position: CategoryPosition;
  label: string;
  isCorrect?: boolean | null;
}

export function CategoryLabel({ position, label, isCorrect }: CategoryLabelProps) {
  const isVertical = position === 'left' || position === 'right';

  // Use subtle accent styling on completion - semi-transparent purple
  const bgColor = isCorrect === true
    ? 'bg-[var(--accent)]/20'
    : 'bg-[var(--border)]';

  if (isVertical) {
    return (
      <div
        className={`
          h-full w-10
          ${bgColor}
          text-[var(--foreground)] text-xs font-medium
          rounded-md
          transition-colors duration-300
          flex items-center justify-center
        `}
      >
        <span
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: position === 'left' ? 'rotate(180deg)' : undefined,
          }}
        >
          {label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`
        w-full
        ${bgColor}
        text-[var(--foreground)] text-sm font-medium
        px-3 py-2
        rounded-md
        transition-colors duration-300
        text-center
      `}
    >
      {label}
    </div>
  );
}
