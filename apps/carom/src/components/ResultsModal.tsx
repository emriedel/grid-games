'use client';

import { Modal, Button } from '@grid-games/ui';
import { buildShareText, shareOrCopy, getPuzzleNumber } from '@grid-games/shared';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  moveCount: number;
  optimalMoves: number;
  date: string;
  puzzleNumber?: number;
}

function getStarRating(moves: number, optimal: number): number {
  const diff = moves - optimal;
  if (diff <= 1) return 3;
  if (diff <= 4) return 2;
  return 1;
}

function getStarEmoji(stars: number): string {
  return '⭐'.repeat(stars);
}

function getRatingMessage(stars: number): string {
  switch (stars) {
    case 3:
      return 'Perfect!';
    case 2:
      return 'Great!';
    default:
      return 'Solved!';
  }
}

export function ResultsModal({
  isOpen,
  onClose,
  moveCount,
  optimalMoves,
  date,
  puzzleNumber: propPuzzleNumber,
}: ResultsModalProps) {
  const stars = getStarRating(moveCount, optimalMoves);
  // Use provided puzzle number, or fall back to calculation
  const puzzleNumber = propPuzzleNumber ?? getPuzzleNumber(new Date('2026-01-30'), new Date(date));

  const handleShare = async () => {
    const text = buildShareText({
      gameId: 'carom',
      gameName: 'Carom',
      puzzleId: puzzleNumber,
      score: moveCount,
      emojiGrid: getStarEmoji(stars),
      extraLines: [`Solved in ${moveCount} moves`],
      shareUrl: 'games.ericriedel.dev/carom',
    });

    await shareOrCopy(text);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Puzzle Complete!">
      <div className="space-y-6 text-center">
        <div>
          <div className="text-4xl mb-2">{getStarEmoji(stars)}</div>
          <div className="text-2xl font-bold text-[var(--foreground)]">
            {getRatingMessage(stars)}
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
