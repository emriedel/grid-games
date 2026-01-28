import { Board, Piece, Position, Direction, Move } from '@/types';
import { simulateSlide, applyMove, isTargetOnGoal } from './gameLogic';

interface SolverState {
  pieces: Piece[];
  moves: number;
  path: Move[];
}

/**
 * Create a string key representing piece positions for visited state tracking
 */
function createStateKey(pieces: Piece[]): string {
  // Sort by id to ensure consistent key
  const sorted = [...pieces].sort((a, b) => a.id.localeCompare(b.id));
  return sorted.map((p) => `${p.id}:${p.position.row},${p.position.col}`).join('|');
}

/**
 * BFS solver to find optimal number of moves
 * Returns the minimum number of moves to get target to goal, or -1 if impossible
 */
export function solve(board: Board, initialPieces: Piece[], maxMoves: number = 20): number {
  const directions: Direction[] = ['up', 'right', 'down', 'left'];
  const visited = new Set<string>();
  const queue: SolverState[] = [{ pieces: initialPieces, moves: 0, path: [] }];

  visited.add(createStateKey(initialPieces));

  // Check if already solved
  if (isTargetOnGoal(initialPieces, board.goal)) {
    return 0;
  }

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.moves >= maxMoves) {
      continue;
    }

    // Try each piece and direction
    for (const piece of current.pieces) {
      for (const dir of directions) {
        const newPos = simulateSlide(board, current.pieces, piece.id, dir);

        // Skip if piece didn't move
        if (newPos.row === piece.position.row && newPos.col === piece.position.col) {
          continue;
        }

        const newPieces = applyMove(current.pieces, piece.id, newPos);
        const stateKey = createStateKey(newPieces);

        // Skip if we've visited this state
        if (visited.has(stateKey)) {
          continue;
        }

        visited.add(stateKey);

        const move: Move = {
          pieceId: piece.id,
          direction: dir,
          from: piece.position,
          to: newPos,
        };

        const newState: SolverState = {
          pieces: newPieces,
          moves: current.moves + 1,
          path: [...current.path, move],
        };

        // Check if solved
        if (isTargetOnGoal(newPieces, board.goal)) {
          return newState.moves;
        }

        queue.push(newState);
      }
    }
  }

  return -1; // No solution found
}

/**
 * Get the full solution path
 * Returns array of moves, or null if no solution
 */
export function getSolutionPath(
  board: Board,
  initialPieces: Piece[],
  maxMoves: number = 20
): Move[] | null {
  const directions: Direction[] = ['up', 'right', 'down', 'left'];
  const visited = new Set<string>();
  const queue: SolverState[] = [{ pieces: initialPieces, moves: 0, path: [] }];

  visited.add(createStateKey(initialPieces));

  if (isTargetOnGoal(initialPieces, board.goal)) {
    return [];
  }

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.moves >= maxMoves) {
      continue;
    }

    for (const piece of current.pieces) {
      for (const dir of directions) {
        const newPos = simulateSlide(board, current.pieces, piece.id, dir);

        if (newPos.row === piece.position.row && newPos.col === piece.position.col) {
          continue;
        }

        const newPieces = applyMove(current.pieces, piece.id, newPos);
        const stateKey = createStateKey(newPieces);

        if (visited.has(stateKey)) {
          continue;
        }

        visited.add(stateKey);

        const move: Move = {
          pieceId: piece.id,
          direction: dir,
          from: piece.position,
          to: newPos,
        };

        const newState: SolverState = {
          pieces: newPieces,
          moves: current.moves + 1,
          path: [...current.path, move],
        };

        if (isTargetOnGoal(newPieces, board.goal)) {
          return newState.path;
        }

        queue.push(newState);
      }
    }
  }

  return null;
}
