'use client';

import { Modal, Button } from '@grid-games/ui';
import { shareOrCopy, getPuzzleNumber } from '@grid-games/shared';
import { Move, Direction } from '@/types';

const directionArrows: Record<Direction, string> = {
  up: '⬆️',
  down: '⬇️',
  left: '⬅️',
  right: '➡️',
};

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  moveCount: number;
  optimalMoves: number;
  date: string;
  puzzleNumber?: number;
  moveHistory: Move[];
}

export function ResultsModal({
  isOpen,
  onClose,
  moveCount,
  optimalMoves,
  date,
  puzzleNumber: propPuzzleNumber,
  moveHistory,
}: ResultsModalProps) {
  // Use provided puzzle number, or fall back to calculation
  const puzzleNumber = propPuzzleNumber ?? getPuzzleNumber(new Date('2026-01-30'), new Date(date));

  const handleShare = async () => {
    const movesText = moveCount === 1 ? 'move' : 'moves';
    const arrowSequence = moveHistory.map((m) => directionArrows[m.direction]).join('');
    const text = `Carom #${puzzleNumber}\n${arrowSequence}\n${moveCount} ${movesText}\n\nhttps://nerdcube.games/carom`;

    await shareOrCopy(text);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Puzzle Complete!">
      <div className="space-y-6 text-center">
        <div>
          <div className="text-2xl font-bold text-[var(--foreground)]">
            Solved!
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-5xl font-bold text-[var(--accent)]">{moveCount}</div>
          <div className="text-[var(--muted)]">
            {moveCount === 1 ? 'move' : 'moves'}
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <Button variant="primary" fullWidth onClick={handleShare}>
            Share Result
          </Button>
          <Button variant="secondary" fullWidth onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
