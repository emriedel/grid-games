/**
 * Dabble Heuristic Solver
 *
 * Uses beam search to estimate "good" score ranges for puzzles.
 * This is NOT an optimal solver - it uses heuristics to find realistic
 * scores that good players might achieve.
 *
 * Usage:
 *   npx tsx scripts/solver.ts [date]
 *
 * Examples:
 *   npx tsx scripts/solver.ts                  # Solve today's puzzle
 *   npx tsx scripts/solver.ts 2026-02-01       # Solve specific date
 */

import * as fs from 'fs';
import * as path from 'path';
import seedrandom from 'seedrandom';

// ============ Constants ============

const BOARD_SIZE = 9;
const MAX_TURNS = 4;
const BEAM_WIDTH = 50; // Number of states to keep at each step

const LETTER_POINTS: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8, K: 5, L: 1,
  M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1, U: 1, V: 4, W: 4, X: 8,
  Y: 4, Z: 10,
};

const BONUS_MULTIPLIERS: Record<string, { letter: number; word: number }> = {
  DL: { letter: 2, word: 1 },
  TL: { letter: 3, word: 1 },
  DW: { letter: 1, word: 2 },
  TW: { letter: 1, word: 3 },
  START: { letter: 1, word: 2 },
};

// ============ Types ============

type BonusType = 'DL' | 'TL' | 'DW' | 'TW' | 'START' | null;

interface Cell {
  row: number;
  col: number;
  bonus: BonusType;
  isPlayable: boolean;
  letter: string | null;
  isLocked: boolean;
}

interface GameBoard {
  cells: Cell[][];
  size: number;
}

interface PlacedTile {
  row: number;
  col: number;
  letter: string;
}

interface SolverState {
  board: GameBoard;
  availableLetters: string[];
  score: number;
  turnsUsed: number;
  wordsPlayed: string[];
}

interface Move {
  tiles: PlacedTile[];
  word: string;
  score: number;
  direction: 'horizontal' | 'vertical';
}

// ============ Dictionary ============

let dictionary: Set<string>;
let prefixes: Set<string>;

async function loadDictionary(): Promise<void> {
  const dictPath = path.join(__dirname, '../public/dict/words.txt');
  const content = fs.readFileSync(dictPath, 'utf-8');
  const words = content.split('\n').map(w => w.trim().toUpperCase()).filter(w => w.length >= 2);

  dictionary = new Set(words);
  prefixes = new Set<string>();

  for (const word of words) {
    for (let i = 1; i <= word.length; i++) {
      prefixes.add(word.substring(0, i));
    }
  }

  console.log(`Loaded dictionary with ${dictionary.size} words`);
}

function isValidWord(word: string): boolean {
  return dictionary.has(word.toUpperCase());
}

function isValidPrefix(prefix: string): boolean {
  return prefixes.has(prefix.toUpperCase());
}

// ============ Puzzle Import ============

// Import puzzle generator from main code (simplified)
// We need to generate puzzles the same way the game does

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const LETTER_DISTRIBUTION: Record<string, number> = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1, K: 1, L: 4,
  M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6, U: 4, V: 2, W: 2, X: 1,
  Y: 2, Z: 1,
};
const LETTER_CONSTRAINTS = {
  totalLetters: 14,
  minVowels: 4,
  maxVowels: 6,
  minUniqueLetters: 10,
  maxDuplicatesPerLetter: 2,
};
const DIFFICULT_LETTERS = ['Q', 'X', 'Z', 'J', 'K'];
const DIFFICULT_LETTER_RULES: Record<string, { requires: string[] }> = {
  Q: { requires: ['U'] },
  X: { requires: [] },
  Z: { requires: [] },
  J: { requires: [] },
  K: { requires: [] },
};
const BOARD_CONFIG = {
  minPlayablePercent: 0.65,
  maxPlayablePercent: 0.85,
  bonusCounts: { DL: 4, TL: 4, DW: 3, TW: 2 },
};
const BOARD_SYMMETRY = {
  centerProtectionRadius: 2,
};
const BONUS_PLACEMENT = {
  TW: { edgePreference: 0.8, minDistFromCenter: 3, allowAdjacent: false },
  DW: { edgePreference: 0.5, minDistFromCenter: 2, allowAdjacent: false },
  TL: { edgePreference: 0.6, minDistFromCenter: 2, allowAdjacent: false },
  DL: { edgePreference: 0.5, minDistFromCenter: 1, allowAdjacent: true },
};

