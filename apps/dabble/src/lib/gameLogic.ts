import type { GameBoard, Cell, PlacedTile, Word, BonusType } from '@/types';
import { LETTER_POINTS, BONUS_MULTIPLIERS } from '@/constants/gameConfig';
import { isValidWord } from './dictionary';

// Get a cell from the board
function getCell(board: GameBoard, row: number, col: number): Cell | null {
  if (row < 0 || row >= board.size || col < 0 || col >= board.size) {
    return null;
  }
  return board.cells[row][col];
}

// Check if a cell is occupied (has a letter)
function isOccupied(cell: Cell | null): boolean {
  return cell !== null && cell.letter !== null;
}

// Get letter at a position (from board or placed tiles)
function getLetterAt(
  board: GameBoard,
  placedTiles: PlacedTile[],
  row: number,
  col: number
): string | null {
  // Check placed tiles first
  const placed = placedTiles.find((t) => t.row === row && t.col === col);
  if (placed) return placed.letter;

  // Then check board
  const cell = getCell(board, row, col);
  return cell?.letter ?? null;
}

// Check if tiles form a valid line (horizontal or vertical)
function getTilesDirection(
  tiles: PlacedTile[]
): 'horizontal' | 'vertical' | 'single' | 'invalid' {
  if (tiles.length === 0) return 'invalid';
  if (tiles.length === 1) return 'single';

  const rows = new Set(tiles.map((t) => t.row));
  const cols = new Set(tiles.map((t) => t.col));

  if (rows.size === 1) return 'horizontal';
  if (cols.size === 1) return 'vertical';
  return 'invalid';
}

// Check if the placement is contiguous (no gaps)
function isContiguous(
  board: GameBoard,
  placedTiles: PlacedTile[],
  direction: 'horizontal' | 'vertical'
): boolean {
  if (placedTiles.length <= 1) return true;

  const sortedTiles = [...placedTiles].sort((a, b) =>
    direction === 'horizontal' ? a.col - b.col : a.row - b.row
  );

  for (let i = 0; i < sortedTiles.length - 1; i++) {
    const current = sortedTiles[i];
    const next = sortedTiles[i + 1];

    const start = direction === 'horizontal' ? current.col : current.row;
    const end = direction === 'horizontal' ? next.col : next.row;

    // Check for gaps, but they can be filled by existing board letters
    for (let pos = start + 1; pos < end; pos++) {
      const row = direction === 'horizontal' ? current.row : pos;
      const col = direction === 'horizontal' ? pos : current.col;
      const cell = getCell(board, row, col);

      if (!cell?.isPlayable || !cell.letter) {
        return false;
      }
    }
  }

  return true;
}

// Check if placement connects to existing tiles or start square
function isConnected(
  board: GameBoard,
  placedTiles: PlacedTile[],
  isFirstWord: boolean
): boolean {
  if (isFirstWord) {
    // First word must touch the start square
    const centerRow = Math.floor(board.size / 2);
    const centerCol = Math.floor(board.size / 2);

    return placedTiles.some((t) => t.row === centerRow && t.col === centerCol);
  }

  // Subsequent words must connect to existing tiles
  for (const tile of placedTiles) {
    const neighbors = [
      getCell(board, tile.row - 1, tile.col),
      getCell(board, tile.row + 1, tile.col),
      getCell(board, tile.row, tile.col - 1),
      getCell(board, tile.row, tile.col + 1),
    ];

    for (const neighbor of neighbors) {
      if (neighbor?.letter && neighbor.isLocked) {
        return true;
      }
    }
  }

  return false;
}

// Extract a word in a direction from a starting position
function extractWord(
  board: GameBoard,
  placedTiles: PlacedTile[],
  startRow: number,
  startCol: number,
  direction: 'horizontal' | 'vertical'
): { word: string; tiles: { row: number; col: number; letter: string }[]; startRow: number; startCol: number } | null {
  const dr = direction === 'vertical' ? 1 : 0;
  const dc = direction === 'horizontal' ? 1 : 0;

  // Find the start of the word (go backwards)
  let row = startRow;
  let col = startCol;

  while (true) {
    const prevRow = row - dr;
    const prevCol = col - dc;
    const cell = getCell(board, prevRow, prevCol);

    if (!cell?.isPlayable) break;

    const letter = getLetterAt(board, placedTiles, prevRow, prevCol);
    if (!letter) break;

    row = prevRow;
    col = prevCol;
  }

  const wordStart = { row, col };

  // Collect the word (go forwards)
  const tiles: { row: number; col: number; letter: string }[] = [];
  let word = '';

  while (true) {
    const cell = getCell(board, row, col);
    if (!cell?.isPlayable) break;

    const letter = getLetterAt(board, placedTiles, row, col);
    if (!letter) break;

    tiles.push({ row, col, letter });
    word += letter;

    row += dr;
    col += dc;
  }

  if (word.length < 2) return null;

  return {
    word,
    tiles,
    startRow: wordStart.row,
    startCol: wordStart.col,
  };
}

