'use client';

import { Modal } from '@grid-games/ui';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How to Play" size="lg">
      <div className="space-y-4 text-sm">
        <section>
          <h3 className="font-semibold text-[var(--foreground)] mb-2">Goal</h3>
          <p className="text-[var(--muted)]">
            Score as many points as possible by placing letter tiles on the board to form valid words.
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-[var(--foreground)] mb-2">Gameplay</h3>
          <ul className="text-[var(--muted)] space-y-1 list-disc list-inside">
            <li>Tap a letter in your rack, then tap a cell to place it</li>
            <li>Or drag letters directly to the board</li>
            <li>Tap a placed tile to return it to your rack</li>
            <li>Form a word and tap <strong>Submit</strong> to score</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-[var(--foreground)] mb-2">Rules</h3>
          <ul className="text-[var(--muted)] space-y-1 list-disc list-inside">
            <li>First word must cover the center star</li>
            <li>New words must connect to existing tiles</li>
            <li>Only valid dictionary words are accepted</li>
            <li>Letters can only be used once</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-[var(--foreground)] mb-2">Bonus Squares</h3>
          <div className="grid grid-cols-2 gap-2 text-[var(--muted)]">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-xs font-bold text-white">DL</span>
              <span>Double Letter</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-blue-800 flex items-center justify-center text-xs font-bold text-white">TL</span>
              <span>Triple Letter</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-rose-600 flex items-center justify-center text-xs font-bold text-white">DW</span>
              <span>Double Word</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-orange-600 flex items-center justify-center text-xs font-bold text-white">TW</span>
              <span>Triple Word</span>
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-semibold text-[var(--foreground)] mb-2">Bonus</h3>
          <p className="text-[var(--muted)]">
            Use all your letters for a <strong className="text-[var(--success)]">+50 point bonus</strong>!
          </p>
        </section>
      </div>
    </Modal>
  );
}
