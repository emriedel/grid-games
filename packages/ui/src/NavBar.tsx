'use client';

import type { ReactNode } from 'react';

interface NavBarProps {
  /** Game title */
  title: string;
  /** URL for home button - should go to main game selection (default: '/') */
  homeUrl?: string;
  /** Handler for rules/how-to-play button */
  onRulesClick?: () => void;
  /** Custom content for right side (score, timer, etc.) */
  rightContent?: ReactNode;
}

/**
 * Navigation bar for game screens
 * Fixed top position with home button, title, and optional content
 */
export function NavBar({
  title,
  homeUrl = '/',
  onRulesClick,
  rightContent,
}: NavBarProps) {
  return (
    <nav className="sticky top-0 z-40 w-full bg-[var(--background,#0a0a0a)] border-b border-[var(--border,#27272a)] pt-2">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        {/* Left: Home button + Title */}
        <div className="flex items-center gap-3">
          <a
            href={homeUrl}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--tile-bg,#1a1a2e)] hover:bg-[var(--tile-bg-selected,#4a4a6e)] transition-colors"
            aria-label="Back to game selection"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-[var(--foreground,#ededed)]"
            >
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </a>
          <span className="text-[var(--accent)] font-bold text-lg">
            {title}
          </span>
        </div>

        {/* Right: Custom content + Rules button */}
        <div className="flex items-center gap-2">
          {rightContent}
          {onRulesClick && (
            <button
              onClick={onRulesClick}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--tile-bg,#1a1a2e)] hover:bg-[var(--tile-bg-selected,#4a4a6e)] transition-colors"
              aria-label="How to play"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--foreground,#ededed)]"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