// Find all words formed by a placement
export function findFormedWords(
  board: GameBoard,
  placedTiles: PlacedTile[]
): { word: string; tiles: { row: number; col: number; letter: string }[]; startRow: number; startCol: number; direction: 'horizontal' | 'vertical' }[] {
  const words: { word: string; tiles: { row: number; col: number; letter: string }[]; startRow: number; startCol: number; direction: 'horizontal' | 'vertical' }[] = [];
  const seen = new Set<string>();

  const direction = getTilesDirection(placedTiles);

  if (direction === 'invalid') return [];

  const primaryDirection = direction === 'horizontal' || direction === 'single' ? 'horizontal' : 'vertical';
  const secondaryDirection = primaryDirection === 'horizontal' ? 'vertical' : 'horizontal';

  // Find the main word
  const mainWord = extractWord(
    board,
    placedTiles,
    placedTiles[0].row,
    placedTiles[0].col,
    primaryDirection
  );

  if (mainWord) {
    const key = `${mainWord.startRow},${mainWord.startCol},${primaryDirection}`;
    if (!seen.has(key)) {
      seen.add(key);
      words.push({ ...mainWord, direction: primaryDirection });
    }
  }

  // Find cross words
  for (const tile of placedTiles) {
    const crossWord = extractWord(board, placedTiles, tile.row, tile.col, secondaryDirection);

    if (crossWord) {
      const key = `${crossWord.startRow},${crossWord.startCol},${secondaryDirection}`;
      if (!seen.has(key)) {
        seen.add(key);
        words.push({ ...crossWord, direction: secondaryDirection });
      }
    }
  }

  return words;
}

// Calculate the score for a word
export function calculateWordScore(
  board: GameBoard,
  wordTiles: { row: number; col: number; letter: string }[],
  newTilePositions: Set<string>
): number {
  let wordScore = 0;
  let wordMultiplier = 1;

  for (const tile of wordTiles) {
    const cell = getCell(board, tile.row, tile.col);
    const letterPoints = LETTER_POINTS[tile.letter] || 0;
    const posKey = `${tile.row},${tile.col}`;

    // Bonuses only apply to newly placed tiles
    if (newTilePositions.has(posKey) && cell?.bonus) {
      const bonus = BONUS_MULTIPLIERS[cell.bonus as keyof typeof BONUS_MULTIPLIERS];
      wordScore += letterPoints * bonus.letter;
      wordMultiplier *= bonus.word;
    } else {
      wordScore += letterPoints;
    }
  }

  return wordScore * wordMultiplier;
}

// Validate a placement and return formed words with scores
export interface PlacementResult {
  valid: boolean;
  words: Word[];
  totalScore: number;
  error?: string;
}

export function validatePlacement(
  board: GameBoard,
  placedTiles: PlacedTile[],
  isFirstWord: boolean
): PlacementResult {
  if (placedTiles.length === 0) {
    return { valid: false, words: [], totalScore: 0, error: 'No tiles placed' };
  }

  // Check all tiles are on playable squares
  for (const tile of placedTiles) {
    const cell = getCell(board, tile.row, tile.col);
    if (!cell?.isPlayable) {
      return { valid: false, words: [], totalScore: 0, error: 'Tile placed on invalid square' };
    }
    if (cell.letter) {
      return { valid: false, words: [], totalScore: 0, error: 'Square already occupied' };
    }
  }

  // Check tiles form a line
  const direction = getTilesDirection(placedTiles);
  if (direction === 'invalid') {
    return { valid: false, words: [], totalScore: 0, error: 'Tiles must be in a line' };
  }

  // Check placement is contiguous
  const effectiveDirection = direction === 'single' ? 'horizontal' : direction;
  if (!isContiguous(board, placedTiles, effectiveDirection)) {
    return { valid: false, words: [], totalScore: 0, error: 'Tiles must be contiguous' };
  }

  // Check placement is connected
  if (!isConnected(board, placedTiles, isFirstWord)) {
    return {
      valid: false,
      words: [],
      totalScore: 0,
      error: isFirstWord ? 'First word must cover the center star' : 'Word must connect to existing tiles',
    };
  }

  // Find all formed words
  const formedWords = findFormedWords(board, placedTiles);

  if (formedWords.length === 0) {
    return { valid: false, words: [], totalScore: 0, error: 'No valid words formed' };
  }

  // Validate each word against dictionary
  const newTilePositions = new Set(placedTiles.map((t) => `${t.row},${t.col}`));
  const words: Word[] = [];
  let totalScore = 0;

  for (const formed of formedWords) {
    if (!isValidWord(formed.word)) {
      return { valid: false, words: [], totalScore: 0, error: `"${formed.word}" is not a valid word` };
    }

    const score = calculateWordScore(
      board,
      formed.tiles,
      newTilePositions
    );

    words.push({
      word: formed.word,
      tiles: formed.tiles.map((t) => ({ row: t.row, col: t.col, letter: t.letter })),
      score,
      startRow: formed.startRow,
      startCol: formed.startCol,
      direction: formed.direction,
    });

    totalScore += score;
  }

  return { valid: true, words, totalScore };
}

// Apply a placement to the board (returns new board state)
export function applyPlacement(board: GameBoard, placedTiles: PlacedTile[]): GameBoard {
  const newCells = board.cells.map((row) =>
    row.map((cell) => ({ ...cell }))
  );

  for (const tile of placedTiles) {
    newCells[tile.row][tile.col].letter = tile.letter;
    newCells[tile.row][tile.col].isLocked = true;
  }

  return { ...board, cells: newCells };
}
