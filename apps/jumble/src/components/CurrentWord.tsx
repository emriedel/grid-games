'use client';

import { MIN_WORD_LENGTH } from '@/constants/gameConfig';
import { isValidWord } from '@/lib/dictionary';

interface CurrentWordProps {
  word: string;
  isAlreadyFound: boolean;
}

export default function CurrentWord({ word, isAlreadyFound }: CurrentWordProps) {
  const isValid = word.length >= MIN_WORD_LENGTH && isValidWord(word);
  const isTooShort = word.length > 0 && word.length < MIN_WORD_LENGTH;

  return (
    <div className="flex items-center justify-center h-12">
      <div
        className={`
          text-xl sm:text-2xl font-bold tracking-wider min-w-[120px] text-center
          transition-colors duration-150
          ${word.length === 0 ? 'text-[var(--muted)]' : ''}
          ${isAlreadyFound ? 'text-[var(--warning)]' : ''}
          ${isValid && !isAlreadyFound ? 'text-[var(--success)]' : ''}
          ${isTooShort ? 'text-[var(--muted)]' : ''}
          ${!isValid && !isTooShort && !isAlreadyFound && word.length > 0 ? 'text-[var(--danger)]' : ''}
        `}
      >
        {word || '\u00A0'}
      </div>
    </div>
  );
}
