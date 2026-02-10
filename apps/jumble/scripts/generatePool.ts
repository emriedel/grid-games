/**
 * Jumble Pool Generation Script
 *
 * Generates a pool of puzzles for the archive system.
 * Uses a Trie-based word finder for fast prefix pruning.
 *
 * Usage: npx tsx scripts/generatePool.ts [count]
 *   count: Number of puzzles to generate (default: 200)
 *
 * Output: public/puzzles/pool.json
 */

import * as fs from 'fs';
import * as path from 'path';

const BOARD_SIZE = 5;
const MIN_WORD_LENGTH = 3;
const MAX_WORD_LENGTH = 10; // Cap for performance

// Standard Big Boggle dice (25 dice for 5x5 grid)
const BOGGLE_DICE = [
  'AAAFRS', 'AAEEEE', 'AAFIRS', 'ADENNN', 'AEEEEM',
  'AEEGMU', 'AEGMNN', 'AFIRSY', 'BJKQXZ', 'CCENST',
  'CEIILT', 'CEILPT', 'CEIPST', 'DDHNOT', 'DHHLOR',
  'DHLNOR', 'DHLNOR', 'EIIITT', 'EMOTTT', 'ENSSSU',
  'FIPRSY', 'GORRVW', 'IPRRRY', 'NOOTUW', 'OOOTTU',
];

type Board = string[][];

// ============ TRIE IMPLEMENTATION ============

interface TrieNode {
  children: Map<string, TrieNode>;
  isWord: boolean;
}

function createTrieNode(): TrieNode {
  return { children: new Map(), isWord: false };
}

class Trie {
  root: TrieNode;

  constructor() {
    this.root = createTrieNode();
  }

  insert(word: string): void {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        node.children.set(char, createTrieNode());
      }
      node = node.children.get(char)!;
    }
    node.isWord = true;
  }

  // Check if prefix exists in trie
  hasPrefix(prefix: string): boolean {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char)!;
    }
    return true;
  }

  // Check if exact word exists
  isWord(word: string): boolean {
    let node = this.root;
    for (const char of word) {
      if (!node.children.has(char)) {
        return false;
      }
      node = node.children.get(char)!;
    }
    return node.isWord;
  }

  // Get node for a prefix (for incremental checking)
  getNode(prefix: string): TrieNode | null {
    let node = this.root;
    for (const char of prefix) {
      if (!node.children.has(char)) {
        return null;
      }
      node = node.children.get(char)!;
    }
    return node;
  }
}

// ============ DICTIONARY ============

const DICTIONARY_PATH = path.join(__dirname, '../public/dict/words.txt');
let trie: Trie | null = null;

function loadDictionary(): Trie {
  if (trie) return trie;

  if (!fs.existsSync(DICTIONARY_PATH)) {
    console.error(`Dictionary not found at ${DICTIONARY_PATH}`);
    process.exit(1);
  }

  const content = fs.readFileSync(DICTIONARY_PATH, 'utf-8');
  const words = content
    .split('\n')
    .map(w => w.trim().toUpperCase())
    .filter(w => w.length >= MIN_WORD_LENGTH && w.length <= MAX_WORD_LENGTH);

  trie = new Trie();
  for (const word of words) {
    trie.insert(word);
  }

  console.log(`Loaded dictionary with ${words.length} words into Trie`);
  return trie;
}

// ============ RANDOM UTILITIES ============

function createSeededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============ BOARD VALIDATION ============

function isVowel(letter: string): boolean {
  return 'AEIOU'.includes(letter.charAt(0));
}

function isRareLetter(letter: string): boolean {
  return 'QZXJK'.includes(letter.charAt(0));
}

function getQuadrant(row: number, col: number): number {
  const isTop = row <= 2;
  const isLeft = col <= 2;
  if (isTop && isLeft) return 0;
  if (isTop && !isLeft) return 1;
  if (!isTop && isLeft) return 2;
  return 3;
}

function validateVowelQuadrants(board: Board): boolean {
  const quadrantsWithVowels = new Set<number>();
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (isVowel(board[row][col])) {
        quadrantsWithVowels.add(getQuadrant(row, col));
      }
    }
  }
  return quadrantsWithVowels.size === 4;
}