// Common word lists for validation
const COMMON_3_LETTER_WORDS = [
  'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'ALL', 'CAN', 'HER', 'WAS',
  'ONE', 'OUT', 'DAY', 'HAD', 'HAS', 'HOW', 'NEW', 'NOW', 'OLD', 'SEE',
  'WAY', 'MAY', 'SAY', 'SHE', 'TWO', 'GET', 'HIM', 'HIS', 'OUR', 'TOO',
  'ANY', 'MAN', 'BIG', 'RUN', 'SET', 'PUT', 'END', 'FAR', 'TOP', 'TEN',
  'ACE', 'ACT', 'ADD', 'AGE', 'AGO', 'AID', 'AIM', 'AIR', 'APE', 'ARC',
  'ARK', 'ARM', 'ART', 'ATE', 'BAD', 'BAG', 'BAN', 'BAR', 'BAT', 'BED',
  'BET', 'BIT', 'BOW', 'BOX', 'BOY', 'BUD', 'BUG', 'BUS', 'BUY', 'CAB',
  'CAP', 'CAR', 'CAT', 'COB', 'COD', 'COG', 'COP', 'COT', 'COW', 'CRY',
];

const COMMON_4_LETTER_WORDS = [
  'ABLE', 'ALSO', 'AREA', 'BACK', 'BALL', 'BANK', 'BASE', 'BEAR', 'BEAT', 'BEEN',
  'BEST', 'BIRD', 'BLUE', 'BOAT', 'BODY', 'BOOK', 'BORN', 'BOTH', 'CALL', 'CAME',
  'CAMP', 'CARD', 'CARE', 'CASE', 'CAST', 'CITY', 'CLUB', 'COLD', 'COME', 'COOL',
  'COST', 'DARK', 'DATA', 'DATE', 'DEAL', 'DEEP', 'DOES', 'DONE', 'DOOR', 'DOWN',
  'DRAW', 'DROP', 'DRUG', 'EACH', 'EAST', 'EASY', 'EDGE', 'ELSE', 'EVEN', 'EVER',
];

const COMMON_LONG_WORDS = [
  'ABOUT', 'AFTER', 'AGAIN', 'ALONG', 'AMONG', 'BEGAN', 'BEING', 'BELOW',
  'BOARD', 'BRAIN', 'BREAD', 'BREAK', 'BRING', 'BROAD', 'BROWN', 'BUILD',
  'CARRY', 'CATCH', 'CAUSE', 'CHAIR', 'CHEAP', 'CHECK', 'CHIEF', 'CHILD',
];

const BOARD_ARCHETYPES = ['diamond', 'corridor', 'scattered', 'open'] as const;
type BoardArchetype = typeof BOARD_ARCHETYPES[number];

// ============ Puzzle Generation (simplified copy) ============

function createRng(dateString: string): () => number {
  return seedrandom(dateString);
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function shuffle<T>(rng: () => number, array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function inBounds(row: number, col: number, size: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

function getNeighbors(row: number, col: number, size: number): [number, number][] {
  const neighbors: [number, number][] = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of directions) {
    const nr = row + dr;
    const nc = col + dc;
    if (inBounds(nr, nc, size)) {
      neighbors.push([nr, nc]);
    }
  }
  return neighbors;
}

function getRotatedPosition(r: number, c: number, size: number): [number, number] {
  return [size - 1 - r, size - 1 - c];
}

function isInFirstHalf(r: number, c: number, size: number): boolean {
  const center = Math.floor(size / 2);
  return r < center || (r === center && c < center);
}

function distFromCenter(r: number, c: number, size: number): number {
  const centerR = Math.floor(size / 2);
  const centerC = Math.floor(size / 2);
  return Math.abs(r - centerR) + Math.abs(c - centerC);
}

function ensureConnectivity(playable: boolean[][], size: number): void {
  const centerR = Math.floor(size / 2);
  const centerC = Math.floor(size / 2);
  const visited: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));
  const queue: [number, number][] = [[centerR, centerC]];
  visited[centerR][centerC] = true;

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    for (const [nr, nc] of getNeighbors(r, c, size)) {
      if (playable[nr][nc] && !visited[nr][nc]) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (playable[r][c] && !visited[r][c]) {
        playable[r][c] = false;
        const [mr, mc] = getRotatedPosition(r, c, size);
        if (mr !== r || mc !== c) {
          playable[mr][mc] = false;
        }
      }
    }
  }
}

// Simplified board generators
function generateDiamondBoard(rng: () => number, size: number): boolean[][] {
  const playable: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(true));
  const center = Math.floor(size / 2);
  const diamondMargin = randInt(rng, 2, 3);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const manhattanDist = Math.abs(r - center) + Math.abs(c - center);
      if (manhattanDist > center + diamondMargin - 1) {
        if (manhattanDist === center + diamondMargin && rng() < 0.5) continue;
        playable[r][c] = false;
      }
    }
  }
  ensureConnectivity(playable, size);
  return playable;
}

