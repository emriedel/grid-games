import { type ReactNode } from 'react';

interface GameHeaderProps {
  /** Game title */
  title: string;
  /** Subtitle (e.g., puzzle number or date) */
  subtitle?: string;
  /** Right side content (e.g., score, buttons) */
  rightContent?: ReactNode;
  /** Additional classes */
  className?: string;
}

/**
 * Shared game header with title, subtitle, and optional right content
 */
export function GameHeader({
  title,
  subtitle,
  rightContent,
  className = '',
}: GameHeaderProps) {
  return (
    <header className={`flex items-center justify-between mb-4 ${className}`}>
      <div>
        <h1 className="text-2xl font-bold text-[var(--accent,#f59e0b)]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-[var(--muted,#a1a1aa)]">{subtitle}</p>
        )}
      </div>
      {rightContent && <div className="flex items-center gap-2">{rightContent}</div>}
    </header>
  );
}
