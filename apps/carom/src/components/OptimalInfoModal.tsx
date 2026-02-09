'use client';

import { Modal } from '@grid-games/ui';

interface OptimalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  optimalMoves: number;
}

export function OptimalInfoModal({ isOpen, onClose, optimalMoves }: OptimalInfoModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Best Solution">
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="text-4xl">🏆</div>
        <div className="text-center">
          <span className="text-2xl font-bold text-[var(--accent)]">{optimalMoves}</span>
          <span className="text-[var(--muted)]"> moves</span>
        </div>
      </div>
    </Modal>
  );
}
