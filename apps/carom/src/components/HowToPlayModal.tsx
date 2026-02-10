'use client';

import { Modal, Button } from '@grid-games/ui';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function TargetPieceIcon() {
  return (
    <span className="inline-block w-4 h-4 bg-[var(--accent)] rounded align-middle mx-0.5" />
  );
}

function BlockerPieceIcon() {
  return (
    <span className="inline-block w-4 h-4 bg-blue-500 rounded align-middle mx-0.5" />
  );
}

function GoalIcon() {
  return (
    <svg className="inline-block w-4 h-4 align-middle mx-0.5" viewBox="0 0 24 24" fill="var(--accent)">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function WallIcon() {
  return (
    <span className="inline-block w-4 h-1 bg-white rounded align-middle mx-0.5" />
  );
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How to Play Carom">
      <div className="space-y-5 text-[var(--foreground)]">
        {/* Goal Section */}
        <section className="bg-[var(--accent)]/10 rounded-lg p-4 border border-[var(--accent)]/30">
          <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <span>Goal</span>
          </h3>
          <p className="text-[var(--muted)]">
            Guide the <TargetPieceIcon /> <span className="text-[var(--accent)] font-semibold">amber target</span> to
            the <GoalIcon /> <span className="text-[var(--accent)]">goal</span> in as few moves as possible.
          </p>
        </section>

        {/* Movement Section */}
        <section>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <span>Movement</span>
          </h3>
          <div className="space-y-3 text-[var(--muted)]">
            <div className="flex items-start gap-3">
              <span>Pieces <span className="text-[var(--foreground)]">slide until blocked</span> by a wall or another piece</span>
            </div>
            <div className="flex items-start gap-3">
              <span>Move <span className="text-[var(--foreground)]">any piece</span> — use <BlockerPieceIcon /> blockers to create stopping points</span>
            </div>
            <div className="flex items-start gap-3">
              <span><span className="text-[var(--foreground)]">Walls</span> block movement — pieces cannot pass through</span>
            </div>
          </div>
        </section>

        <div className="pt-2">
          <Button variant="primary" fullWidth onClick={onClose}>
            Got it!
          </Button>
        </div>
      </div>
    </Modal>
  );
}
