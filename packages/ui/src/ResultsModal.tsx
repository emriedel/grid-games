'use client';

import { useState, useMemo, type ReactNode } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { GAMES, getIconUrl } from '@grid-games/config';
import { shareOrCopy } from '@grid-games/shared';

const CONGRATS_MESSAGES = [
  'Nice work! 🎉',
  'Well done! ⭐',
  'Great job! 🏆',
  'Awesome! 🎊',
  'Nailed it! 💪',
];

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
  /** Display date (formatted, e.g., "February 4, 2026") */
  date: string;
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
}

/**
 * Shared results modal component for end-game screens.
 * Provides consistent UX across all games with:
 * - Date display
 * - Primary stat (large, accent-colored)
 * - Secondary stats row
 * - Children slot for game-specific breakdown
 * - Share button
 * - "Try another game" section
 * - Close link
 */
export function ResultsModal({
  isOpen,
  onClose,
  gameId,
  gameName,
  date,
  primaryStat,
  secondaryStats,
  children,
  shareConfig,
  onShare,
}: ResultsModalProps) {
  const [copied, setCopied] = useState(false);

  // Pick congrats message once on mount to avoid hydration mismatch
  const congratsMessage = useMemo(
    () => CONGRATS_MESSAGES[Math.floor(Math.random() * CONGRATS_MESSAGES.length)],
    []
  );

  // Get other games (exclude current game)
  const otherGames = GAMES.filter((g) => g.id !== gameId).slice(0, 3);

  const handleShare = async () => {
    const result = await shareOrCopy(shareConfig.text);
    if (result.success && result.method === 'clipboard') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    onShare?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        {/* Congrats + Game name + Date */}
        <div className="text-center mb-6">
          <p className="text-lg font-semibold text-[var(--foreground)] mb-1">
            {congratsMessage}
          </p>
          <p className="text-[var(--muted)]">{gameName} · {date}</p>
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

        {/* Share button */}
        <div className="mb-6">
          <Button variant="primary" fullWidth onClick={handleShare}>
            {copied ? 'Copied!' : 'Share Results'}
          </Button>
        </div>

        {/* Separator */}
        <div className="border-t border-[var(--border)] mb-6" />

        {/* Try another game */}
        <div className="text-center mb-6">
          <p className="text-sm text-[var(--muted)] mb-3">Try another game</p>
          <div className="flex justify-center gap-4">
            {otherGames.map((game) => (
              <a
                key={game.id}
                href={game.href}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--tile-bg)] flex items-center justify-center transition-transform group-hover:scale-105">
                  <img
                    src={getIconUrl(game.id)}
                    alt={game.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xs text-[var(--muted)] group-hover:text-[var(--foreground)] transition-colors">
                  {game.name}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Close button */}
        <div className="text-center">
          <button
            onClick={onClose}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors px-4 py-2 rounded-lg bg-[var(--tile-bg)] hover:bg-[var(--tile-bg-selected)]"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
