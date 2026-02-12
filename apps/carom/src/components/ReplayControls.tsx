'use client';

import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';

interface ReplayControlsProps {
  currentStep: number;
  totalSteps: number;
  isPlaying: boolean;
  isAtEnd: boolean;
  isAtStart: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
}

export function ReplayControls({
  currentStep,
  totalSteps,
  isPlaying,
  isAtEnd,
  isAtStart,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
}: ReplayControlsProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Step backward */}
        <button
          onClick={onStepBackward}
          disabled={isAtStart || isPlaying}
          className="p-2 rounded-lg bg-[var(--tile-bg)] text-[var(--foreground)] border border-[var(--tile-border)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--tile-bg-selected)] hover:border-[var(--accent)]/40 transition-colors"
          aria-label="Previous move"
          title="Previous move"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        {/* Play/Pause/Replay button */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          className="p-3 rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 transition-colors"
          aria-label={isAtEnd ? 'Replay' : isPlaying ? 'Pause' : 'Play'}
          title={isAtEnd ? 'Replay' : isPlaying ? 'Pause' : 'Play'}
        >
          {isAtEnd ? (
            <RotateCcw className="w-6 h-6" />
          ) : isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6" />
          )}
        </button>

        {/* Step forward */}
        <button
          onClick={onStepForward}
          disabled={isAtEnd || isPlaying}
          className="p-2 rounded-lg bg-[var(--tile-bg)] text-[var(--foreground)] border border-[var(--tile-border)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--tile-bg-selected)] hover:border-[var(--accent)]/40 transition-colors"
          aria-label="Next move"
          title="Next move"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Progress indicator */}
      <div className="text-sm text-[var(--muted-foreground)]">
        Move {currentStep} of {totalSteps}
      </div>
    </div>
  );
}
