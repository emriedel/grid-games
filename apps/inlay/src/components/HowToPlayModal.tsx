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
          <h3 className="font-bold text-lg mb-2">Goal</h3>
          <p className="text-[var(--muted)]">
            Fill the target shape completely using the given pentomino pieces.
            Each pentomino covers exactly 5 squares.
          </p>
        </section>

        <section>
          <h3 className="font-bold text-lg mb-2">Controls</h3>
          <ul className="list-disc list-inside text-[var(--muted)] space-y-1">
            <li><strong>Tap a piece</strong> in the tray to select it</li>
            <li><strong>Tap the same piece again</strong> to rotate it 90°</li>
            <li><strong>Tap a board cell</strong> to place the selected piece</li>
            <li><strong>Tap a placed piece</strong> on the board to remove it</li>
          </ul>
        </section>

        <section>
          <h3 className="font-bold text-lg mb-2">Tips</h3>
          <ul className="list-disc list-inside text-[var(--muted)] space-y-1">
            <li>Valid placement spots are highlighted when a piece is selected</li>
            <li>Each puzzle has at least one valid solution</li>
            <li>Start with the corners and edges</li>
            <li>The X-pentomino is often the trickiest to place</li>
          </ul>
        </section>

        <section>
          <h3 className="font-bold text-lg mb-2">About Pentominoes</h3>
          <p className="text-[var(--muted)]">
            There are 12 distinct pentomino shapes, named after letters they resemble:
            F, I, L, N, P, T, U, V, W, X, Y, Z. Together they cover exactly 60 squares.
          </p>
        </section>

        <div className="pt-4">
          <Button onClick={onClose} variant="primary" fullWidth>
            Got it!
          </Button>
        </div>
      </div>
    </Modal>
  );
}
