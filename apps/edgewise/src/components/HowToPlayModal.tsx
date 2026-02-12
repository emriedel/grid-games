'use client';

import { Modal } from '@grid-games/ui';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How to Play Edgewise" size="md">
      <div className="space-y-4 text-sm">
        <p className="text-[var(--muted)]">
          Rotate the four tiles so the words facing each category match that category.
        </p>
        <p className="text-[var(--muted)]">
          Each category needs exactly 2 words, the others are just there to trick you!
        </p>

        <section>
          <h3 className="font-semibold text-[var(--foreground)] mb-1">Controls</h3>
          <ul className="text-[var(--muted)] space-y-1 list-disc list-inside">
            <li><strong>Tap a tile:</strong> Rotate it 90°</li>
            <li><strong>Center button:</strong> Rotate all tile positions</li>
          </ul>
        </section>

      </div>
    </Modal>
  );
}
