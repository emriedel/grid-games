'use client';

import { useState, useEffect, useCallback } from 'react';
import { GAMES, getIconUrl } from '@grid-games/config';

interface HamburgerMenuProps {
  /** Current game ID to highlight */
  currentGameId?: string;
}

/**
 * Hamburger menu for game navigation
 * Slides out from left with game list
 */
export function HamburgerMenu({ currentGameId }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--tile-bg,#1a1a2e)] hover:bg-[var(--tile-bg-selected,#4a4a6e)] transition-colors"
        aria-label="Open menu"
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
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      {/* Overlay and panel */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50"
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Slide-out panel */}
          <div
            className="absolute left-0 top-0 h-full w-72 bg-[var(--background,#0a0a0a)] border-r border-[var(--border,#27272a)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border,#27272a)]">
              <span className="text-lg font-bold text-[var(--foreground,#ededed)]">
                Games
              </span>
              <button
                onClick={handleClose}
                className="p-1 rounded-lg text-[var(--muted,#a1a1aa)] hover:text-[var(--foreground,#ededed)] hover:bg-[var(--tile-bg,#27272a)] transition-colors"
                aria-label="Close menu"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Game list */}
            <div className="py-2">
              {GAMES.map((game) => (
                <a
                  key={game.id}
                  href={game.href}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-[var(--tile-bg,#27272a)] transition-colors ${
                    currentGameId === game.id ? 'bg-[var(--tile-bg,#27272a)]' : ''
                  }`}
                >
                  <img
                    src={getIconUrl(game.id)}
                    alt={`${game.name} icon`}
                    className="w-10 h-10 rounded-lg"
                  />
                  <span className="font-medium text-[var(--foreground,#ededed)]">
                    {game.name}
                  </span>
                </a>
              ))}
            </div>

            {/* Footer link */}
            <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--border,#27272a)]">
              <a
                href="/"
                className="flex items-center gap-3 px-4 py-4 hover:bg-[var(--tile-bg,#27272a)] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--tile-bg,#27272a)] flex items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[var(--muted,#a1a1aa)]"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </div>
                <span className="font-medium text-[var(--muted,#a1a1aa)]">
                  All Games
                </span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
