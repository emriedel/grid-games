'use client';

import { FoundWord } from '@/types';
import { generatePerformanceBar } from '@/lib/scoring';
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
  if (!isOpen) return null;

  const percentage = totalPossibleWords > 0
    ? Math.round((foundWords.length / totalPossibleWords) * 100)
    : 0;
  const performanceBar = generatePerformanceBar(foundWords.length, totalPossibleWords);

  // Sort words by score descending
  const sortedWords = [...foundWords].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.word.localeCompare(b.word);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[var(--background)] rounded-xl p-6 max-w-sm w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-center mb-4">
          Jumble #{puzzleNumber}
        </h2>

        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-[var(--accent)] mb-2">
            {score} points
          </div>
          <div className="text-lg mb-2">
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
            <h3 className="text-sm font-bold uppercase tracking-wider mb-2 opacity-60">
              Words Found
            </h3>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {sortedWords.map((fw) => (
                <span
                  key={fw.word}
                  className="px-2 py-1 text-xs rounded bg-[var(--tile-bg)]"
                >
                  {fw.word} +{fw.score}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="
            w-full py-2 rounded-lg
            bg-[var(--tile-bg)] hover:bg-[var(--tile-bg-selected)]
            transition-colors
          "
        >
          Close
        </button>
      </div>
    </div>
  );
}
