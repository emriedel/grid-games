import { Board, Position } from '@/types';
import { BOARD_SIZE } from '@/constants/gameConfig';
import { isValidWord, isValidPrefix } from './dictionary';

// Check if two positions are adjacent (including diagonals)
export function areAdjacent(pos1: Position, pos2: Position): boolean {
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  return rowDiff <= 1 && colDiff <= 1 && (rowDiff !== 0 || colDiff !== 0);
}

// Check if a position is already in the path
export function isInPath(path: Position[], pos: Position): boolean {
  return path.some((p) => p.row === pos.row && p.col === pos.col);
}

// Get the word formed by a path on the board
export function getWordFromPath(board: Board, path: Position[]): string {
  return path.map((pos) => board[pos.row][pos.col]).join('');
}

// Validate that a path forms a valid word
export function validatePath(board: Board, path: Position[]): boolean {
  if (path.length === 0) return false;

  // Check that all positions are adjacent
  for (let i = 1; i < path.length; i++) {
    if (!areAdjacent(path[i - 1], path[i])) {
      return false;
    }
  }

  // Check that no position is repeated
  const seen = new Set<string>();
  for (const pos of path) {
    const key = `${pos.row},${pos.col}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
  }

  // Check that the word is valid
  const word = getWordFromPath(board, path);
  return isValidWord(word);
}

// Get all adjacent positions that aren't in the current path
export function getValidNextPositions(path: Position[]): Position[] {
  if (path.length === 0) {
    // All positions are valid starting points
    const positions: Position[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        positions.push({ row, col });
      }
    }
    return positions;
  }

  const lastPos = path[path.length - 1];
  const validPositions: Position[] = [];

  for (let row = Math.max(0, lastPos.row - 1); row <= Math.min(BOARD_SIZE - 1, lastPos.row + 1); row++) {
    for (let col = Math.max(0, lastPos.col - 1); col <= Math.min(BOARD_SIZE - 1, lastPos.col + 1); col++) {
      const pos = { row, col };
      if (!isInPath(path, pos) && (row !== lastPos.row || col !== lastPos.col)) {
        validPositions.push(pos);
      }
    }
  }

  return validPositions;
}

// Find all valid words on a board using DFS
export function findAllValidWords(board: Board): Map<string, Position[]> {
  const validWords = new Map<string, Position[]>();

  function dfs(path: Position[], currentWord: string): void {
    // Prune if not a valid prefix
    if (!isValidPrefix(currentWord)) {
      return;
    }

    // Check if current word is valid and not already found
    if (isValidWord(currentWord) && !validWords.has(currentWord)) {
      validWords.set(currentWord, [...path]);
    }

    // Try extending the path
    const nextPositions = getValidNextPositions(path);
    for (const nextPos of nextPositions) {
      const nextLetter = board[nextPos.row][nextPos.col];
      dfs([...path, nextPos], currentWord + nextLetter);
    }
  }

  // Start DFS from each position
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const startPos = { row, col };
      const startLetter = board[row][col];
      dfs([startPos], startLetter);
    }
  }

  return validWords;
}
