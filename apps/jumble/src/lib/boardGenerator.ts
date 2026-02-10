import { BOARD_SIZE, BOGGLE_DICE } from '@/constants/gameConfig';
import { Board } from '@/types';
import { findAllValidWords } from './wordValidator';

// Seeded random number generator (Mulberry32)
function createSeededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convert date to seed number (YYYYMMDD format)
function dateToSeed(date: Date): number {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return year * 10000 + month * 100 + day;
}

// Get puzzle number (days since epoch date)
export function getPuzzleNumber(date: Date = new Date()): number {
  // IMPORTANT: Use 'T00:00:00' to force local timezone interpretation
  const epoch = new Date('2024-01-01T00:00:00');
  const diffTime = date.getTime() - epoch.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
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

// Check if a letter is rare (Q, Z, X, J, K)
function isRareLetter(letter: string): boolean {
  return 'QZXJK'.includes(letter.charAt(0));
}

// Get quadrant for a position (TL=0, TR=1, BL=2, BR=3)
// For 5x5: rows 0-2 = top, 2-4 = bottom; cols 0-2 = left, 2-4 = right (center shared)
function getQuadrant(row: number, col: number): number {
  const isTop = row <= 2;
  const isLeft = col <= 2;
  if (isTop && isLeft) return 0; // TL
  if (isTop && !isLeft) return 1; // TR
  if (!isTop && isLeft) return 2; // BL
  return 3; // BR
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

interface BoardQuality {
  totalWords: number;
  words6Plus: number;
  words7Plus: number;
}

// Evaluate board quality by finding all valid words
function evaluateBoardQuality(board: Board): BoardQuality {
  const allWords = findAllValidWords(board);
  let words6Plus = 0;
  let words7Plus = 0;

  for (const word of allWords.keys()) {
    const length = word.replace('QU', 'Q').length; // QU counts as 2 for scoring but 1 tile
    if (length >= 6) words6Plus++;
    if (length >= 7) words7Plus++;
  }

  return {
    totalWords: allWords.size,
    words6Plus,
    words7Plus,
  };
}

// Validate board meets playability criteria
function validateBoard(board: Board): boolean {
  // Flatten board to get all letters
  const letters: string[] = [];
  const vowelPositions: { row: number; col: number }[] = [];
  let rareCount = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const letter = board[row][col];
      letters.push(letter);

      if (isVowel(letter)) {
        vowelPositions.push({ row, col });
      }
      if (isRareLetter(letter)) {
        rareCount++;
      }
    }
  }

  // Check 1: At least 4 vowels
  if (vowelPositions.length < 4) {
    return false;
  }

  // Check 2: Vowels spread across at least 3 different rows
  const vowelRows = new Set(vowelPositions.map((p) => p.row));
  if (vowelRows.size < 3) {
    return false;
  }

  // Check 3: Vowels spread across at least 3 different columns
  const vowelCols = new Set(vowelPositions.map((p) => p.col));
  if (vowelCols.size < 3) {
    return false;
  }

  // Check 4: Max 2 rare letters
  if (rareCount > 2) {
    return false;
  }

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
      // Pick a random face of the die
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

// Generate board for a specific date with validation
// Uses enhanced validation: basic checks + quadrant vowels + word quality
export function generateBoard(date: Date = new Date()): Board {
  const baseSeed = dateToSeed(date);
  const maxAttempts = 100;

  // First pass: try to find a board with enhanced validation
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Use seed + attempt for deterministic retries
    const seed = baseSeed + attempt;
    const random = createSeededRandom(seed);

    // Shuffle the dice
    const shuffledDice = shuffle([...BOGGLE_DICE], random);

    // Create the board
    const board = createBoardFromDice(shuffledDice, random);

    // Basic validation first (fast)
    if (!validateBoard(board)) {
      continue;
    }

    // Check quadrant vowel distribution
    if (!validateVowelQuadrants(board)) {
      continue;
    }

    // Evaluate word quality (slower, so do last)
    const quality = evaluateBoardQuality(board);

    // Require at least 50 total words and 5 words of 6+ letters
    if (quality.totalWords >= 50 && quality.words6Plus >= 5) {
      return board;
    }
  }

  // Fallback: find best board that passes basic validation
  let bestBoard: Board | null = null;
  let bestQuality: BoardQuality = { totalWords: 0, words6Plus: 0, words7Plus: 0 };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = baseSeed + attempt;
    const random = createSeededRandom(seed);
    const shuffledDice = shuffle([...BOGGLE_DICE], random);
    const board = createBoardFromDice(shuffledDice, random);

    if (validateBoard(board)) {
      const quality = evaluateBoardQuality(board);
      if (quality.totalWords > bestQuality.totalWords) {
        bestBoard = board;
        bestQuality = quality;
      }
    }
  }

  // Return best board found, or generate one as last resort
  if (bestBoard) {
    return bestBoard;
  }

  const random = createSeededRandom(baseSeed);
  const shuffledDice = shuffle([...BOGGLE_DICE], random);
  return createBoardFromDice(shuffledDice, random);
}

// Get today's date string for storage keys
export function getTodayDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}
