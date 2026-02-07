'use client';

import type { Word } from '@/types';

interface WordListProps {
  words: Word[];
  letterBonus?: number;
  lettersUsed?: number;
  totalLetters?: number;
}

export function WordList({ words, letterBonus, lettersUsed, totalLetters = 14 }: WordListProps) {
  if (words.length === 0 && !letterBonus) {
    return null;
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
      {letterBonus !== undefined && letterBonus > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-neutral-800 rounded text-sm">
          <span className="font-medium text-emerald-400">{lettersUsed}/{totalLetters} letters</span>
          <span className="text-emerald-400 font-bold">+{letterBonus}</span>
        </div>
      )}
    </div>
  );
}
