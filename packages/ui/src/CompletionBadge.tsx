'use client';

import { Check } from 'lucide-react';

interface CompletionBadgeProps {
  /** Size variant: 'sm' for 40x40 icons, 'lg' for 80x80 icons */
  size?: 'sm' | 'lg';
  /** Whether to show the badge */
  show: boolean;
}

/**
 * Checkmark badge indicating puzzle completion
 * Positioned absolutely in bottom-right of parent container
 */
export function CompletionBadge({ size = 'lg', show }: CompletionBadgeProps) {
  if (!show) return null;

  const sizeClasses =
    size === 'sm'
      ? 'w-4 h-4 -bottom-0.5 -right-0.5' // 16px for 40x40 icons
      : 'w-5 h-5 -bottom-1 -right-1'; // 20px for 80x80 icons

  const iconSize = size === 'sm' ? 10 : 12;

  return (
    <div
      className={`absolute ${sizeClasses} rounded-full bg-[#22c55e] flex items-center justify-center shadow-sm border-2 border-[var(--background,#0a0a0a)]`}
      aria-label="Completed today"
    >
      <Check size={iconSize} strokeWidth={3} className="text-white" />
    </div>
  );
}
