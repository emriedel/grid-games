'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { CompletionBadge } from './CompletionBadge';
import { GAMES, getIconUrl } from '@grid-games/config';
import { shareOrCopy, trackShare } from '@grid-games/shared';
import { useGameCompletion } from './useGameCompletion';

const SUCCESS_MESSAGES = [
  'Nice work! 🎉',
  'Well done! ⭐',
  'Great job! 🏆',
  'Awesome! 🎊',
  'Nailed it! 💪',
];

const FAILURE_MESSAGES = [
  'Better luck next time!',
  'Keep practicing!',
  "You'll get 'em next time!",
  'Try again tomorrow!',
  'Keep at it!',
];

const NEUTRAL_MESSAGE = 'Puzzle complete';

export interface PrimaryStat {
  value: number | string;
  label: string;
}

export interface SecondaryStat {
  label: string;
  value: string | number;
  highlight?: 'success' | 'accent';
}

export interface ShareConfig {
  /** Text to share/copy */
  text: string;
}

export interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current game ID (filters from "try another game" section) */
  gameId: string;
  /** Game name for display (e.g., "Carom", "Dabble") */
  gameName: string;
  /** Optional puzzle number for display (e.g., 35 for "#35") */
  puzzleNumber?: number;
  /** Primary stat shown prominently */
  primaryStat: PrimaryStat;
  /** Optional secondary stats row */
  secondaryStats?: SecondaryStat[];
  /** Optional game-specific breakdown content */
  children?: ReactNode;
  /** Share configuration */
  shareConfig: ShareConfig;
  /** Callback after share button clicked (for analytics, etc.) */
  onShare?: () => void;
  /** Message type: 'success' for positive, 'failure' for encouraging, 'neutral' for completed */
  messageType?: 'success' | 'failure' | 'neutral';
  /** Additional actions to render after the share button */
  additionalActions?: ReactNode;
}

/**
 * Shared results modal component for end-game screens.
 * Provides consistent UX across all games with:
 * - Primary stat (large, accent-colored)
 * - Secondary stats row
 * - Children slot for game-specific breakdown
 * - Share button
 * - "Try another game" section
 */
export function ResultsModal({
  isOpen,
  onClose,
  gameId,
  gameName,
  puzzleNumber,
  primaryStat,
  secondaryStats,
  children,
  shareConfig,
  onShare,
  messageType = 'success',
  additionalActions,
}: ResultsModalProps) {
  const [copied, setCopied] = useState(false);
  const completionStatus = useGameCompletion();

  // Pick message once on mount based on message type to avoid hydration mismatch
  const resultMessage = useMemo(() => {
    if (messageType === 'failure') {
      return FAILURE_MESSAGES[Math.floor(Math.random() * FAILURE_MESSAGES.length)];
    }
    if (messageType === 'neutral') {
      return NEUTRAL_MESSAGE;
    }
    return SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
  }, [messageType]);

  // Get current game info and calculate display games
  const currentGame = GAMES.find((g) => g.id === gameId);
  const hasArchive = currentGame?.hasArchive ?? false;

  // Build list: prioritize incomplete games, then add completed games to fill 4 slots
  const displayGames = useMemo(() => {
    const otherGamesList = GAMES.filter(g => g.id !== gameId);
    const incompleteGames = otherGamesList.filter(g => !completionStatus.get(g.id));
    const completedGames = otherGamesList.filter(g => completionStatus.get(g.id));

    // Archive counts as 1 item if available, so we have 3 slots for games; otherwise 4
    const slotsForGames = hasArchive ? 3 : 4;
    return [...incompleteGames, ...completedGames].slice(0, slotsForGames);
  }, [gameId, completionStatus, hasArchive]);

  const handleShare = async () => {
    const result = await shareOrCopy(shareConfig.text);
    if (result.success) {
      // Track the share event
      trackShare(gameId, puzzleNumber ?? 0, result.method === 'share' ? 'share' : 'clipboard');

      if (result.method === 'clipboard') {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
    onShare?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6 relative">
        {/* Close X button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Result message + Game name + Puzzle number */}
        <div className="text-center mb-6">
          <p className="text-lg font-semibold text-[var(--foreground)] mb-1">
            {resultMessage}
          </p>
          <p className="text-[var(--muted)]">
            {gameName}{puzzleNumber ? ` #${puzzleNumber}` : ''}
          </p>
        </div>

        {/* Primary stat */}
        <div className="text-center mb-4">
          <div className="text-5xl font-bold text-[var(--accent)]">
            {primaryStat.value}
          </div>
          <div className="text-[var(--muted)] mt-1">{primaryStat.label}</div>
        </div>

        {/* Secondary stats */}
        {secondaryStats && secondaryStats.length > 0 && (
          <div className="text-center mb-6">
            <div className="text-[var(--muted)]">
              {secondaryStats.map((stat, index) => (
                <span key={stat.label}>
                  {index > 0 && ' · '}
                  <span
                    className={
                      stat.highlight === 'success'
                        ? 'text-[var(--success)]'
                        : stat.highlight === 'accent'
                          ? 'text-[var(--accent)]'
                          : ''
                    }
                  >
                    {stat.value}
                  </span>{' '}
                  {stat.label.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Game-specific breakdown slot */}
        {children && <div className="mb-6">{children}</div>}

        {/* Share button and additional actions */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <Button variant="primary" onClick={handleShare} className="min-w-[200px]" data-testid="share-button">
            {copied ? 'Copied!' : 'Share Results'}
          </Button>
          {additionalActions}
        </div>

        {/* Separator */}
        <div className="border-t border-[var(--border)] mb-6" />

        {/* Try another game */}
        <div className="text-center">
          <p className="text-sm text-[var(--muted)] mb-3">Try another game</p>
          <div className="flex justify-center gap-4">
            {/* Archive link for current game (if available) - always first */}
            {hasArchive && currentGame && (
              <a
                href={`${currentGame.href}/archive`}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[var(--tile-bg)] flex items-center justify-center transition-transform group-hover:scale-105">
                  <img
                    src={getIconUrl(currentGame.id)}
                    alt={`${currentGame.name} Archive`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors">
                  Archive
                </span>
              </a>
            )}
            {displayGames.map((game) => (
              <a
                key={game.id}
                href={game.href}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[var(--tile-bg)] flex items-center justify-center transition-transform group-hover:scale-105">
                  <img
                    src={getIconUrl(game.id)}
                    alt={game.name}
                    className="w-full h-full object-cover"
                  />
                  <CompletionBadge show={completionStatus.get(game.id) ?? false} size="sm" />
                </div>
                <span className="text-xs text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors">
                  {game.name}
                </span>
              </a>
            ))}
          </div>
        </div>

      </div>
    </Modal>
  );
}
