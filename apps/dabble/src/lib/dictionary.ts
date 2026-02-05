/**
 * Dictionary module for Dabble word validation.
 * Re-exports from the shared @grid-games/dictionary package.
 *
 * The dictionary file (public/dict/words.txt) is loaded client-side.
 * Dabble uses a minimum word length of 2.
 */

export {
  loadDictionary,
  isValidWord,
  isValidPrefix,
  isDictionaryLoaded,
  resetDictionary,
  getTrie as getDictionary,
} from '@grid-games/dictionary';
