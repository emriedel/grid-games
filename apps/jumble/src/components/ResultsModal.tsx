'use client';

import { Modal, Button } from '@grid-games/ui';
import { FoundWord } from '@/types';
import { generateEmojiBar } from '@grid-games/shared';
import ShareButton from './ShareButton';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  puzzleNumber: number;
  foundWords: FoundWord[];
  totalPossibleWords: number;
  score: number;
}

export default function ResultsModal({
  isOpen,
  onClose,
  puzzleNumber,
  foundWords,
  totalPossibleWords,
  score,
}: ResultsModalProps) {
  const percentage = totalPossibleWords > 0
    ? Math.round((foundWords.length / totalPossibleWords) * 100)
    : 0;
  const performanceBar = generateEmojiBar(foundWords.length, totalPossibleWords, {
    filledEmoji: '🟩',
    emptyEmoji: '⬜',
  });

  // Sort words by score descending
  const sortedWords = [...foundWords].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.word.localeCompare(b.word);
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-center text-[var(--foreground)] mb-4">
          Jumble #{puzzleNumber}
        </h2>

        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-[var(--accent)] mb-2">
            {score} points
          </div>
          <div className="text-lg text-[var(--muted)] mb-2">
            {foundWords.length} of {totalPossibleWords} words ({percentage}%)
          </div>
          <div className="text-2xl tracking-wider">
            {performanceBar}
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <ShareButton
            puzzleNumber={puzzleNumber}
            wordsFound={foundWords.length}
            totalPossibleWords={totalPossibleWords}
            score={score}
          />
        </div>

        {sortedWords.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2 text-[var(--muted)]">
              Words Found
            </h3>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {sortedWords.map((fw) => (
                <span
                  key={fw.word}
                  className="px-2 py-1 text-xs rounded bg-[var(--tile-bg)] text-[var(--foreground)]"
                >
                  {fw.word} +{fw.score}
                </span>
              ))}
            </div>
          </div>
        )}

        <Button variant="secondary" fullWidth onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
