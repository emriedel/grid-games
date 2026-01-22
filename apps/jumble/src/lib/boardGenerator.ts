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

// Generate board for a specific date
export function generateBoard(date: Date = new Date()): Board {
  const seed = dateToSeed(date);
  const random = createSeededRandom(seed);

  // Shuffle the dice
  const shuffledDice = shuffle([...BOGGLE_DICE], random);

  // Create the board
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

// Get today's date string for storage keys
export function getTodayDateString(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}
