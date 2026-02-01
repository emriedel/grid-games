'use client';

import type { ReactNode } from 'react';
import { Button } from './Button';

interface LandingScreenProps {
  /** Game emoji (deprecated, use icon instead) */
  emoji?: string;
  /** Game icon image path */
  icon?: string;
  /** Game name */
  name: string;
  /** Game description */
  description: string;
  /** Puzzle info (number and/or date) */
  puzzleInfo: { number?: number; date: string };
  /** Handler for Play button */
  onPlay: () => void;
  /** Handler for How to Play button */
  onRules?: () => void;
  /** Additional buttons (stats, etc.) */
  children?: ReactNode;
  /** URL for home/all games link */
  homeUrl?: string;
}

/**
 * Landing screen for games
 * Shows game identity, puzzle info, and action buttons
 */
export function LandingScreen({
  emoji,
  icon,
  name,
  description,
  puzzleInfo,
  onPlay,
  onRules,
  children,
  homeUrl,
}: LandingScreenProps) {
  return (
    <div className="min-h-screen bg-[var(--background,#0a0a0a)] flex flex-col items-center px-6 py-8 pt-[18vh] relative">
      {/* Home button */}
      {homeUrl && (
        <a
          href={homeUrl}
          className="absolute top-4 left-4 p-2 rounded-lg text-[var(--muted,#a1a1aa)] hover:text-[var(--foreground,#ededed)] hover:bg-[var(--tile-bg,#27272a)] transition-colors"
          aria-label="All games"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </a>
      )}

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
        {description}
      </p>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {onRules && (
          <Button variant="secondary" fullWidth onClick={onRules}>
            How to Play
          </Button>
        )}
        <Button variant="primary" size="lg" fullWidth onClick={onPlay}>
          Play
        </Button>
        {children}
      </div>

      {/* Date below buttons */}
      <div className="text-[var(--muted,#a1a1aa)] text-base mt-6">
        {puzzleInfo.date}
      </div>
    </div>
  );
}
