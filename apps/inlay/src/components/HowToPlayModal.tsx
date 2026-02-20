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
        <p className="text-[var(--muted)]">
          Fill the shape completely using the given pentomino pieces.
        </p>

        <section>
          <h3 className="font-bold mb-2">Controls</h3>
          <ul className="list-disc list-inside text-[var(--muted)] space-y-1">
            <li><strong>Tap a piece</strong> to select it</li>
            <li><strong>Tap again</strong> to rotate 90°</li>
            <li><strong>Tap the board</strong> or <strong>drag a piece</strong> to place</li>
            <li><strong>Tap a placed piece</strong> to remove it</li>
          </ul>
        </section>

        <div className="pt-2">
          <Button onClick={onClose} variant="primary" fullWidth>
            Got it!
          </Button>
        </div>
      </div>
    </Modal>
  );
}
