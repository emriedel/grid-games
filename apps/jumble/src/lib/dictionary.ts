import { MIN_WORD_LENGTH } from '@/constants/gameConfig';

interface TrieNode {
  children: Map<string, TrieNode>;
  isWord: boolean;
}

class Trie {
  private root: TrieNode;

  constructor() {
    this.root = this.createNode();
  }

  private createNode(): TrieNode {
    return {
      children: new Map(),
      isWord: false,
    };
  }

  insert(word: string): void {
    let node = this.root;
    const upperWord = word.toUpperCase();

    for (const char of upperWord) {
      if (!node.children.has(char)) {
        node.children.set(char, this.createNode());
      }
      node = node.children.get(char)!;
    }
    node.isWord = true;
  }

  isWord(word: string): boolean {
    const node = this.traverse(word.toUpperCase());
    return node !== null && node.isWord;
  }

  isPrefix(prefix: string): boolean {
    return this.traverse(prefix.toUpperCase()) !== null;
  }

  private traverse(str: string): TrieNode | null {
    let node = this.root;

    for (const char of str) {
      if (!node.children.has(char)) {
        return null;
      }
      node = node.children.get(char)!;
    }
    return node;
  }
}

let dictionary: Trie | null = null;
let allWords: Set<string> | null = null;

export async function loadDictionary(): Promise<void> {
  if (dictionary) return;

  try {
    const response = await fetch('/dict/words.txt');
    const text = await response.text();
    const words = text.split('\n').map((w) => w.trim().toUpperCase()).filter((w) => w.length >= MIN_WORD_LENGTH);

    dictionary = new Trie();
    allWords = new Set();

    for (const word of words) {
      dictionary.insert(word);
      allWords.add(word);
    }
  } catch (error) {
    console.error('Failed to load dictionary:', error);
    throw error;
  }
}

export function isValidWord(word: string): boolean {
  if (!dictionary) {
    throw new Error('Dictionary not loaded');
  }
  return word.length >= MIN_WORD_LENGTH && dictionary.isWord(word);
}

export function isValidPrefix(prefix: string): boolean {
  if (!dictionary) {
    throw new Error('Dictionary not loaded');
  }
  return dictionary.isPrefix(prefix);
}

export function getAllWords(): Set<string> {
  if (!allWords) {
    throw new Error('Dictionary not loaded');
  }
  return allWords;
}
