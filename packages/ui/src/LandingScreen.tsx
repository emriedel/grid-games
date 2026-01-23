'use client';

import type { ReactNode } from 'react';
import { Button } from './Button';

interface LandingScreenProps {
  /** Game emoji */
  emoji: string;
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
}

/**
 * Landing screen for games
 * Shows game identity, puzzle info, and action buttons
 */
export function LandingScreen({
  emoji,
  name,
  description,
  puzzleInfo,
  onPlay,
  onRules,
  children,
}: LandingScreenProps) {
  return (
    <div className="min-h-screen bg-[var(--background,#0a0a0a)] flex flex-col items-center justify-center px-6 py-8">
      {/* Game icon with accent background */}
      <div className="w-24 h-24 rounded-full bg-[var(--accent)] flex items-center justify-center mb-6">
        <span className="text-5xl" role="img" aria-label={`${name} icon`}>
          {emoji}
        </span>
      </div>

      {/* Game name */}
      <h1 className="text-3xl font-bold text-[var(--accent)] mb-2">
        {name}
      </h1>

      {/* Description */}
      <p className="text-[var(--muted,#a1a1aa)] text-center max-w-xs mb-4">
        {description}
      </p>

      {/* Puzzle info */}
      <div className="text-[var(--foreground,#ededed)] text-sm mb-8">
        {puzzleInfo.number !== undefined && (
          <span className="font-semibold">#{puzzleInfo.number}</span>
        )}
        {puzzleInfo.number !== undefined && ' \u2022 '}
        <span>{puzzleInfo.date}</span>
      </div>

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
    </div>
  );
}
