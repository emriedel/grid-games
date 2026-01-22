'use client';

import { useState } from 'react';
import { FoundWord } from '@/types';

interface FoundWordsListProps {
  foundWords: FoundWord[];
  totalScore: number;
}

export default function FoundWordsList({ foundWords, totalScore }: FoundWordsListProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Sort words by score (descending), then alphabetically
  const sortedWords = [...foundWords].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.word.localeCompare(b.word);
  });

  return (
    <div className="w-full">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="
          w-full flex items-center justify-between px-4 py-2
          bg-[var(--tile-bg)] rounded-lg
          hover:bg-[var(--tile-bg-selected)] transition-colors
        "
      >
        <span className="text-sm">
          {foundWords.length} word{foundWords.length !== 1 ? 's' : ''}
        </span>
        <span className="font-bold">{totalScore} pts</span>
        <span className="text-lg">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="mt-2 max-h-32 overflow-y-auto bg-[var(--tile-bg)] rounded-lg p-2">
          {sortedWords.length === 0 ? (
            <p className="text-center text-gray-500 text-sm py-2">No words found yet</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sortedWords.map((fw) => (
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
      )}
    </div>
  );
}
