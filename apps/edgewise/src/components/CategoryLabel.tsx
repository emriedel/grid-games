'use client';

import { CategoryPosition } from '@/types';

interface CategoryLabelProps {
  position: CategoryPosition;
  label: string;
  isCorrect?: boolean | null;
  isHidden?: boolean; // True when category is hidden (shows "?")
}

export function CategoryLabel({ position, label, isCorrect, isHidden }: CategoryLabelProps) {
  const isVertical = position === 'left' || position === 'right';

  // Use subtle accent styling on completion - semi-transparent purple
  // Use muted/dashed styling when hidden
  const bgColor = isCorrect === true
    ? 'bg-[var(--accent)]/20'
    : isHidden
      ? 'bg-[var(--border)]/50 border border-dashed border-[var(--muted)]'
      : 'bg-[var(--border)]';

  const textColor = isHidden ? 'text-[var(--muted)]' : 'text-[var(--foreground)]';

  if (isVertical) {
    return (
      <div
        className={`
          h-full w-10
          ${bgColor}
          ${textColor} text-xs font-medium
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
        ${textColor} text-sm font-medium
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