function validateBoard(board: Board): boolean {
  const vowelPositions: { row: number; col: number }[] = [];
  let rareCount = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const letter = board[row][col];
      if (isVowel(letter)) {
        vowelPositions.push({ row, col });
      }
      if (isRareLetter(letter)) {
        rareCount++;
      }
    }
  }

  if (vowelPositions.length < 4) return false;
  const vowelRows = new Set(vowelPositions.map(p => p.row));
  if (vowelRows.size < 3) return false;
  const vowelCols = new Set(vowelPositions.map(p => p.col));
  if (vowelCols.size < 3) return false;
  if (rareCount > 2) return false;

  return true;
}

// ============ BOARD GENERATION ============

function createBoardFromDice(shuffledDice: string[], random: () => number): Board {
  const board: Board = [];
  let diceIndex = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowLetters: string[] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      const die = shuffledDice[diceIndex++];
      const faceIndex = Math.floor(random() * 6);
      let letter = die[faceIndex];
      if (letter === 'Q') {
        letter = 'QU';
      }
      rowLetters.push(letter);
    }
    board.push(rowLetters);
  }

  return board;
}

// ============ FAST WORD FINDING WITH TRIE ============

// Pre-compute adjacency list for the board
function buildAdjacencyList(): number[][][] {
  const adj: number[][][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    adj[r] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      adj[r][c] = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
            adj[r][c].push(nr * BOARD_SIZE + nc);
          }
        }
      }
    }
  }
  return adj;
}

const ADJACENCY = buildAdjacencyList();

function findAllValidWordsFast(board: Board, dictionary: Trie): Set<string> {
  const validWords = new Set<string>();
  const visited = new Array(BOARD_SIZE * BOARD_SIZE).fill(false);

  function dfs(row: number, col: number, node: TrieNode, word: string): void {
    const idx = row * BOARD_SIZE + col;
    if (visited[idx]) return;

    const letter = board[row][col];

    // Check if this letter continues a valid prefix
    const nextNode = node.children.get(letter);
    if (!nextNode) return; // Prune: no words start with this prefix

    visited[idx] = true;
    const newWord = word + letter;

    // Check if we found a valid word
    if (newWord.length >= MIN_WORD_LENGTH && nextNode.isWord) {
      validWords.add(newWord);
    }

    // Continue searching if word isn't too long
    if (newWord.length < MAX_WORD_LENGTH) {
      for (const neighborIdx of ADJACENCY[row][col]) {
        const nr = Math.floor(neighborIdx / BOARD_SIZE);
        const nc = neighborIdx % BOARD_SIZE;
        dfs(nr, nc, nextNode, newWord);
      }
    }

    visited[idx] = false;
  }

  // Start DFS from each cell
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      dfs(row, col, dictionary.root, '');
    }
  }

  return validWords;
}

// ============ SCORING ============

const SCORING_TABLE: Record<number, number> = {
  3: 1,
  4: 1,
  5: 2,
  6: 3,
  7: 5,
  8: 11,
};

function calculateWordScore(word: string): number {
  // Get effective length (QU counts as 2 letters)
  let length = 0;
  for (let i = 0; i < word.length; i++) {
    if (word[i] === 'Q' && i + 1 < word.length && word[i + 1] === 'U') {
      length += 2;
      i++;
    } else {
      length += 1;
    }
  }

  const scoringLengths = Object.keys(SCORING_TABLE)
    .map(Number)
    .sort((a, b) => b - a);

  for (const bracketLength of scoringLengths) {
    if (length >= bracketLength) {
      return SCORING_TABLE[bracketLength];
    }
  }

  return 0;
}

function calculateMaxPossibleScore(words: Set<string>): number {
  let total = 0;
  for (const word of words) {
    total += calculateWordScore(word);
  }
  return total;
}

// ============ PUZZLE GENERATION ============

export interface JumblePoolPuzzle {
  id: string;
  board: Board;
  maxPossibleScore: number;
  debug: {
    totalValidWords: number;
    wordsByLength: Record<number, number>;
    longestWords: string[];
    rareLetterCount: number;
    vowelPositions: [number, number][];
  };
}

