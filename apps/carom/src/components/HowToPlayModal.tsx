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
    <Modal isOpen={isOpen} onClose={onClose} title="How to Play">
      <div className="space-y-5 text-[var(--foreground)]">
        {/* Goal Section */}
        <section className="bg-[var(--accent)]/10 rounded-lg p-4 border border-[var(--accent)]/30">
          <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
            <GoalIcon />
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
            <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
            <span>Movement</span>
          </h3>
          <div className="space-y-3 text-[var(--muted)]">
            <div className="flex items-start gap-3">
              <span className="text-[var(--accent)] font-mono text-sm mt-0.5">→</span>
              <span>Pieces <span className="text-[var(--foreground)]">slide until blocked</span> by a wall, edge, or another piece</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex gap-0.5 mt-1">
                <TargetPieceIcon />
                <BlockerPieceIcon />
              </span>
              <span>Move <span className="text-[var(--foreground)]">any piece</span> — use <BlockerPieceIcon /> blockers to create stopping points</span>
            </div>
            <div className="flex items-start gap-3">
              <WallIcon />
              <span><span className="text-[var(--foreground)]">Walls</span> block movement — pieces cannot pass through</span>
            </div>
          </div>
        </section>

        {/* Controls Section */}
        <section>
          <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <span>Controls</span>
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-[var(--border)]/30 rounded-lg p-3 text-center">
              <div className="text-[var(--foreground)] font-medium mb-1">Touch</div>
              <div className="text-[var(--muted)]">Tap piece, then tap arrow or swipe</div>
            </div>
            <div className="bg-[var(--border)]/30 rounded-lg p-3 text-center">
              <div className="text-[var(--foreground)] font-medium mb-1">Keyboard</div>
              <div className="text-[var(--muted)]">Click piece, then arrow keys or WASD</div>
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