function generateCorridorBoard(rng: () => number, size: number): boolean[][] {
  const playable: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(true));
  const protectionRadius = BOARD_SYMMETRY.centerProtectionRadius;
  const center = Math.floor(size / 2);
  const isHorizontal = rng() < 0.5;
  const wallPositions: number[] = [];
  const offset1 = randInt(rng, 1, 2);
  wallPositions.push(center - offset1, center + offset1);

  for (const pos of wallPositions) {
    if (pos < 0 || pos >= size) continue;
    for (let i = 0; i < size; i++) {
      const r = isHorizontal ? pos : i;
      const c = isHorizontal ? i : pos;
      if (distFromCenter(r, c, size) < protectionRadius) continue;
      const edgeDist = Math.min(i, size - 1 - i);
      if (edgeDist < 2) continue;
      if (rng() < 0.3) continue;
      playable[r][c] = false;
      const [mr, mc] = getRotatedPosition(r, c, size);
      if (mr !== r || mc !== c) playable[mr][mc] = false;
    }
  }

  const cornerSize = randInt(rng, 1, 2);
  for (let r = 0; r < cornerSize; r++) {
    for (let c = 0; c < cornerSize - r; c++) {
      playable[r][c] = false;
      playable[r][size - 1 - c] = false;
      playable[size - 1 - r][c] = false;
      playable[size - 1 - r][size - 1 - c] = false;
    }
  }
  ensureConnectivity(playable, size);
  return playable;
}

function generateScatteredBoard(rng: () => number, size: number): boolean[][] {
  const playable: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(true));
  const protectionRadius = BOARD_SYMMETRY.centerProtectionRadius;
  const numPatches = randInt(rng, 4, 7);
  const candidates: [number, number][] = [];

  for (let r = 1; r < size - 1; r++) {
    for (let c = 1; c < size - 1; c++) {
      if (isInFirstHalf(r, c, size) && distFromCenter(r, c, size) >= protectionRadius) {
        candidates.push([r, c]);
      }
    }
  }

  const shuffled = shuffle(rng, candidates);
  let patchesPlaced = 0;

  for (const [r, c] of shuffled) {
    if (patchesPlaced >= numPatches) break;
    if (!playable[r][c]) continue;
    playable[r][c] = false;
    const [mr, mc] = getRotatedPosition(r, c, size);
    if (mr !== r || mc !== c) playable[mr][mc] = false;
    patchesPlaced++;
  }

  const cornerSize = randInt(rng, 0, 1);
  for (let r = 0; r <= cornerSize; r++) {
    for (let c = 0; c <= cornerSize - r; c++) {
      playable[r][c] = false;
      playable[r][size - 1 - c] = false;
      playable[size - 1 - r][c] = false;
      playable[size - 1 - r][size - 1 - c] = false;
    }
  }
  ensureConnectivity(playable, size);
  return playable;
}

function generateOpenBoard(rng: () => number, size: number): boolean[][] {
  const playable: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(true));
  const cornerSize = randInt(rng, 1, 2);
  for (let r = 0; r < cornerSize; r++) {
    for (let c = 0; c < cornerSize - r; c++) {
      playable[r][c] = false;
      playable[r][size - 1 - c] = false;
      playable[size - 1 - r][c] = false;
      playable[size - 1 - r][size - 1 - c] = false;
    }
  }
  ensureConnectivity(playable, size);
  return playable;
}

function generateBoardShape(rng: () => number, size: number): { playable: boolean[][]; archetype: BoardArchetype } {
  const archetypeIndex = Math.floor(rng() * BOARD_ARCHETYPES.length);
  const archetype: BoardArchetype = BOARD_ARCHETYPES[archetypeIndex];
  let playable: boolean[][];
  switch (archetype) {
    case 'diamond': playable = generateDiamondBoard(rng, size); break;
    case 'corridor': playable = generateCorridorBoard(rng, size); break;
    case 'scattered': playable = generateScatteredBoard(rng, size); break;
    case 'open':
    default: playable = generateOpenBoard(rng, size); break;
  }
  return { playable, archetype };
}

function getEdgeDistance(r: number, c: number, size: number): number {
  return Math.min(r, size - 1 - r, c, size - 1 - c);
}

function hasAdjacentBonus(r: number, c: number, bonuses: BonusType[][], size: number): boolean {
  for (const [nr, nc] of getNeighbors(r, c, size)) {
    if (bonuses[nr][nc] !== null) return true;
  }
  return false;
}

function scorePosition(r: number, c: number, size: number, edgePreference: number): number {
  const edgeDist = getEdgeDistance(r, c, size);
  const maxEdgeDist = Math.floor(size / 2);
  const normalizedEdge = 1 - edgeDist / maxEdgeDist;
  return normalizedEdge * edgePreference + (1 - normalizedEdge) * (1 - edgePreference);
}

