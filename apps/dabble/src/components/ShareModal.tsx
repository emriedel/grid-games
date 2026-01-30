'use client';

import { useState } from 'react';
import { Modal, Button } from '@grid-games/ui';
import { buildShareText, shareOrCopy, formatDisplayDate } from '@grid-games/shared';
import { getLetterUsageBonus } from '@/constants/gameConfig';
import type { Word } from '@/types';

interface ShareModalProps {
  isOpen: boolean;
  date: string;
  words: Word[];
  totalScore: number;
  lettersUsed: number;
  onClose: () => void;
}

const TOTAL_LETTERS = 14;

export function ShareModal({
  isOpen,
  date,
  words,
  totalScore,
  lettersUsed,
  onClose,
}: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const displayDate = formatDisplayDate(date);
  const letterBonus = getLetterUsageBonus(lettersUsed);
  const finalScore = totalScore + letterBonus;
  const allLettersUsed = lettersUsed === TOTAL_LETTERS;

  const handleShare = async () => {
    // Generate letter usage grid (14 squares total)
    const letterGrid = '🟨'.repeat(lettersUsed) + '⬛'.repeat(TOTAL_LETTERS - lettersUsed);
    const emojiGrid = `${letterGrid} (${lettersUsed}/${TOTAL_LETTERS})`;

    const extraLines: string[] = [];
    if (letterBonus > 0) {
      extraLines.push(`+${letterBonus} letter bonus!`);
    }

    const shareText = buildShareText({
      gameId: 'dabble',
      gameName: 'Dabble',
      puzzleId: displayDate,
      score: finalScore,
      emojiGrid,
      extraLines,
      shareUrl: 'https://games.ericriedel.dev/dabble',
    });

    const result = await shareOrCopy(shareText);
    if (result.success && result.method === 'clipboard') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyDetailed = async () => {
    const lines = [
      `Dabble ${displayDate}`,
      `Score: ${finalScore}${letterBonus > 0 ? ` (includes +${letterBonus} letter bonus)` : ''}`,
      '',
      ...words.map((w) => `${w.word} (${w.score})`),
      ...(letterBonus > 0 ? [`Letter bonus: +${letterBonus}`] : []),
      ...(allLettersUsed ? ['All letters used!'] : []),
      '',
      'https://games.ericriedel.dev/dabble',
    ];

    await shareOrCopy(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-[var(--foreground)] mb-1">Great job!</h2>
          <p className="text-[var(--muted)]">{displayDate}</p>
        </div>

        {/* Score summary */}
        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-[var(--accent)] mb-2">{finalScore}</div>
          <div className="text-[var(--muted)]">
            {words.length} word{words.length !== 1 ? 's' : ''} · {lettersUsed}/{TOTAL_LETTERS} letters
          </div>
          {letterBonus > 0 && (
            <div className="mt-2 text-[var(--success)] font-semibold">
              +{letterBonus} letter bonus!
            </div>
          )}
          {allLettersUsed && (
            <div className="mt-1 text-[var(--success)] text-sm">
              All letters used!
            </div>
          )}
        </div>

        {/* Word breakdown */}
        <div className="bg-[var(--tile-bg)] rounded-lg p-4 mb-6 max-h-40 overflow-y-auto">
          <div className="space-y-1">
            {words.map((word, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="font-medium text-[var(--foreground)]">{word.word}</span>
                <span className="text-[var(--accent)]">{word.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Share buttons */}
        <div className="flex flex-col gap-3">
          <Button variant="primary" fullWidth onClick={handleShare}>
            {copied ? 'Copied!' : 'Share Results'}
          </Button>
          <Button variant="secondary" fullWidth onClick={handleCopyDetailed}>
            Copy Detailed Results
          </Button>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-lg text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
