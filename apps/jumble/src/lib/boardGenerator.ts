import { BOARD_SIZE, BOGGLE_DICE } from '@/constants/gameConfig';
import { Board } from '@/types';

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
  const epoch = new Date('2024-01-01');
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
export function generateBoard(date: Date = new Date()): Board {
  const baseSeed = dateToSeed(date);
  const maxAttempts = 50;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Use seed + attempt for deterministic retries
    const seed = baseSeed + attempt;
    const random = createSeededRandom(seed);

    // Shuffle the dice
    const shuffledDice = shuffle([...BOGGLE_DICE], random);

    // Create the board
    const board = createBoardFromDice(shuffledDice, random);

    // Validate board
    if (validateBoard(board)) {
      return board;
    }
  }

  // If all attempts fail, use the last attempt's board anyway
  // This shouldn't happen with properly designed dice
  const random = createSeededRandom(baseSeed + maxAttempts - 1);
  const shuffledDice = shuffle([...BOGGLE_DICE], random);
  return createBoardFromDice(shuffledDice, random);
}

// Get today's date string for storage keys
export function getTodayDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}
