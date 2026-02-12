import { Direction, Move } from '@/types';

/**
 * Encoding format:
 * - pieceId: 't' = target, '0' = blocker-0, '1' = blocker-1, '2' = blocker-2
 * - direction: 'u' = up, 'r' = right, 'd' = down, 'l' = left
 * Each move = 2 characters (pieceId + direction)
 */

const PIECE_ID_TO_CHAR: Record<string, string> = {
  'target': 't',
  'blocker-0': '0',
  'blocker-1': '1',
  'blocker-2': '2',
};

const CHAR_TO_PIECE_ID: Record<string, string> = {
  't': 'target',
  '0': 'blocker-0',
  '1': 'blocker-1',
  '2': 'blocker-2',
};

const DIRECTION_TO_CHAR: Record<Direction, string> = {
  'up': 'u',
  'right': 'r',
  'down': 'd',
  'left': 'l',
};

const CHAR_TO_DIRECTION: Record<string, Direction> = {
  'u': 'up',
  'r': 'right',
  'd': 'down',
  'l': 'left',
};

/**
 * Encode a list of moves into a compact string
 * Example: [{ pieceId: 'target', direction: 'up' }, { pieceId: 'blocker-0', direction: 'right' }]
 * becomes "tu0r"
 */
export function encodeReplayMoves(moves: Move[]): string {
  return moves
    .map((move) => {
      const pieceChar = PIECE_ID_TO_CHAR[move.pieceId] ?? move.pieceId.charAt(0);
      const dirChar = DIRECTION_TO_CHAR[move.direction];
      return pieceChar + dirChar;
    })
    .join('');
}

/**
 * Decode a compact move string back into move objects
 * Note: This only returns pieceId and direction, not from/to positions
 */
export function decodeReplayMoves(
  encoded: string
): { pieceId: string; direction: Direction }[] | null {
  if (!encoded || encoded.length % 2 !== 0) {
    return null;
  }

  const moves: { pieceId: string; direction: Direction }[] = [];

  for (let i = 0; i < encoded.length; i += 2) {
    const pieceChar = encoded[i];
    const dirChar = encoded[i + 1];

    const pieceId = CHAR_TO_PIECE_ID[pieceChar];
    const direction = CHAR_TO_DIRECTION[dirChar];

    if (!pieceId || !direction) {
      return null; // Invalid encoding
    }

    moves.push({ pieceId, direction });
  }

  return moves;
}

/**
 * Build a shareable replay URL
 */
export function buildReplayUrl(
  puzzleNumber: number,
  puzzleId: string,
  moves: Move[]
): string {
  const encodedMoves = encodeReplayMoves(moves);
  // Use first 8 chars of puzzleId for URL (enough for version check)
  const shortId = puzzleId.slice(0, 8);
  return `https://nerdcube.games/carom/replay?p=${puzzleNumber}&id=${shortId}&m=${encodedMoves}`;
}

/**
 * Parse replay params from URL search params
 */
export function parseReplayParams(searchParams: URLSearchParams): {
  puzzleNumber: number;
  puzzleId: string;
  moves: { pieceId: string; direction: Direction }[];
} | null {
  const puzzleParam = searchParams.get('p');
  const idParam = searchParams.get('id');
  const movesParam = searchParams.get('m');

  if (!puzzleParam || !idParam || !movesParam) {
    return null;
  }

  const puzzleNumber = parseInt(puzzleParam, 10);
  if (isNaN(puzzleNumber) || puzzleNumber < 1) {
    return null;
  }

  const moves = decodeReplayMoves(movesParam);
  if (!moves) {
    return null;
  }

  return {
    puzzleNumber,
    puzzleId: idParam,
    moves,
  };
}
