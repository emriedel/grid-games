'use client';

import { FoundWord } from '@/types';

interface FoundWordsListProps {
  foundWords: FoundWord[];
  totalScore: number;
}

export default function FoundWordsList({ foundWords, totalScore }: FoundWordsListProps) {
  return (
    <div className="w-full">
      <div
        className="
          w-full flex items-center justify-between px-4 py-2
          bg-[var(--tile-bg)] rounded-t-lg
        "
      >
        <span className="text-sm">
          {foundWords.length} word{foundWords.length !== 1 ? 's' : ''}
        </span>
        <span className="font-bold">{totalScore} pts</span>
      </div>

      <div className="max-h-32 overflow-y-auto bg-[var(--tile-bg)] rounded-b-lg p-2 border-t border-[var(--tile-border)]">
        {foundWords.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-2">No words found yet</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {foundWords.map((fw) => (
              <span
                key={fw.word}
                className="
                  px-2 py-1 text-xs rounded
                  bg-[var(--tile-bg-selected)]
                "
              >
                {fw.word} <span className="opacity-60">+{fw.score}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