function placeBonuses(rng: () => number, playable: boolean[][], size: number): BonusType[][] {
  const bonuses: BonusType[][] = Array(size).fill(null).map(() => Array(size).fill(null));
  const centerR = Math.floor(size / 2);
  const centerC = Math.floor(size / 2);
  bonuses[centerR][centerC] = 'START';

  const distFromCenterFn = (r: number, c: number) => Math.abs(r - centerR) + Math.abs(c - centerC);
  const bonusTypes: (keyof typeof BONUS_PLACEMENT)[] = ['TW', 'DW', 'TL', 'DL'];

  for (const bonusType of bonusTypes) {
    const config = BONUS_PLACEMENT[bonusType];
    const count = BOARD_CONFIG.bonusCounts[bonusType];

    for (let i = 0; i < count; i++) {
      const validPositions: [number, number][] = [];
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!playable[r][c]) continue;
          if (r === centerR && c === centerC) continue;
          if (bonuses[r][c] !== null) continue;
          if (distFromCenterFn(r, c) < config.minDistFromCenter) continue;
          if (!config.allowAdjacent && hasAdjacentBonus(r, c, bonuses, size)) continue;
          validPositions.push([r, c]);
        }
      }
      if (validPositions.length === 0) break;

      const shuffledPositions = shuffle(rng, validPositions);
      const scoredPositions = shuffledPositions.map(([r, c]) => ({
        pos: [r, c] as [number, number],
        score: scorePosition(r, c, size, config.edgePreference),
      }));
      scoredPositions.sort((a, b) => b.score - a.score);

      const topN = Math.min(5, scoredPositions.length);
      const weights = scoredPositions.slice(0, topN).map((_, idx) => Math.pow(0.5, idx));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let pick = rng() * totalWeight;
      let selectedIdx = 0;
      for (let j = 0; j < weights.length; j++) {
        pick -= weights[j];
        if (pick <= 0) { selectedIdx = j; break; }
      }

      const [r, c] = scoredPositions[selectedIdx].pos;
      bonuses[r][c] = bonusType;
    }
  }

  return bonuses;
}

function sortLetters(letters: string[]): string[] {
  const vowels = letters.filter(l => VOWELS.includes(l)).sort();
  const consonants = letters.filter(l => !VOWELS.includes(l)).sort();
  return [...vowels, ...consonants];
}

function canFormWord(letters: string[], word: string): boolean {
  const available = [...letters];
  for (const char of word) {
    const idx = available.indexOf(char);
    if (idx === -1) return false;
    available.splice(idx, 1);
  }
  return true;
}

function countFormableWords(letters: string[], wordList: string[]): number {
  return wordList.filter(word => canFormWord(letters, word)).length;
}

function isPlayable(letters: string[]): boolean {
  const threeLetterCount = countFormableWords(letters, COMMON_3_LETTER_WORDS);
  const fourLetterCount = countFormableWords(letters, COMMON_4_LETTER_WORDS);
  return threeLetterCount >= 3 && fourLetterCount >= 2;
}

function canFormAnyLongWord(letters: string[]): boolean {
  return COMMON_LONG_WORDS.some(word => canFormWord(letters, word));
}

function meetsDifficultLetterRules(letters: string[]): boolean {
  const difficultCount = letters.filter(l => DIFFICULT_LETTERS.includes(l)).length;
  if (difficultCount > 1) return false;
  for (const letter of letters) {
    const rules = DIFFICULT_LETTER_RULES[letter];
    if (rules && rules.requires.length > 0) {
      for (const required of rules.requires) {
        if (!letters.includes(required)) return false;
      }
    }
  }
  return true;
}

function meetsConstraints(letters: string[]): boolean {
  const { minVowels, maxVowels, minUniqueLetters, maxDuplicatesPerLetter, totalLetters } = LETTER_CONSTRAINTS;
  if (letters.length !== totalLetters) return false;
  const vowelCount = letters.filter(l => VOWELS.includes(l)).length;
  if (vowelCount < minVowels || vowelCount > maxVowels) return false;
  const uniqueLetters = new Set(letters);
  if (uniqueLetters.size < minUniqueLetters) return false;
  const letterCounts = new Map<string, number>();
  for (const letter of letters) {
    const count = (letterCounts.get(letter) || 0) + 1;
    if (count > maxDuplicatesPerLetter) return false;
    letterCounts.set(letter, count);
  }
  return true;
}

