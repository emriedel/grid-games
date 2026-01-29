import {
  Position,
  Direction,
  Piece,
  Board,
  ReverseMove,
  WALL_TOP,
  WALL_RIGHT,
  WALL_BOTTOM,
  WALL_LEFT,
} from '@/types';

/**
 * Get the opposite direction
 */
export function getOppositeDirection(dir: Direction): Direction {
  const opposites: Record<Direction, Direction> = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
  };
  return opposites[dir];
}

/**
 * Get the delta (row, col) for a direction
 */
export function getDirectionDelta(dir: Direction): { dRow: number; dCol: number } {
  const deltas: Record<Direction, { dRow: number; dCol: number }> = {
    up: { dRow: -1, dCol: 0 },
    down: { dRow: 1, dCol: 0 },
    left: { dRow: 0, dCol: -1 },
    right: { dRow: 0, dCol: 1 },
  };
  return deltas[dir];
}

/**
 * Get the wall flag for exiting a cell in a direction
 */
export function getExitWallFlag(dir: Direction): number {
  const flags: Record<Direction, number> = {
    up: WALL_TOP,
    right: WALL_RIGHT,
    down: WALL_BOTTOM,
    left: WALL_LEFT,
  };
  return flags[dir];
}

/**
 * Get the wall flag for entering a cell from a direction
 */
export function getEntryWallFlag(dir: Direction): number {
  return getExitWallFlag(getOppositeDirection(dir));
}

/**
 * Check if a cell has a wall blocking exit in a direction
 */
export function hasWallBlocking(board: Board, pos: Position, dir: Direction): boolean {
  const walls = board.walls[pos.row]?.[pos.col] ?? 0;
  return (walls & getExitWallFlag(dir)) !== 0;
}

/**
 * Check if a position is within board bounds
 */
export function isInBounds(board: Board, pos: Position): boolean {
  return pos.row >= 0 && pos.row < board.size && pos.col >= 0 && pos.col < board.size;
}

/**
 * Check if a position has another piece
 */
export function hasPieceAt(pieces: Piece[], pos: Position, excludeId?: string): boolean {
  return pieces.some(
    (p) => p.id !== excludeId && p.position.row === pos.row && p.position.col === pos.col
  );
}

/**
 * Check if a position has a solid obstacle (1x1 block)
 */
export function hasObstacle(board: Board, pos: Position): boolean {
  if (!board.obstacles) return false;
  return board.obstacles.some((o) => o.row === pos.row && o.col === pos.col);
}

/**
 * Simulate a piece sliding in a direction until it hits something
 * Returns the final position after sliding
 */
export function simulateSlide(
  board: Board,
  pieces: Piece[],
  pieceId: string,
  direction: Direction
): Position {
  const piece = pieces.find((p) => p.id === pieceId);
  if (!piece) {
    throw new Error(`Piece ${pieceId} not found`);
  }

  const { dRow, dCol } = getDirectionDelta(direction);
  let currentPos = { ...piece.position };

  while (true) {
    // Check if current cell has a wall blocking exit
    if (hasWallBlocking(board, currentPos, direction)) {
      break;
    }

    // Calculate next position
    const nextPos: Position = {
      row: currentPos.row + dRow,
      col: currentPos.col + dCol,
    };

    // Check if next position is out of bounds
    if (!isInBounds(board, nextPos)) {
      break;
    }

    // Check if next cell has a wall blocking entry
    const nextWalls = board.walls[nextPos.row]?.[nextPos.col] ?? 0;
    if ((nextWalls & getEntryWallFlag(direction)) !== 0) {
      break;
    }

    // Check if next position has a solid obstacle
    if (hasObstacle(board, nextPos)) {
      break;
    }

    // Check if next position has another piece
    if (hasPieceAt(pieces, nextPos, pieceId)) {
      break;
    }

    // Move to next position
    currentPos = nextPos;
  }

  return currentPos;
}

/**
 * Apply a move to pieces array, returning new pieces array
 */
export function applyMove(
  pieces: Piece[],
  pieceId: string,
  newPosition: Position
): Piece[] {
  return pieces.map((p) =>
    p.id === pieceId ? { ...p, position: newPosition } : p
  );
}

/**
 * Check if target piece is on the goal
 */
export function isTargetOnGoal(pieces: Piece[], goal: Position): boolean {
  const target = pieces.find((p) => p.type === 'target');
  if (!target) return false;
  return target.position.row === goal.row && target.position.col === goal.col;
}

/**
 * Check if a move would actually move the piece
 */
export function wouldPieceMove(
  board: Board,
  pieces: Piece[],
  pieceId: string,
  direction: Direction
): boolean {
  const piece = pieces.find((p) => p.id === pieceId);
  if (!piece) return false;

  const endPos = simulateSlide(board, pieces, pieceId, direction);
  return endPos.row !== piece.position.row || endPos.col !== piece.position.col;
}

/**
 * Get all valid moves from current state
 */
export function getValidMoves(
  board: Board,
  pieces: Piece[]
): Array<{ pieceId: string; direction: Direction }> {
  const moves: Array<{ pieceId: string; direction: Direction }> = [];
  const directions: Direction[] = ['up', 'right', 'down', 'left'];

  for (const piece of pieces) {
    for (const dir of directions) {
      if (wouldPieceMove(board, pieces, piece.id, dir)) {
        moves.push({ pieceId: piece.id, direction: dir });
      }
    }
  }

  return moves;
}

