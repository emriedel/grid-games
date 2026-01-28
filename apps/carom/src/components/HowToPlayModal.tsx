'use client';

import { Modal, Button } from '@grid-games/ui';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How to Play">
      <div className="space-y-4 text-[var(--foreground)]">
        <section>
          <h3 className="font-semibold text-lg mb-2">Goal</h3>
          <p className="text-[var(--muted)]">
            Guide the <span className="text-[var(--accent)] font-semibold">amber target piece</span> to
            the <span className="text-[var(--accent)]">goal square</span> in as few moves as possible.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-lg mb-2">Rules</h3>
          <ul className="list-disc list-inside space-y-2 text-[var(--muted)]">
            <li>Pieces slide until they hit a wall, edge, or another piece</li>
            <li>You can move any piece (target or blockers) to create paths</li>
            <li>Walls block movement - pieces cannot pass through them</li>
            <li>Only the target piece needs to reach the goal</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-lg mb-2">Controls</h3>
          <ul className="list-disc list-inside space-y-2 text-[var(--muted)]">
            <li><span className="text-[var(--foreground)]">Tap</span> a piece to select it</li>
            <li><span className="text-[var(--foreground)]">Tap arrows</span> or <span className="text-[var(--foreground)]">swipe</span> to move</li>
            <li><span className="text-[var(--foreground)]">Keyboard:</span> Arrow keys or WASD</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-lg mb-2">Scoring</h3>
          <ul className="list-disc list-inside space-y-2 text-[var(--muted)]">
            <li><span className="text-[var(--accent)]">⭐⭐⭐</span> Optimal or +1 move</li>
            <li><span className="text-[var(--accent)]">⭐⭐</span> +2-4 moves over optimal</li>
            <li><span className="text-[var(--accent)]">⭐</span> +5 or more moves</li>
          </ul>
        </section>

        <div className="pt-4">
          <Button variant="primary" fullWidth onClick={onClose}>
            Got it!
          </Button>
        </div>
      </div>
    </Modal>
  );
}