function generateLetters(rng: () => number): string[] {
  const { totalLetters, minVowels, maxVowels, maxDuplicatesPerLetter } = LETTER_CONSTRAINTS;
  const vowelPool: string[] = [];
  const consonantPool: string[] = [];
  for (const [letter, count] of Object.entries(LETTER_DISTRIBUTION)) {
    const pool = VOWELS.includes(letter) ? vowelPool : consonantPool;
    for (let i = 0; i < count; i++) pool.push(letter);
  }

  for (let attempt = 0; attempt < 100; attempt++) {
    const shuffledVowels = shuffle(rng, [...vowelPool]);
    const shuffledConsonants = shuffle(rng, [...consonantPool]);
    const drawn: string[] = [];
    const letterCounts = new Map<string, number>();
    const targetVowels = randInt(rng, minVowels, maxVowels);
    const targetConsonants = totalLetters - targetVowels;

    let vowelIdx = 0;
    while (drawn.filter(l => VOWELS.includes(l)).length < targetVowels && vowelIdx < shuffledVowels.length) {
      const letter = shuffledVowels[vowelIdx++];
      const count = letterCounts.get(letter) || 0;
      if (count < maxDuplicatesPerLetter) {
        drawn.push(letter);
        letterCounts.set(letter, count + 1);
      }
    }

    let consonantIdx = 0;
    while (drawn.filter(l => !VOWELS.includes(l)).length < targetConsonants && consonantIdx < shuffledConsonants.length) {
      const letter = shuffledConsonants[consonantIdx++];
      const count = letterCounts.get(letter) || 0;
      if (count < maxDuplicatesPerLetter) {
        drawn.push(letter);
        letterCounts.set(letter, count + 1);
      }
    }

    if (!meetsConstraints(drawn)) continue;
    if (!meetsDifficultLetterRules(drawn)) continue;
    if (!isPlayable(drawn)) continue;
    if (!canFormAnyLongWord(drawn)) continue;

    return sortLetters(drawn);
  }

  // Fallback
  return ['A', 'E', 'I', 'O', 'U', 'B', 'C', 'D', 'G', 'L', 'N', 'R', 'S', 'T'];
}

function generateBoard(rng: () => number): { board: GameBoard; archetype: BoardArchetype } {
  const { playable, archetype } = generateBoardShape(rng, BOARD_SIZE);
  const bonuses = placeBonuses(rng, playable, BOARD_SIZE);

  const cells: Cell[][] = Array(BOARD_SIZE).fill(null).map((_, row) =>
    Array(BOARD_SIZE).fill(null).map((_, col) => ({
      row,
      col,
      bonus: bonuses[row][col],
      isPlayable: playable[row][col],
      letter: null,
      isLocked: false,
    }))
  );

  return { board: { cells, size: BOARD_SIZE }, archetype };
}

interface DailyPuzzle {
  date: string;
  board: GameBoard;
  letters: string[];
  archetype: BoardArchetype;
}

function generateDailyPuzzle(dateString: string): DailyPuzzle {
  const rng = createRng(dateString);
  const { board, archetype } = generateBoard(rng);
  const letters = generateLetters(rng);
  return { date: dateString, board, letters, archetype };
}

// ============ Solver Logic ============

function getLetterAt(board: GameBoard, placedTiles: PlacedTile[], row: number, col: number): string | null {
  const placed = placedTiles.find(t => t.row === row && t.col === col);
  if (placed) return placed.letter;
  if (row < 0 || row >= board.size || col < 0 || col >= board.size) return null;
  return board.cells[row][col].letter;
}

function extractWord(
  board: GameBoard,
  placedTiles: PlacedTile[],
  startRow: number,
  startCol: number,
  direction: 'horizontal' | 'vertical'
): { word: string; tiles: PlacedTile[] } | null {
  const dr = direction === 'vertical' ? 1 : 0;
  const dc = direction === 'horizontal' ? 1 : 0;

  let row = startRow;
  let col = startCol;

  while (true) {
    const prevRow = row - dr;
    const prevCol = col - dc;
    if (prevRow < 0 || prevCol < 0 || prevRow >= board.size || prevCol >= board.size) break;
    const cell = board.cells[prevRow][prevCol];
    if (!cell.isPlayable) break;
    const letter = getLetterAt(board, placedTiles, prevRow, prevCol);
    if (!letter) break;
    row = prevRow;
    col = prevCol;
  }

  const tiles: PlacedTile[] = [];
  let word = '';

  while (row < board.size && col < board.size) {
    const cell = board.cells[row][col];
    if (!cell.isPlayable) break;
    const letter = getLetterAt(board, placedTiles, row, col);
    if (!letter) break;
    tiles.push({ row, col, letter });
    word += letter;
    row += dr;
    col += dc;
  }

  if (word.length < 2) return null;
  return { word, tiles };
}

function calculateWordScore(board: GameBoard, tiles: PlacedTile[], newPositions: Set<string>): number {
  let wordScore = 0;
  let wordMultiplier = 1;

  for (const tile of tiles) {
    const cell = board.cells[tile.row][tile.col];
    const letterPoints = LETTER_POINTS[tile.letter] || 0;
    const posKey = `${tile.row},${tile.col}`;

    if (newPositions.has(posKey) && cell.bonus) {
      const bonus = BONUS_MULTIPLIERS[cell.bonus];
      if (bonus) {
        wordScore += letterPoints * bonus.letter;
        wordMultiplier *= bonus.word;
      } else {
        wordScore += letterPoints;
      }
    } else {
      wordScore += letterPoints;
    }
  }

  return wordScore * wordMultiplier;
}

