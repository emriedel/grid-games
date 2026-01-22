// Dictionary module for word validation
// Uses a Trie for efficient prefix/word lookup

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isWord: boolean = false;
}

class Trie {
  root: TrieNode = new TrieNode();

  insert(word: string): void {
    let node = this.root;
    for (const char of word.toUpperCase()) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode());
      }
      node = node.children.get(char)!;
    }
    node.isWord = true;
  }

  isValidWord(word: string): boolean {
    let node = this.root;
    for (const char of word.toUpperCase()) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char)!;
    }
    return node.isWord;
  }

  isValidPrefix(prefix: string): boolean {
    let node = this.root;
    for (const char of prefix.toUpperCase()) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char)!;
    }
    return true;
  }
}

// Singleton dictionary instance
let dictionary: Trie | null = null;
let loadPromise: Promise<void> | null = null;

// Load dictionary from word list
export async function loadDictionary(): Promise<void> {
  if (dictionary) return;

  if (loadPromise) {
    await loadPromise;
    return;
  }

  loadPromise = (async () => {
    try {
      const response = await fetch('/dict/words.txt');
      if (!response.ok) {
        throw new Error('Failed to load dictionary');
      }

      const text = await response.text();
      const words = text.split('\n').map((w) => w.trim().toUpperCase()).filter((w) => w.length >= 2);

      dictionary = new Trie();
      for (const word of words) {
        dictionary.insert(word);
      }

      console.log(`Dictionary loaded with ${words.length} words`);
    } catch (error) {
      console.error('Error loading dictionary:', error);
      // Fallback: create empty dictionary (will need to use API validation)
      dictionary = new Trie();
    }
  })();

  await loadPromise;
}

// Check if a word is valid
export function isValidWord(word: string): boolean {
  if (!dictionary) {
    console.warn('Dictionary not loaded yet');
    return false;
  }
  return dictionary.isValidWord(word.toUpperCase());
}

// Check if a prefix could lead to a valid word
export function isValidPrefix(prefix: string): boolean {
  if (!dictionary) {
    return true; // Be permissive if dictionary not loaded
  }
  return dictionary.isValidPrefix(prefix.toUpperCase());
}

// Get the dictionary instance (for testing)
export function getDictionary(): Trie | null {
  return dictionary;
}

// Reset dictionary (for testing)
export function resetDictionary(): void {
  dictionary = null;
  loadPromise = null;
}
