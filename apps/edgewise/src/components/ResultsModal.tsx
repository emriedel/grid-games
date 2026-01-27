'use client';

import { useState } from 'react';
import { Modal, Button } from '@grid-games/ui';
import { buildShareText, shareOrCopy } from '@grid-games/shared';
import { GuessFeedback } from '@/types';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTryAgain: () => void;
  solved: boolean;
  guessesUsed: number;
  feedbackHistory: GuessFeedback[];
  puzzleDate: string;
  puzzleNumber: number;
}

export function ResultsModal({
  isOpen,
  onClose,
  onTryAgain,
  solved,
  guessesUsed,
  feedbackHistory,
  puzzleDate,
  puzzleNumber,
}: ResultsModalProps) {
  const [copied, setCopied] = useState(false);

  const generateEmojiGrid = (): string => {
    return feedbackHistory
      .map((feedback) => {
        const sorted = [...feedback].sort((a, b) => b - a);
        return sorted
          .map((v) => {
            if (v === 2) return '🟢';
            if (v === 1) return '🟡';
            return '⚪';
          })
          .join('');
      })
      .join('\n');
  };

  const handleShare = async () => {
    const emojiGrid = generateEmojiGrid();

    const shareText = buildShareText({
      gameId: 'edgewise',
      gameName: 'Edgewise',
      puzzleId: puzzleDate,
      score: guessesUsed,
      maxScore: 4,
      emojiGrid,
      extraLines: [solved ? '🎉' : ''],
      shareUrl: 'https://games.ericriedel.dev/edgewise',
    });

    const result = await shareOrCopy(shareText);
    if (result.method === 'clipboard') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={solved ? '🎉 Solved!' : 'Game Over'} size="md">
      <div className="space-y-4">
        {/* Result summary */}
        <div className="text-center">
          {solved ? (
            <p className="text-[var(--foreground)]">
              You solved the puzzle in <span className="font-bold text-[var(--accent)]">{guessesUsed}</span> {guessesUsed === 1 ? 'guess' : 'guesses'}!
            </p>
          ) : (
            <p className="text-[var(--muted)]">
              Better luck tomorrow! The puzzle was not solved.
            </p>
          )}
        </div>

        {/* Puzzle info */}
        <div className="text-center text-sm text-[var(--muted)]">
          <p>Edgewise #{puzzleNumber}</p>
          <p>{puzzleDate}</p>
        </div>

        {/* Feedback history */}
        <div className="flex flex-col items-center gap-2 py-2">
          {feedbackHistory.map((feedback, index) => {
            const sorted = [...feedback].sort((a, b) => b - a);
            return (
              <div key={index} className="flex gap-1">
                {sorted.map((v, i) => (
                  <div
                    key={i}
                    className={`w-5 h-5 rounded-full ${
                      v === 2 ? 'bg-[var(--success)]' : v === 1 ? 'bg-[var(--warning)]' : 'bg-[var(--muted)] opacity-50'
                    }`}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <Button onClick={handleShare} variant="primary" fullWidth>
            {copied ? 'Copied!' : 'Share Results'}
          </Button>
          <Button onClick={onTryAgain} variant="secondary" fullWidth>
            Try Again
          </Button>
        </div>
      </div>
    </Modal>
  );
}
