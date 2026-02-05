/**
 * Trie data structure for efficient word and prefix lookups.
 * All words are stored in uppercase internally.
 */

interface TrieNode {
  children: Map<string, TrieNode>;
  isWord: boolean;
}

export class Trie {
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

  /**
   * Insert a word into the trie.
   * Words are normalized to uppercase.
   */
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

  /**
   * Check if a word exists in the trie.
   */
  isWord(word: string): boolean {
    const node = this.traverse(word.toUpperCase());
    return node !== null && node.isWord;
  }

  /**
   * Check if a prefix exists in the trie.
   * Returns true if any word starts with this prefix.
   */
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
