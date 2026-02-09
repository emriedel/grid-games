'use client';

import { Modal } from '@grid-games/ui';

interface OptimalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  optimalMoves: number;
}

export function OptimalInfoModal({ isOpen, onClose, optimalMoves }: OptimalInfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Optimal Solution">
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="text-4xl">🏆</div>
        <div className="text-center">
          <span className="text-[var(--muted)]">Optimal: </span>
          <span className="text-2xl font-bold text-[var(--accent)]">{optimalMoves}</span>
          <span className="text-[var(--muted)]"> moves</span>
        </div>
        <p className="text-sm text-[var(--muted)] text-center max-w-xs">
          Solve the puzzle in {optimalMoves} moves to earn the trophy!
        </p>
      </div>
    </Modal>
  );
}
