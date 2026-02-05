/**
 * Dictionary module for Jumble word validation.
 * Re-exports from the shared @grid-games/dictionary package.
 *
 * The dictionary file (public/dict/words.txt) is loaded client-side.
 * Jumble uses MIN_WORD_LENGTH from gameConfig (default: 3).
 */

import { MIN_WORD_LENGTH } from '@/constants/gameConfig';
import {
  loadDictionary as loadDictionaryBase,
  isValidWord as isValidWordBase,
  isValidPrefix,
  getAllWords,
  isDictionaryLoaded,
  resetDictionary,
} from '@grid-games/dictionary';

/**
 * Load the dictionary with Jumble's minimum word length.
 */
export async function loadDictionary(): Promise<void> {
  return loadDictionaryBase({ minWordLength: MIN_WORD_LENGTH });
}

/**
 * Check if a word is valid for Jumble (meets minimum length and exists in dictionary).
 */
export function isValidWord(word: string): boolean {
  return word.length >= MIN_WORD_LENGTH && isValidWordBase(word);
}

export { isValidPrefix, getAllWords, isDictionaryLoaded, resetDictionary };
