'use client';

import { Modal, Button } from '@grid-games/ui';
import { FoundWord } from '@/types';
import ShareButton from './ShareButton';

interface ResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  foundWords: FoundWord[];
  score: number;
}

// Number to keycap emoji mapping
const numberEmojis: Record<number, string> = {
  3: '3️⃣',
  4: '4️⃣',
  5: '5️⃣',
  6: '6️⃣',
  7: '7️⃣',
  8: '8️⃣',
  9: '9️⃣',
};

export default function ResultsModal({
  isOpen,
  onClose,
  foundWords,
  score,
}: ResultsModalProps) {
  // Group words by length
  const wordsByLength: Record<number, FoundWord[]> = {};
  for (const fw of foundWords) {
    const len = fw.word.length;
    if (!wordsByLength[len]) {
      wordsByLength[len] = [];
    }
    wordsByLength[len].push(fw);
  }

  // Sort words within each length group alphabetically
  for (const len in wordsByLength) {
    wordsByLength[len].sort((a, b) => a.word.localeCompare(b.word));
  }

  // Get sorted lengths (3, 4, 5, 6, 7+)
  const lengths = Object.keys(wordsByLength)
    .map(Number)
    .sort((a, b) => a - b);

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        <h2 className="text-2xl font-bold text-center text-[var(--foreground)] mb-4">
          Jumble
        </h2>

        <div className="text-center mb-6">
          <div className="text-4xl font-bold text-[var(--accent)] mb-2">
            {score} points
          </div>
          <div className="text-lg text-[var(--muted)]">
            {foundWords.length} word{foundWords.length !== 1 ? 's' : ''} found
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <ShareButton
            wordsFound={foundWords.length}
            totalPossibleWords={0}
            score={score}
            foundWords={foundWords}
          />
        </div>

        {foundWords.length > 0 && (
          <div className="mb-6 space-y-4 max-h-48 overflow-y-auto">
            {lengths.map((len) => {
              const words = wordsByLength[len];
              const emoji = len >= 7 ? `${numberEmojis[7]}+` : numberEmojis[len];
              return (
                <div key={len}>
                  <h3 className="text-sm font-bold mb-2 text-[var(--muted)]">
                    {emoji} {len >= 7 ? '7+ letters' : `${len} letters`} ({words.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {words.map((fw) => (
                      <span
                        key={fw.word}
                        className="px-2 py-1 text-xs rounded bg-[var(--tile-bg)] text-[var(--foreground)]"
                      >
                        {fw.word}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button variant="secondary" fullWidth onClick={handleClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
