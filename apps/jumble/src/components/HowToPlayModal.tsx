'use client';

import { Modal } from '@grid-games/ui';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How To Play Jumble" size="md">
      <div className="space-y-4 text-sm">
        <p className="text-[var(--muted)]">
          Find words by connecting adjacent tiles (including diagonals). Each tile can only be used once per word.
        </p>

        <section>
          <h3 className="font-bold text-[var(--accent)] mb-1">Controls</h3>
          <p className="text-[var(--muted)]">
            Drag across tiles, or tap to select and double-tap to submit.
          </p>
        </section>

        <section>
          <h3 className="font-bold text-[var(--accent)] mb-1">Word Scoring</h3>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex justify-between px-2 py-1 bg-[var(--tile-bg)] rounded text-[var(--muted)]">
              <span>3 letters</span>
              <span className="font-bold text-[var(--foreground)]">1 pt</span>
            </div>
            <div className="flex justify-between px-2 py-1 bg-[var(--tile-bg)] rounded text-[var(--muted)]">
              <span>4 letters</span>
              <span className="font-bold text-[var(--foreground)]">2 pts</span>
            </div>
            <div className="flex justify-between px-2 py-1 bg-[var(--tile-bg)] rounded text-[var(--muted)]">
              <span>5 letters</span>
              <span className="font-bold text-[var(--foreground)]">4 pts</span>
            </div>
            <div className="flex justify-between px-2 py-1 bg-[var(--tile-bg)] rounded text-[var(--muted)]">
              <span>6+ letters</span>
              <span className="font-bold text-[var(--foreground)]">8 pts</span>
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-bold text-[var(--accent)] mb-1">Stars</h3>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div className="flex justify-between px-2 py-1 bg-[var(--tile-bg)] rounded text-[var(--muted)]">
              <span>15 pts</span>
              <span>★☆☆</span>
            </div>
            <div className="flex justify-between px-2 py-1 bg-[var(--tile-bg)] rounded text-[var(--muted)]">
              <span>30 pts</span>
              <span>★★☆</span>
            </div>
            <div className="flex justify-between px-2 py-1 bg-[var(--tile-bg)] rounded text-[var(--muted)]">
              <span>45 pts</span>
              <span>★★★</span>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}
