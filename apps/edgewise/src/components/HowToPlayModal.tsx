'use client';

import { Modal } from '@grid-games/ui';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How to Play" size="md">
      <div className="space-y-4 text-sm">
        <section>
          <h3 className="font-semibold text-[var(--foreground)] mb-1">Goal</h3>
          <p className="text-[var(--muted)]">
            Rotate the four tiles so that the words facing each category on the border match that category.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-[var(--foreground)] mb-1">Layout</h3>
          <p className="text-[var(--muted)]">
            Four tiles in a 2×2 grid, each with 4 words (one per edge). Four categories surround the grid on the top, right, bottom, and left.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-[var(--foreground)] mb-1">Controls</h3>
          <ul className="text-[var(--muted)] space-y-1 list-disc list-inside">
            <li><strong>Tap a tile:</strong> Rotate it 90° clockwise</li>
            <li><strong>Center button:</strong> Rotate all 4 tiles&apos; positions clockwise</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-[var(--foreground)] mb-1">Hints</h3>
          <ul className="text-[var(--muted)] space-y-1 list-disc list-inside">
            <li>Grayed-out words face the center and are red herrings</li>
            <li>Each category has exactly 2 matching words</li>
            <li>You have 4 attempts to solve the puzzle</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-[var(--foreground)] mb-1">Feedback</h3>
          <p className="text-[var(--muted)]">
            After each guess, you&apos;ll see 4 dots showing how many categories are correct:
          </p>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[var(--success)]" />
              <span className="text-[var(--muted)]">Correct</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[var(--muted)] opacity-50" />
              <span className="text-[var(--muted)]">Incorrect</span>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}