/**
 * Get valid directions for a specific piece
 */
export function getValidDirections(
  board: Board,
  pieces: Piece[],
  pieceId: string
): Direction[] {
  const directions: Direction[] = ['up', 'right', 'down', 'left'];
  return directions.filter((dir) => wouldPieceMove(board, pieces, pieceId, dir));
}

/**
 * Determine what obstacle stops a piece at a given position in a given direction.
 * Returns the type of obstacle that would stop a piece sliding FROM this position
 * in the given direction.
 */
export function getStoppingObstacle(
  board: Board,
  pieces: Piece[],
  pos: Position,
  dir: Direction
): 'wall' | 'edge' | 'piece' | 'obstacle' | null {
  // Check if current cell has a wall blocking exit
  if (hasWallBlocking(board, pos, dir)) {
    return 'wall';
  }

  const { dRow, dCol } = getDirectionDelta(dir);
  const nextPos: Position = {
    row: pos.row + dRow,
    col: pos.col + dCol,
  };

  // Check if next position is out of bounds
  if (!isInBounds(board, nextPos)) {
    return 'edge';
  }

  // Check if next cell has a wall blocking entry
  const nextWalls = board.walls[nextPos.row]?.[nextPos.col] ?? 0;
  if ((nextWalls & getEntryWallFlag(dir)) !== 0) {
    return 'wall';
  }

  // Check if next position has a solid obstacle
  if (hasObstacle(board, nextPos)) {
    return 'obstacle';
  }

  // Check if next position has another piece
  if (hasPieceAt(pieces, nextPos)) {
    return 'piece';
  }

  return null; // Nothing stopping the piece
}

/**
 * Check if a position is blocked in a given direction
 * (cannot continue sliding in that direction)
 */
export function isBlockedInDirection(
  board: Board,
  pieces: Piece[],
  pos: Position,
  dir: Direction,
  excludePieceId?: string
): boolean {
  // Check if current cell has a wall blocking exit
  if (hasWallBlocking(board, pos, dir)) {
    return true;
  }

  const { dRow, dCol } = getDirectionDelta(dir);
  const nextPos: Position = {
    row: pos.row + dRow,
    col: pos.col + dCol,
  };

  // Check if next position is out of bounds
  if (!isInBounds(board, nextPos)) {
    return true;
  }

  // Check if next cell has a wall blocking entry
  const nextWalls = board.walls[nextPos.row]?.[nextPos.col] ?? 0;
  if ((nextWalls & getEntryWallFlag(dir)) !== 0) {
    return true;
  }

  // Check if next position has a solid obstacle
  if (hasObstacle(board, nextPos)) {
    return true;
  }

  // Check if next position has another piece
  if (hasPieceAt(pieces, nextPos, excludePieceId)) {
    return true;
  }

  return false;
}

/**
 * Find valid origin positions for a reverse move.
 * Given a piece at `currentPos` that was stopped by something when moving in `arrivalDir`,
 * find all positions it could have come FROM (along the opposite direction path).
 */
export function findValidOrigins(
  board: Board,
  pieces: Piece[],
  pieceId: string,
  currentPos: Position,
  arrivalDir: Direction
): ReverseMove[] {
  const reverseMoves: ReverseMove[] = [];
  const reverseDir = getOppositeDirection(arrivalDir);
  const { dRow, dCol } = getDirectionDelta(reverseDir);

  // First, check what stopped the piece at currentPos
  const stoppedBy = getStoppingObstacle(board, pieces, currentPos, arrivalDir);
  if (!stoppedBy) {
    // Piece wouldn't actually stop here, invalid
    return [];
  }

  // Walk backward along the reverse direction to find all valid origins
  let checkPos = { ...currentPos };
  let distance = 0;

  while (true) {
    // Move one step in the reverse direction
    const nextOrigin: Position = {
      row: checkPos.row + dRow,
      col: checkPos.col + dCol,
    };

    // Check if this origin is out of bounds
    if (!isInBounds(board, nextOrigin)) {
      break;
    }

    // Check if there's a wall blocking movement from nextOrigin toward currentPos
    if (hasWallBlocking(board, nextOrigin, arrivalDir)) {
      break;
    }

    // Check if there's a wall blocking entry into checkPos from nextOrigin's direction
    const checkWalls = board.walls[checkPos.row]?.[checkPos.col] ?? 0;
    if ((checkWalls & getEntryWallFlag(arrivalDir)) !== 0) {
      break;
    }

    // Check if there's an obstacle at nextOrigin
    if (hasObstacle(board, nextOrigin)) {
      break;
    }

    // Check if there's another piece at nextOrigin (excluding the piece we're analyzing)
    if (hasPieceAt(pieces, nextOrigin, pieceId)) {
      break;
    }

    distance++;

    // This is a valid origin - piece could have started here
    reverseMoves.push({
      pieceId,
      fromPosition: currentPos,
      toPosition: nextOrigin,
      direction: arrivalDir,
      stoppedBy,
      distance,
    });

    checkPos = nextOrigin;
  }

  return reverseMoves;
}
