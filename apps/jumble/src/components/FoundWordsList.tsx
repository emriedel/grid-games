'use client';

import { FoundWord } from '@/types';

interface FoundWordsListProps {
  foundWords: FoundWord[];
}

export default function FoundWordsList({ foundWords }: FoundWordsListProps) {
  return (
    <div className="w-full">
      <div className="max-h-48 overflow-y-auto bg-[var(--tile-bg)] rounded-lg p-2">
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
