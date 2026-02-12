'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Mail, Bug, LayoutGrid } from 'lucide-react';
import { GAMES, getIconUrl } from '@grid-games/config';
import { CompletionBadge } from './CompletionBadge';

interface HamburgerMenuProps {
  /** Current game ID to highlight */
  currentGameId?: string;
  /** Completion status map from useGameCompletion hook */
  completionStatus?: Map<string, boolean>;
  /** Callback to open bug reporter modal */
  onReportBug?: () => void;
}

/**
 * Hamburger menu for game navigation
 * Slides out from left with game list
 */
export function HamburgerMenu({ currentGameId, completionStatus, onReportBug }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedGame, setExpandedGame] = useState<string | null>(currentGameId ?? null);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleExpanded = useCallback((gameId: string) => {
    setExpandedGame(prev => prev === gameId ? null : gameId);
  }, []);

  // Update expanded game when currentGameId changes
  useEffect(() => {
    if (currentGameId) {
      setExpandedGame(currentGameId);
    }
  }, [currentGameId]);

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
      <div
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        onClick={handleClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Slide-out panel */}
        <div
          className="absolute left-0 top-0 h-full w-72 bg-[var(--background,#0a0a0a)] border-r border-[var(--border,#27272a)] shadow-2xl transition-transform duration-300 ease-out"
          style={{
            transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border,#27272a)]">
            <div className="flex items-center gap-2">
              <img
                src="https://nerdcube.games/icon.png"
                alt="Nerdcube"
                className="w-7 h-7"
              />
              <span className="text-lg font-bold text-[var(--foreground,#ededed)]">
                Nerdcube Games
              </span>
            </div>
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
            {GAMES.map((game) => {
              const isExpanded = expandedGame === game.id;
              const isCurrent = currentGameId === game.id;

              return (
                <div key={game.id}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-[var(--tile-bg,#27272a)] transition-colors ${
                      isCurrent ? 'bg-[var(--tile-bg,#27272a)]' : ''
                    }`}
                  >
                    <a
                      href={game.href}
                      className="flex items-center gap-3 flex-1"
                    >
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <img
                          src={getIconUrl(game.id)}
                          alt={`${game.name} icon`}
                          className="w-10 h-10 rounded-lg"
                        />
                        <CompletionBadge
                          show={completionStatus?.get(game.id) ?? false}
                          size="sm"
                        />
                      </div>
                      <span className="font-medium text-[var(--foreground,#ededed)]">
                        {game.name}
                      </span>
                    </a>
                    <button
                      onClick={() => toggleExpanded(game.id)}
                      className="w-10 h-10 flex items-center justify-center rounded text-[var(--muted,#a1a1aa)] hover:text-[var(--foreground,#ededed)] hover:bg-[var(--border,#27272a)] transition-colors"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronDown size={18} strokeWidth={2.5} /> : <ChevronRight size={18} strokeWidth={2.5} />}
                    </button>
                  </div>

                  {/* Archive link (collapsed section) - only show for games with archive */}
                  {isExpanded && game.hasArchive && (
                    <a
                      href={`${game.href}/archive`}
                      className="block pl-[4.25rem] pr-4 py-2 text-sm text-[var(--muted,#a1a1aa)] hover:text-[var(--foreground,#ededed)] hover:bg-[var(--tile-bg,#27272a)] transition-colors"
                    >
                      {game.name} Archive
                    </a>
                  )}
                </div>
              );
            })}

            {/* All Games link */}
            <a
              href="/"
              className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--tile-bg,#27272a)] transition-colors"
            >
              <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-lg bg-[var(--tile-bg,#27272a)]">
                <LayoutGrid size={20} className="text-[var(--muted,#a1a1aa)]" />
              </div>
              <span className="font-medium text-[var(--muted,#a1a1aa)]">
                All Games
              </span>
            </a>
          </div>

          {/* Footer section */}
          <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--border,#27272a)] pb-2">
            <div className="flex">
              {onReportBug && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose();
                      onReportBug();
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm text-[var(--muted,#a1a1aa)] hover:text-[var(--foreground,#ededed)] hover:bg-[var(--tile-bg,#27272a)] transition-colors"
                  >
                    <Bug size={16} />
                    Report Bug
                  </button>
                  <div className="w-px bg-[var(--border,#27272a)]" />
                </>
              )}
              <a
                href="/contact"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm text-[var(--muted,#a1a1aa)] hover:text-[var(--foreground,#ededed)] hover:bg-[var(--tile-bg,#27272a)] transition-colors"
              >
                <Mail size={16} />
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
