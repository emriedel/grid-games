/**
 * Jumble Pool Generation Script
 *
 * Generates a pool of puzzles for the archive system.
 * Each puzzle includes the board and debug info.
 *
 * Usage: npx tsx scripts/generatePool.ts [count]
 *   count: Number of puzzles to generate (default: 365)
 *
 * Output: public/puzzles/pool.json
 */

import * as fs from 'fs';
import * as path from 'path';

const BOARD_SIZE = 5;

// Standard Big Boggle dice (25 dice for 5x5 grid)
const BOGGLE_DICE = [
  'AAAFRS', 'AAEEEE', 'AAFIRS', 'ADENNN', 'AEEEEM',
  'AEEGMU', 'AEGMNN', 'AFIRSY', 'BJKQXZ', 'CCENST',
  'CEIILT', 'CEILPT', 'CEIPST', 'DDHNOT', 'DHHLOR',
  'DHLNOR', 'DHLNOR', 'EIIITT', 'EMOTTT', 'ENSSSU',
  'FIPRSY', 'GORRVW', 'IPRRRY', 'NOOTUW', 'OOOTTU',
];

type Board = string[][];

// Load dictionary for word validation
const DICTIONARY_PATH = path.join(__dirname, '../public/dict/words.txt');
let DICTIONARY: Set<string> | null = null;

function loadDictionary(): Set<string> {
  if (DICTIONARY) return DICTIONARY;

  if (!fs.existsSync(DICTIONARY_PATH)) {
    console.error(`Dictionary not found at ${DICTIONARY_PATH}`);
    console.error('Make sure the dictionary file exists.');
    process.exit(1);
  }

  const content = fs.readFileSync(DICTIONARY_PATH, 'utf-8');
  const words = content
    .split('\n')
    .map(w => w.trim().toUpperCase())
    .filter(w => w.length >= 3);

  DICTIONARY = new Set(words);
  console.log(`Loaded dictionary with ${DICTIONARY.size} words`);
  return DICTIONARY;
}

// Seeded random number generator (Mulberry32)
function createSeededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle with seeded random
function shuffle<T>(array: T[], random: () => number): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Check if a letter is a vowel
function isVowel(letter: string): boolean {
  return 'AEIOU'.includes(letter.charAt(0));
}

// Check if a letter is rare
function isRareLetter(letter: string): boolean {
  return 'QZXJK'.includes(letter.charAt(0));
}

// Get quadrant for a position
function getQuadrant(row: number, col: number): number {
  const isTop = row <= 2;
  const isLeft = col <= 2;
  if (isTop && isLeft) return 0;
  if (isTop && !isLeft) return 1;
  if (!isTop && isLeft) return 2;
  return 3;
}

// Validate that each quadrant has at least one vowel
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

// Validate board meets playability criteria
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

  // At least 4 vowels
  if (vowelPositions.length < 4) return false;

  // Vowels spread across at least 3 different rows
  const vowelRows = new Set(vowelPositions.map(p => p.row));
  if (vowelRows.size < 3) return false;

  // Vowels spread across at least 3 different columns
  const vowelCols = new Set(vowelPositions.map(p => p.col));
  if (vowelCols.size < 3) return false;

  // Max 2 rare letters
  if (rareCount > 2) return false;

  return true;
}

// Generate a board from shuffled dice
function createBoardFromDice(shuffledDice: string[], random: () => number): Board {
  const board: Board = [];
  let diceIndex = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowLetters: string[] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      const die = shuffledDice[diceIndex++];
      const faceIndex = Math.floor(random() * 6);
      let letter = die[faceIndex];

      // Handle 'Q' -> 'Qu' conversion
      if (letter === 'Q') {
        letter = 'QU';
      }

      rowLetters.push(letter);
    }
    board.push(rowLetters);
  }

  return board;
}

// Find all valid words on the board (simplified BFS)
function findAllValidWords(board: Board): Map<string, { path: [number, number][] }> {
  const dictionary = loadDictionary();
  const validWords = new Map<string, { path: [number, number][] }>();

  // Get all adjacent positions
  const getAdjacent = (row: number, col: number): [number, number][] => {
    const adjacent: [number, number][] = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
          adjacent.push([nr, nc]);
        }
      }
    }
    return adjacent;
  };

  // DFS to find words
  const dfs = (
    row: number,
    col: number,
    path: [number, number][],
    word: string,
    visited: Set<string>
  ) => {
    const key = `${row},${col}`;
    if (visited.has(key)) return;

    visited.add(key);
    const letter = board[row][col];
    word += letter;
    path = [...path, [row, col]];

    // Check if this is a valid word
    if (word.length >= 3 && dictionary.has(word) && !validWords.has(word)) {
      validWords.set(word, { path: [...path] });
    }

    // Continue search if word is not too long
    if (word.length < 12) {
      for (const [nr, nc] of getAdjacent(row, col)) {
        dfs(nr, nc, path, word, visited);
      }
    }

    visited.delete(key);
  };

  // Start from each cell
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      dfs(row, col, [], '', new Set());
    }
  }

  return validWords;
}

