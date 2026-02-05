/**
 * Shared dictionary module for word validation across all word games.
 * Uses a Trie for efficient prefix and word lookups.
 *
 * Usage:
 * 1. Call loadDictionary() once at game start
 * 2. Use isValidWord() and isValidPrefix() for validation
 */

import { Trie } from './trie';

// Singleton instances
let dictionary: Trie | null = null;
let allWords: Set<string> | null = null;
let loadPromise: Promise<void> | null = null;
let loadedMinWordLength: number = 2;

export interface LoadDictionaryOptions {
  /**
   * Minimum word length to include in the dictionary.
   * Words shorter than this will be filtered out.
   * Default: 2
   */
  minWordLength?: number;

  /**
   * Base path for fetching the dictionary file.
   * Useful when apps are deployed under a subpath.
   * Default: '' (uses NEXT_PUBLIC_BASE_PATH env var if available)
   */
  basePath?: string;
}

/**
 * Load the dictionary from the word list.
 * This should be called once during game initialization.
 * Subsequent calls will return immediately if already loaded.
 *
 * Note: If you need to reload with different options, call resetDictionary() first.
 */
export async function loadDictionary(options: LoadDictionaryOptions = {}): Promise<void> {
  if (dictionary) return;

  if (loadPromise) {
    await loadPromise;
    return;
  }

  const minWordLength = options.minWordLength ?? 2;
  const basePath = options.basePath ?? (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_BASE_PATH || '' : '');

  loadPromise = (async () => {
    try {
      const response = await fetch(`${basePath}/dict/words.txt`);
      if (!response.ok) {
        throw new Error(`Failed to load dictionary: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      const words = text
        .split('\n')
        .map((w) => w.trim().toUpperCase())
        .filter((w) => w.length >= minWordLength);

      dictionary = new Trie();
      allWords = new Set();

      for (const word of words) {
        dictionary.insert(word);
        allWords.add(word);
      }

      loadedMinWordLength = minWordLength;
      console.log(`Dictionary loaded with ${words.length} words (min length: ${minWordLength})`);
    } catch (error) {
      console.error('Error loading dictionary:', error);
      // Create empty structures so the app doesn't crash
      dictionary = new Trie();
      allWords = new Set();
      throw error;
    }
  })();

  await loadPromise;
}

/**
 * Check if a word is valid (exists in dictionary and meets minimum length).
 * @throws Error if dictionary is not loaded
 */
export function isValidWord(word: string): boolean {
  if (!dictionary) {
    throw new Error('Dictionary not loaded. Call loadDictionary() first.');
  }
  return word.length >= loadedMinWordLength && dictionary.isWord(word);
}

/**
 * Check if a prefix could lead to a valid word.
 * @throws Error if dictionary is not loaded
 */
export function isValidPrefix(prefix: string): boolean {
  if (!dictionary) {
    throw new Error('Dictionary not loaded. Call loadDictionary() first.');
  }
  return dictionary.isPrefix(prefix);
}

/**
 * Get all words in the dictionary as a Set.
 * Useful for games that need to enumerate all possible words.
 * @throws Error if dictionary is not loaded
 */
export function getAllWords(): Set<string> {
  if (!allWords) {
    throw new Error('Dictionary not loaded. Call loadDictionary() first.');
  }
  return allWords;
}

/**
 * Check if the dictionary has been loaded.
 */
export function isDictionaryLoaded(): boolean {
  return dictionary !== null;
}

/**
 * Reset the dictionary state.
 * Call this if you need to reload with different options.
 */
export function resetDictionary(): void {
  dictionary = null;
  allWords = null;
  loadPromise = null;
  loadedMinWordLength = 2;
}

/**
 * Get the Trie instance directly (for advanced use cases or testing).
 */
export function getTrie(): Trie | null {
  return dictionary;
}