function validateMove(board: GameBoard, tiles: PlacedTile[], isFirstWord: boolean): { valid: boolean; score: number; words: string[] } {
  if (tiles.length === 0) return { valid: false, score: 0, words: [] };

  // Check all tiles on playable empty squares
  for (const tile of tiles) {
    const cell = board.cells[tile.row][tile.col];
    if (!cell.isPlayable || cell.letter) {
      return { valid: false, score: 0, words: [] };
    }
  }

  // Check tiles form a line
  const rows = new Set(tiles.map(t => t.row));
  const cols = new Set(tiles.map(t => t.col));
  if (rows.size > 1 && cols.size > 1) {
    return { valid: false, score: 0, words: [] };
  }

  const direction: 'horizontal' | 'vertical' = rows.size === 1 ? 'horizontal' : 'vertical';
  const secondaryDirection = direction === 'horizontal' ? 'vertical' : 'horizontal';

  // Check contiguous
  const sortedTiles = [...tiles].sort((a, b) =>
    direction === 'horizontal' ? a.col - b.col : a.row - b.row
  );
  for (let i = 0; i < sortedTiles.length - 1; i++) {
    const current = sortedTiles[i];
    const next = sortedTiles[i + 1];
    const start = direction === 'horizontal' ? current.col : current.row;
    const end = direction === 'horizontal' ? next.col : next.row;
    for (let pos = start + 1; pos < end; pos++) {
      const r = direction === 'horizontal' ? current.row : pos;
      const c = direction === 'horizontal' ? pos : current.col;
      const cell = board.cells[r][c];
      if (!cell.isPlayable || !cell.letter) {
        return { valid: false, score: 0, words: [] };
      }
    }
  }

  // Check connected
  if (isFirstWord) {
    const center = Math.floor(board.size / 2);
    if (!tiles.some(t => t.row === center && t.col === center)) {
      return { valid: false, score: 0, words: [] };
    }
  } else {
    let connected = false;
    for (const tile of tiles) {
      const neighbors = [
        [tile.row - 1, tile.col],
        [tile.row + 1, tile.col],
        [tile.row, tile.col - 1],
        [tile.row, tile.col + 1],
      ];
      for (const [nr, nc] of neighbors) {
        if (nr >= 0 && nr < board.size && nc >= 0 && nc < board.size) {
          const cell = board.cells[nr][nc];
          if (cell.letter && cell.isLocked) {
            connected = true;
            break;
          }
        }
      }
      if (connected) break;
    }
    if (!connected) return { valid: false, score: 0, words: [] };
  }

  // Find all words
  const newPositions = new Set(tiles.map(t => `${t.row},${t.col}`));
  const words: { word: string; tiles: PlacedTile[] }[] = [];
  const seenWords = new Set<string>();

  // Main word
  const mainWord = extractWord(board, tiles, tiles[0].row, tiles[0].col, direction);
  if (mainWord && !seenWords.has(`${mainWord.tiles[0].row},${mainWord.tiles[0].col},${direction}`)) {
    seenWords.add(`${mainWord.tiles[0].row},${mainWord.tiles[0].col},${direction}`);
    words.push(mainWord);
  }

  // Cross words
  for (const tile of tiles) {
    const crossWord = extractWord(board, tiles, tile.row, tile.col, secondaryDirection);
    if (crossWord && !seenWords.has(`${crossWord.tiles[0].row},${crossWord.tiles[0].col},${secondaryDirection}`)) {
      seenWords.add(`${crossWord.tiles[0].row},${crossWord.tiles[0].col},${secondaryDirection}`);
      words.push(crossWord);
    }
  }

  if (words.length === 0) return { valid: false, score: 0, words: [] };

  // Validate all words
  let totalScore = 0;
  const wordStrings: string[] = [];
  for (const w of words) {
    if (!isValidWord(w.word)) {
      return { valid: false, score: 0, words: [] };
    }
    totalScore += calculateWordScore(board, w.tiles, newPositions);
    wordStrings.push(w.word);
  }

  return { valid: true, score: totalScore, words: wordStrings };
}

function applyMove(board: GameBoard, tiles: PlacedTile[]): GameBoard {
  const newCells = board.cells.map(row => row.map(cell => ({ ...cell })));
  for (const tile of tiles) {
    newCells[tile.row][tile.col].letter = tile.letter;
    newCells[tile.row][tile.col].isLocked = true;
  }
  return { ...board, cells: newCells };
}

