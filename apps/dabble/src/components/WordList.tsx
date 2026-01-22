'use client';

import type { Word } from '@/types';

interface WordListProps {
  words: Word[];
}

export function WordList({ words }: WordListProps) {
  if (words.length === 0) {
    return (
      <div className="text-center text-neutral-500 text-sm py-2">
        No words submitted yet
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {words.map((word, index) => (
        <div
          key={index}
          className="flex items-center gap-1.5 px-2 py-1 bg-neutral-800 rounded text-sm"
        >
          <span className="font-medium">{word.word}</span>
          <span className="text-amber-400 font-bold">{word.score}</span>
        </div>
      ))}
    </div>
  );
}
