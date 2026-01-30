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
            Score as many points as possible by placing letter tiles on the board to form valid words
          </p>
        </section>

        <section>
          <h3 className="font-semibold text-[var(--foreground)] mb-2">Gameplay</h3>
          <ul className="text-[var(--muted)] space-y-1 list-disc list-inside">
            <li>Drag letters onto the board to form words</li>
            <li>Tap a placed tile to return it to your rack</li>
            <li>Tap <strong>Submit</strong> after each word to score</li>
            <li>After <strong>4 turns</strong>, the game ends automatically</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-[var(--foreground)] mb-2">Rules</h3>
          <ul className="text-[var(--muted)] space-y-1 list-disc list-inside">
            <li>First word must cover the center star</li>
            <li>New words must connect to existing ones</li>
            <li>Only valid dictionary words are accepted</li>
          </ul>
        </section>

        <section>
          <h3 className="font-semibold text-[var(--foreground)] mb-2">Bonus Squares</h3>
          <div className="grid grid-cols-2 gap-2 text-[var(--muted)]">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-sky-600 flex items-center justify-center text-xs font-bold text-white">DL</span>
              <span>Double Letter</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-blue-700 flex items-center justify-center text-xs font-bold text-white">TL</span>
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
          <h3 className="font-semibold text-[var(--foreground)] mb-2">Letter Bonus</h3>
          <p className="text-[var(--muted)] mb-2">
            At the end of the game, earn bonus points based on how many of your letters you used:
          </p>
          <ul className="text-[var(--muted)] space-y-1 list-disc list-inside">
            <li>12 letters: <strong className="text-[var(--success)]">+5</strong></li>
            <li>13 letters: <strong className="text-[var(--success)]">+10</strong></li>
            <li>14 letters (all): <strong className="text-[var(--success)]">+20</strong></li>
          </ul>
        </section>
      </div>
    </Modal>
  );
}