// Find all words that can be formed with available letters
function findFormableWords(letters: string[]): string[] {
  const formable: string[] = [];
  dictionary.forEach(word => {
    if (word.length >= 2 && word.length <= letters.length && canFormWord(letters, word)) {
      formable.push(word);
    }
  });
  return formable;
}

// Generate possible moves for first word (must go through center)
function generateFirstWordMoves(board: GameBoard, letters: string[]): Move[] {
  const moves: Move[] = [];
  const center = Math.floor(board.size / 2);
  const formableWords = findFormableWords(letters);

  for (const word of formableWords) {
    // Try placing horizontally through center
    for (let startCol = Math.max(0, center - word.length + 1); startCol <= center && startCol + word.length <= board.size; startCol++) {
      const tiles: PlacedTile[] = [];
      let valid = true;
      let coversCenterCol = false;

      for (let i = 0; i < word.length; i++) {
        const col = startCol + i;
        if (col === center) coversCenterCol = true;
        const cell = board.cells[center][col];
        if (!cell.isPlayable) {
          valid = false;
          break;
        }
        tiles.push({ row: center, col, letter: word[i] });
      }

      if (valid && coversCenterCol) {
        const result = validateMove(board, tiles, true);
        if (result.valid) {
          moves.push({ tiles, word, score: result.score, direction: 'horizontal' });
        }
      }
    }

    // Try placing vertically through center
    for (let startRow = Math.max(0, center - word.length + 1); startRow <= center && startRow + word.length <= board.size; startRow++) {
      const tiles: PlacedTile[] = [];
      let valid = true;
      let coversCenterRow = false;

      for (let i = 0; i < word.length; i++) {
        const row = startRow + i;
        if (row === center) coversCenterRow = true;
        const cell = board.cells[row][center];
        if (!cell.isPlayable) {
          valid = false;
          break;
        }
        tiles.push({ row, col: center, letter: word[i] });
      }

      if (valid && coversCenterRow) {
        const result = validateMove(board, tiles, true);
        if (result.valid) {
          moves.push({ tiles, word, score: result.score, direction: 'vertical' });
        }
      }
    }
  }

  return moves;
}

