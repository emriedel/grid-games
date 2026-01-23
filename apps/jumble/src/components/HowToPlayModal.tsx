'use client';

import { Modal, Button } from '@grid-games/ui';
import { TIMER_DURATION, MIN_WORD_LENGTH, SCORING_TABLE } from '@/constants/gameConfig';
import { formatTime } from '@/lib/scoring';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How To Play" size="lg">
      <div className="space-y-4 text-sm">
        <section>
          <h3 className="font-bold text-[var(--accent)] mb-1">Goal</h3>
          <p className="text-[var(--muted)]">Find as many words as possible in {formatTime(TIMER_DURATION)}!</p>
        </section>

        <section>
          <h3 className="font-bold text-[var(--accent)] mb-1">Rules</h3>
          <ul className="list-disc list-inside space-y-1 text-[var(--muted)]">
            <li>Connect adjacent letters (including diagonals)</li>
            <li>Each tile can only be used once per word</li>
            <li>Words must be at least {MIN_WORD_LENGTH} letters</li>
            <li>&quot;Qu&quot; counts as one tile but two letters</li>
          </ul>
        </section>

        <section>
          <h3 className="font-bold text-[var(--accent)] mb-1">Controls</h3>
          <ul className="list-disc list-inside space-y-1 text-[var(--muted)]">
            <li><strong className="text-[var(--foreground)]">Drag:</strong> Swipe across tiles to form words</li>
            <li><strong className="text-[var(--foreground)]">Tap:</strong> Tap tiles to select, double-tap to submit</li>
            <li><strong className="text-[var(--foreground)]">Clear:</strong> Reset your current selection</li>
          </ul>
        </section>

        <section>
          <h3 className="font-bold text-[var(--accent)] mb-1">Scoring</h3>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {Object.entries(SCORING_TABLE).map(([length, points]) => (
              <div key={length} className="flex justify-between px-2 py-1 bg-[var(--tile-bg)] rounded text-[var(--muted)]">
                <span>{length}{parseInt(length) === 8 ? '+' : ''} letters</span>
                <span className="font-bold text-[var(--foreground)]">{points} pt{points !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="font-bold text-[var(--accent)] mb-1">Daily Puzzle</h3>
          <p className="text-[var(--muted)]">Everyone gets the same puzzle each day. Come back tomorrow for a new challenge!</p>
        </section>
      </div>

      <div className="mt-6">
        <Button variant="secondary" fullWidth onClick={onClose}>
          Got it!
        </Button>
      </div>
    </Modal>
  );
}
