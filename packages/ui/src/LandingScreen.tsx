'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from './Button';
import { HamburgerMenu } from './HamburgerMenu';
import { useGameCompletion } from './useGameCompletion';

/** Landing screen mode determines the UI state */
export type LandingScreenMode = 'fresh' | 'in-progress' | 'completed';

interface LandingScreenProps {
  /** Game emoji (deprecated, use icon instead) */
  emoji?: string;
  /** Game icon image path */
  icon?: string;
  /** Game name */
  name: string;
  /** Game description (shown in 'fresh' mode, can be overridden by mode) */
  description: string;
  /** Puzzle info (number and/or date) */
  puzzleInfo: { number?: number; date: string };
  /** Handler for Play button (fresh mode) */
  onPlay?: () => void;
  /** Handler for Resume button (in-progress mode) */
  onResume?: () => void;
  /** Handler for See Results button (completed mode) */
  onSeeResults?: () => void;
  /** Handler for How to Play button */
  onRules?: () => void;
  /** Handler for Archive button (opens archive modal) */
  onArchive?: () => void;
  /** URL for Archive page (alternative to onArchive) */
  archiveHref?: string;
  /** Additional buttons (stats, etc.) */
  children?: ReactNode;
  /** URL for home/all games link (deprecated, menu now used instead) */
  homeUrl?: string;
  /** Current game ID for menu highlighting */
  gameId?: string;
  /** Landing screen mode: 'fresh' (default), 'in-progress', or 'completed' */
  mode?: LandingScreenMode;
  /** Callback to open bug reporter modal */
  onReportBug?: () => void;
}

/**
 * Landing screen for games
 * Shows game identity, puzzle info, and action buttons
 * Supports three modes:
 * - 'fresh': New game, shows description with How to Play + Play buttons
 * - 'in-progress': Saved game exists, shows resume message with How to Play + Resume buttons
 * - 'completed': Today's puzzle completed, shows congrats message with See Results button
 */
export function LandingScreen({
  emoji,
  icon,
  name,
  description,
  puzzleInfo,
  onPlay,
  onResume,
  onSeeResults,
  onRules,
  onArchive,
  archiveHref,
  children,
  gameId,
  mode = 'fresh',
  onReportBug,
}: LandingScreenProps) {
  const completionStatus = useGameCompletion();

  // Determine description text based on mode
  const displayDescription = mode === 'fresh'
    ? description
    : mode === 'in-progress'
    ? 'You have a game in progress'
    : "Great job on today's game!";

  // Check if archive is available (either as href or click handler)
  const hasArchive = onArchive || archiveHref;

  // Render archive button/link
  const renderArchiveButton = (label: string) => {
    if (archiveHref) {
      return (
        <Link href={archiveHref} className="w-full">
          <Button variant="secondary" fullWidth>
            {label}
          </Button>
        </Link>
      );
    }
    if (onArchive) {
      return (
        <Button variant="secondary" fullWidth onClick={onArchive}>
          {label}
        </Button>
      );
    }
    return null;
  };

  // Render action buttons based on mode
  const renderActionButtons = () => {
    switch (mode) {
      case 'completed':
        return (
          <>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={onSeeResults}
            >
              View Game
            </Button>
            {hasArchive && renderArchiveButton(`${name} Archive`)}
          </>
        );

      case 'in-progress':
        return (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onResume ?? onPlay}
          >
            Resume
          </Button>
        );

      case 'fresh':
      default:
        return (
          <>
            <Button variant="primary" size="lg" fullWidth onClick={onPlay}>
              Play
            </Button>
            {onRules && (
              <Button variant="secondary" fullWidth onClick={onRules}>
                How to Play
              </Button>
            )}
            {hasArchive && renderArchiveButton('Archive')}
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background,#0a0a0a)] flex flex-col items-center px-6 py-8 pt-[18vh] relative">
      {/* Menu button */}
      <div className="absolute top-4 left-4">
        <HamburgerMenu currentGameId={gameId} completionStatus={completionStatus} onReportBug={onReportBug} />
      </div>

      {/* Game icon */}
      {icon ? (
        <div className="w-24 h-24 rounded-xl overflow-hidden mb-6">
          <img
            src={icon}
            alt={`${name} icon`}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="w-24 h-24 rounded-full bg-[var(--accent)] flex items-center justify-center mb-6">
          <span className="text-5xl" role="img" aria-label={`${name} icon`}>
            {emoji}
          </span>
        </div>
      )}

      {/* Game name */}
      <h1 className="text-4xl font-bold text-[var(--accent)] mb-3">
        {name}
      </h1>

      {/* Description */}
      <p className="text-[var(--muted,#a1a1aa)] text-center text-lg max-w-xs mb-8">
        {displayDescription}
      </p>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {renderActionButtons()}
        {children}
      </div>

      {/* Puzzle info below buttons */}
      <div className="text-[var(--muted,#a1a1aa)] text-base mt-6">
        {puzzleInfo.number ? `#${puzzleInfo.number} · ${puzzleInfo.date}` : puzzleInfo.date}
      </div>
    </div>
  );
}