// Generate possible moves for subsequent words
function generateSubsequentMoves(board: GameBoard, letters: string[]): Move[] {
  const moves: Move[] = [];
  const formableWords = findFormableWords(letters);

  // Find all anchor points (adjacent to existing letters)
  const anchors: { row: number; col: number; direction: 'horizontal' | 'vertical' }[] = [];

  for (let r = 0; r < board.size; r++) {
    for (let c = 0; c < board.size; c++) {
      const cell = board.cells[r][c];
      if (!cell.isPlayable || cell.letter) continue;

      // Check if adjacent to existing letter
      const neighbors = [
        [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]
      ];
      for (const [nr, nc] of neighbors) {
        if (nr >= 0 && nr < board.size && nc >= 0 && nc < board.size) {
          const neighbor = board.cells[nr][nc];
          if (neighbor.letter && neighbor.isLocked) {
            // Determine valid directions based on neighbor position
            if (nr !== r) anchors.push({ row: r, col: c, direction: 'vertical' });
            if (nc !== c) anchors.push({ row: r, col: c, direction: 'horizontal' });
          }
        }
      }
    }
  }

  // For each anchor, try placing words
  for (const anchor of anchors) {
    for (const word of formableWords) {
      // Try different positions of the word relative to the anchor
      for (let i = 0; i < word.length; i++) {
        const tiles: PlacedTile[] = [];
        let valid = true;

        for (let j = 0; j < word.length; j++) {
          let row: number, col: number;
          if (anchor.direction === 'horizontal') {
            row = anchor.row;
            col = anchor.col - i + j;
          } else {
            row = anchor.row - i + j;
            col = anchor.col;
          }

          if (row < 0 || row >= board.size || col < 0 || col >= board.size) {
            valid = false;
            break;
          }

          const cell = board.cells[row][col];
          if (!cell.isPlayable) {
            valid = false;
            break;
          }

          if (cell.letter) {
            // Existing letter must match
            if (cell.letter !== word[j]) {
              valid = false;
              break;
            }
            // Don't add to tiles (already on board)
          } else {
            tiles.push({ row, col, letter: word[j] });
          }
        }

        if (valid && tiles.length > 0) {
          const result = validateMove(board, tiles, false);
          if (result.valid) {
            // Check that we use new letters
            const usedLetters = tiles.map(t => t.letter);
            if (canFormWord(letters, usedLetters.join(''))) {
              moves.push({ tiles, word, score: result.score, direction: anchor.direction });
            }
          }
        }
      }
    }
  }

  // Deduplicate moves by position
  const seen = new Set<string>();
  return moves.filter(move => {
    const key = move.tiles.map(t => `${t.row},${t.col},${t.letter}`).sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function removeLetters(available: string[], used: string[]): string[] {
  const result = [...available];
  for (const letter of used) {
    const idx = result.indexOf(letter);
    if (idx !== -1) result.splice(idx, 1);
  }
  return result;
}

// Beam search solver
function solveWithBeamSearch(puzzle: DailyPuzzle): { bestScore: number; states: SolverState[] } {
  let states: SolverState[] = [{
    board: puzzle.board,
    availableLetters: [...puzzle.letters],
    score: 0,
    turnsUsed: 0,
    wordsPlayed: [],
  }];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const newStates: SolverState[] = [];

    for (const state of states) {
      const isFirstWord = state.turnsUsed === 0;
      const moves = isFirstWord
        ? generateFirstWordMoves(state.board, state.availableLetters)
        : generateSubsequentMoves(state.board, state.availableLetters);

      // Sort moves by score and take top candidates
      moves.sort((a, b) => b.score - a.score);
      const topMoves = moves.slice(0, 20);

      for (const move of topMoves) {
        const usedLetters = move.tiles.map(t => t.letter);
        const newLetters = removeLetters(state.availableLetters, usedLetters);
        const newBoard = applyMove(state.board, move.tiles);

        newStates.push({
          board: newBoard,
          availableLetters: newLetters,
          score: state.score + move.score,
          turnsUsed: state.turnsUsed + 1,
          wordsPlayed: [...state.wordsPlayed, move.word],
        });
      }
    }

    // Also keep states that didn't make a move (in case no valid moves)
    for (const state of states) {
      newStates.push({
        ...state,
        turnsUsed: state.turnsUsed + 1,
      });
    }

    // Beam selection: keep top N states by score
    newStates.sort((a, b) => b.score - a.score);
    states = newStates.slice(0, BEAM_WIDTH);

    if (states.length === 0) break;
  }

  const bestScore = states.length > 0 ? states[0].score : 0;
  return { bestScore, states };
}

// ============ Main ============

interface StarThresholds {
  heuristicMax: number;
  star1: number;
  star2: number;
  star3: number;
}

function calculateStarThresholds(heuristicMax: number): StarThresholds {
  // Star thresholds as percentages of heuristic max
  // 1★: ~25-30% of heuristic max
  // 2★: ~50-55% of heuristic max
  // 3★: ~75-80% of heuristic max
  return {
    heuristicMax,
    star1: Math.round(heuristicMax * 0.28),
    star2: Math.round(heuristicMax * 0.52),
    star3: Math.round(heuristicMax * 0.78),
  };
}

async function main() {
  const dateArg = process.argv[2];
  const dateString = dateArg || new Date().toISOString().split('T')[0];

  console.log(`\nDabble Heuristic Solver`);
  console.log(`======================\n`);

  await loadDictionary();

  console.log(`Generating puzzle for ${dateString}...`);
  const puzzle = generateDailyPuzzle(dateString);
  console.log(`Board archetype: ${puzzle.archetype}`);
  console.log(`Letters: ${puzzle.letters.join(' ')}\n`);

  console.log(`Running beam search (width=${BEAM_WIDTH})...`);
  const startTime = Date.now();
  const { bestScore, states } = solveWithBeamSearch(puzzle);
  const elapsed = Date.now() - startTime;

  console.log(`\nCompleted in ${elapsed}ms`);
  console.log(`Heuristic best score: ${bestScore}`);

  if (states.length > 0 && states[0].wordsPlayed.length > 0) {
    console.log(`\nBest solution found:`);
    console.log(`  Words: ${states[0].wordsPlayed.join(', ')}`);
    console.log(`  Letters used: ${puzzle.letters.length - states[0].availableLetters.length}/${puzzle.letters.length}`);
  }

  const thresholds = calculateStarThresholds(bestScore);
  console.log(`\nStar Thresholds:`);
  console.log(`  ★      (Good): ${thresholds.star1}+`);
  console.log(`  ★★     (Great): ${thresholds.star2}+`);
  console.log(`  ★★★    (Excellent): ${thresholds.star3}+`);
  console.log(`  Heuristic max: ${thresholds.heuristicMax}`);

  // Output JSON for use by generatePuzzles.ts
  const output = {
    date: dateString,
    archetype: puzzle.archetype,
    letters: puzzle.letters,
    thresholds,
  };

  console.log(`\nJSON output:`);
  console.log(JSON.stringify(output, null, 2));
}

// Only run main if this is the entry point
if (require.main === module) {
  main().catch(console.error);
}

// Export for use by generatePuzzles.ts
export { generateDailyPuzzle, solveWithBeamSearch, calculateStarThresholds, loadDictionary };
export type { DailyPuzzle, StarThresholds };
