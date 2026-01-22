'use client';

import { TIMER_DURATION, MIN_WORD_LENGTH, SCORING_TABLE } from '@/constants/gameConfig';
import { formatTime } from '@/lib/scoring';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[var(--background)] rounded-xl p-6 max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-center mb-4">How To Play</h2>

        <div className="space-y-4 text-sm">
          <section>
            <h3 className="font-bold text-[var(--accent)] mb-1">Goal</h3>
            <p>Find as many words as possible in {formatTime(TIMER_DURATION)}!</p>
          </section>

          <section>
            <h3 className="font-bold text-[var(--accent)] mb-1">Rules</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Connect adjacent letters (including diagonals)</li>
              <li>Each tile can only be used once per word</li>
              <li>Words must be at least {MIN_WORD_LENGTH} letters</li>
              <li>&quot;Qu&quot; counts as one tile but two letters</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-[var(--accent)] mb-1">Controls</h3>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Drag:</strong> Swipe across tiles to form words</li>
              <li><strong>Tap:</strong> Tap tiles to select, double-tap to submit</li>
              <li><strong>Clear:</strong> Reset your current selection</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-[var(--accent)] mb-1">Scoring</h3>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(SCORING_TABLE).map(([length, points]) => (
                <div key={length} className="flex justify-between px-2 py-1 bg-[var(--tile-bg)] rounded">
                  <span>{length}{parseInt(length) === 8 ? '+' : ''} letters</span>
                  <span className="font-bold">{points} pt{points !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-bold text-[var(--accent)] mb-1">Daily Puzzle</h3>
            <p>Everyone gets the same puzzle each day. Come back tomorrow for a new challenge!</p>
          </section>
        </div>

        <button
          onClick={onClose}
          className="
            w-full mt-6 py-2 rounded-lg
            bg-[var(--tile-bg)] hover:bg-[var(--tile-bg-selected)]
            transition-colors
          "
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