interface PoolFile {
  generatedAt: string;
  puzzles: JumblePoolPuzzle[];
}

function generatePuzzleId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function generatePuzzle(seed: number, dictionary: Trie): JumblePoolPuzzle | null {
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const random = createSeededRandom(seed + attempt);
    const shuffledDice = shuffle([...BOGGLE_DICE], random);
    const board = createBoardFromDice(shuffledDice, random);

    // Basic validation
    if (!validateBoard(board)) continue;
    if (!validateVowelQuadrants(board)) continue;

    // Find all words using fast Trie-based search
    const allWords = findAllValidWordsFast(board, dictionary);

    // Quality check
    const wordsByLength: Record<number, number> = {};
    const longestWords: string[] = [];

    for (const word of allWords) {
      const length = word.replace('QU', 'Q').length;
      wordsByLength[length] = (wordsByLength[length] || 0) + 1;
      if (length >= 7) {
        longestWords.push(word);
      }
    }

    let words6Plus = 0;
    for (const [len, count] of Object.entries(wordsByLength)) {
      if (parseInt(len) >= 6) words6Plus += count;
    }

    // Require at least 50 words and 5 words of 6+ letters
    if (allWords.size >= 50 && words6Plus >= 5) {
      // Collect debug info
      const vowelPositions: [number, number][] = [];
      let rareLetterCount = 0;

      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          const letter = board[row][col];
          if (isVowel(letter)) {
            vowelPositions.push([row, col]);
          }
          if (isRareLetter(letter)) {
            rareLetterCount++;
          }
        }
      }

      longestWords.sort((a, b) => b.length - a.length);

      return {
        id: generatePuzzleId(),
        board,
        maxPossibleScore: calculateMaxPossibleScore(allWords),
        debug: {
          totalValidWords: allWords.size,
          wordsByLength,
          longestWords: longestWords.slice(0, 10),
          rareLetterCount,
          vowelPositions,
        },
      };
    }
  }

  return null;
}

// ============ MAIN ============

async function main() {
  const count = parseInt(process.argv[2] || '200', 10);
  console.log(`Generating ${count} Jumble puzzles...`);

  const startTime = Date.now();
  const dictionary = loadDictionary();

  const puzzles: JumblePoolPuzzle[] = [];
  const usedIds = new Set<string>();
  let failedAttempts = 0;

  for (let i = 0; i < count; i++) {
    const seed = Date.now() + i * 1000 + Math.floor(Math.random() * 1000);
    const puzzle = generatePuzzle(seed, dictionary);

    if (puzzle) {
      while (usedIds.has(puzzle.id)) {
        puzzle.id = generatePuzzleId();
      }
      usedIds.add(puzzle.id);
      puzzles.push(puzzle);
    } else {
      failedAttempts++;
      i--;
      if (failedAttempts > 1000) {
        console.error('Too many failed attempts, stopping.');
        break;
      }
    }

    if ((puzzles.length) % 25 === 0 && puzzles.length > 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  Generated ${puzzles.length}/${count} puzzles... (${elapsed}s)`);
    }
  }

  const poolFile: PoolFile = {
    generatedAt: new Date().toISOString(),
    puzzles,
  };

  const outputPath = path.join(__dirname, '../public/puzzles/pool.json');
  fs.writeFileSync(outputPath, JSON.stringify(poolFile, null, 2));

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nGenerated ${puzzles.length} puzzles to ${outputPath}`);
  console.log(`Total time: ${totalTime}s`);

  // Print summary stats
  if (puzzles.length > 0) {
    const avgWords = Math.round(puzzles.reduce((sum, p) => sum + p.debug.totalValidWords, 0) / puzzles.length);
    const avgScore = Math.round(puzzles.reduce((sum, p) => sum + p.maxPossibleScore, 0) / puzzles.length);

    console.log('\nStatistics:');
    console.log(`  Average valid words: ${avgWords}`);
    console.log(`  Average max score: ${avgScore}`);
  }
}

main().catch(console.error);