interface BoardQuality {
  totalWords: number;
  words6Plus: number;
  words7Plus: number;
  wordsByLength: Record<number, number>;
  longestWords: string[];
}

// Evaluate board quality
function evaluateBoardQuality(board: Board): BoardQuality {
  const allWords = findAllValidWords(board);
  const wordsByLength: Record<number, number> = {};
  const longestWords: string[] = [];

  for (const word of allWords.keys()) {
    const length = word.replace('QU', 'Q').length;
    wordsByLength[length] = (wordsByLength[length] || 0) + 1;

    if (length >= 7) {
      longestWords.push(word);
    }
  }

  // Sort longest words by length descending
  longestWords.sort((a, b) => b.length - a.length);

  let words6Plus = 0;
  let words7Plus = 0;
  for (const [len, count] of Object.entries(wordsByLength)) {
    if (parseInt(len) >= 6) words6Plus += count;
    if (parseInt(len) >= 7) words7Plus += count;
  }

  return {
    totalWords: allWords.size,
    words6Plus,
    words7Plus,
    wordsByLength,
    longestWords: longestWords.slice(0, 10), // Top 10 longest
  };
}

interface JumblePoolPuzzle {
  id: string;
  board: Board;
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

function generatePuzzle(seed: number): JumblePoolPuzzle | null {
  const maxAttempts = 100;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const random = createSeededRandom(seed + attempt);
    const shuffledDice = shuffle([...BOGGLE_DICE], random);
    const board = createBoardFromDice(shuffledDice, random);

    // Basic validation
    if (!validateBoard(board)) continue;

    // Quadrant validation
    if (!validateVowelQuadrants(board)) continue;

    // Quality check
    const quality = evaluateBoardQuality(board);
    if (quality.totalWords >= 50 && quality.words6Plus >= 5) {
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

      return {
        id: generatePuzzleId(),
        board,
        debug: {
          totalValidWords: quality.totalWords,
          wordsByLength: quality.wordsByLength,
          longestWords: quality.longestWords,
          rareLetterCount,
          vowelPositions,
        },
      };
    }
  }

  return null;
}

async function main() {
  const count = parseInt(process.argv[2] || '365', 10);
  console.log(`Generating ${count} Jumble puzzles...`);

  // Pre-load dictionary
  loadDictionary();

  const puzzles: JumblePoolPuzzle[] = [];
  const usedIds = new Set<string>();
  let failedAttempts = 0;

  for (let i = 0; i < count; i++) {
    const seed = Date.now() + i * 1000 + Math.floor(Math.random() * 1000);
    const puzzle = generatePuzzle(seed);

    if (puzzle) {
      // Ensure unique IDs
      while (usedIds.has(puzzle.id)) {
        puzzle.id = generatePuzzleId();
      }
      usedIds.add(puzzle.id);
      puzzles.push(puzzle);
    } else {
      failedAttempts++;
      i--; // Retry
      if (failedAttempts > 1000) {
        console.error('Too many failed attempts, stopping.');
        break;
      }
    }

    if ((puzzles.length) % 50 === 0) {
      console.log(`  Generated ${puzzles.length}/${count} puzzles...`);
    }
  }

  const poolFile: PoolFile = {
    generatedAt: new Date().toISOString(),
    puzzles,
  };

  const outputPath = path.join(__dirname, '../public/puzzles/pool.json');
  fs.writeFileSync(outputPath, JSON.stringify(poolFile, null, 2));

  console.log(`\nGenerated ${puzzles.length} puzzles to ${outputPath}`);

  // Print summary stats
  const avgWords = Math.round(puzzles.reduce((sum, p) => sum + p.debug.totalValidWords, 0) / puzzles.length);
  const avgLong = Math.round(puzzles.reduce((sum, p) => sum + p.debug.longestWords.length, 0) / puzzles.length);

  console.log('\nStatistics:');
  console.log(`  Average valid words: ${avgWords}`);
  console.log(`  Average 7+ letter words: ${avgLong}`);
}

main().catch(console.error);
