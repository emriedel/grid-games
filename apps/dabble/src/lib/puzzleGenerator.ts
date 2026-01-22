import seedrandom from 'seedrandom';
import {
  BOARD_SIZE,
  BOARD_CONFIG,
  LETTER_DISTRIBUTION,
  VOWELS,
  LETTER_CONSTRAINTS,
  COMMON_2_LETTER_WORDS,
  COMMON_3_LETTER_WORDS,
  COMMON_LONG_WORDS,
  BOARD_SYMMETRY,
  BONUS_PLACEMENT,
  BOARD_ARCHETYPES,
  DIFFICULT_LETTERS,
  DIFFICULT_LETTER_RULES,
} from '@/constants/gameConfig';
import type { BoardArchetype } from '@/constants/gameConfig';
import type { GameBoard, Cell, BonusType, DailyPuzzle } from '@/types';

// Create a seeded random number generator for a given date
function createRng(dateString: string): () => number {
  return seedrandom(dateString);
}

// Generate a random integer in range [min, max]
function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// Shuffle an array using Fisher-Yates
function shuffle<T>(rng: () => number, array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Check if a cell position is within bounds
function inBounds(row: number, col: number, size: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

// Get neighboring cells
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

// Get the 180° rotated position of a cell
function getRotatedPosition(r: number, c: number, size: number): [number, number] {
  return [size - 1 - r, size - 1 - c];
}

// Check if a cell is in the "first half" (for 180° symmetry, only generate in upper-left)
function isInFirstHalf(r: number, c: number, size: number): boolean {
  const center = Math.floor(size / 2);
  // Consider cells where r < center, or r == center and c < center
  return r < center || (r === center && c < center);
}

// Manhattan distance from center
function distFromCenter(r: number, c: number, size: number): number {
  const centerR = Math.floor(size / 2);
  const centerC = Math.floor(size / 2);
  return Math.abs(r - centerR) + Math.abs(c - centerC);
}

// Ensure board connectivity from center using BFS, marking unreachable cells as dead
function ensureConnectivity(playable: boolean[][], size: number): void {
  const centerR = Math.floor(size / 2);
  const centerC = Math.floor(size / 2);

  const visited: boolean[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(false));

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

  // Mark unreachable playable cells as dead (and their symmetric counterparts)
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

// ============ BOARD ARCHETYPE GENERATORS ============

// Classic archetype: Traditional edges-only dead spaces (original algorithm)
function generateClassicBoard(rng: () => number, size: number): boolean[][] {
  const playable: boolean[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(true));

  const totalCells = size * size;
  const targetPlayable = randInt(
    rng,
    Math.floor(totalCells * BOARD_CONFIG.minPlayablePercent),
    Math.floor(totalCells * BOARD_CONFIG.maxPlayablePercent)
  );
  const targetDead = totalCells - targetPlayable;

  const protectionRadius = BOARD_SYMMETRY.centerProtectionRadius;

  // Collect potential dead space seed points (only in first half for symmetry)
  const seedPoints: [number, number][] = [];

  // Corners (only upper-left quadrant corners)
  if (rng() < 0.8) seedPoints.push([0, 0]);
  if (rng() < 0.6) seedPoints.push([0, size - 1]);
  if (rng() < 0.6) seedPoints.push([size - 1, 0]);

  // Edge points in first half
  for (let i = 1; i < size - 1; i++) {
    if (isInFirstHalf(0, i, size) && rng() < 0.25) seedPoints.push([0, i]);
    if (isInFirstHalf(i, 0, size) && rng() < 0.25) seedPoints.push([i, 0]);
    if (isInFirstHalf(size - 1, i, size) && rng() < 0.25) seedPoints.push([size - 1, i]);
    if (isInFirstHalf(i, size - 1, size) && rng() < 0.25) seedPoints.push([i, size - 1]);
  }

  const shuffledSeeds = shuffle(rng, seedPoints);
  let deadCount = 0;

  // Grow dead spaces from seed points, always applying symmetry
  for (const [sr, sc] of shuffledSeeds) {
    if (deadCount >= targetDead / 2) break;

    if (distFromCenter(sr, sc, size) < protectionRadius) continue;
    if (!playable[sr][sc]) continue;

    const clusterSize = randInt(rng, 1, 3);
    const cluster: [number, number][] = [[sr, sc]];
    const visited = new Set<string>();
    visited.add(`${sr},${sc}`);

    const queue: [number, number][] = [[sr, sc]];

    while (queue.length > 0 && cluster.length < clusterSize) {
      const [r, c] = queue.shift()!;

      for (const [nr, nc] of getNeighbors(r, c, size)) {
        const key = `${nr},${nc}`;
        if (visited.has(key)) continue;
        visited.add(key);

        if (distFromCenter(nr, nc, size) < protectionRadius) continue;
        if (!playable[nr][nc]) continue;
        const centerR = Math.floor(size / 2);
        const centerC = Math.floor(size / 2);
        if (!isInFirstHalf(nr, nc, size) && !(nr === centerR && nc === centerC)) continue;

        if (rng() < 0.4) {
          cluster.push([nr, nc]);
          queue.push([nr, nc]);
        }
      }
    }

    for (const [r, c] of cluster) {
      if (distFromCenter(r, c, size) >= protectionRadius && playable[r][c]) {
        playable[r][c] = false;
        deadCount++;

        const [mr, mc] = getRotatedPosition(r, c, size);
        if (mr !== r || mc !== c) {
          if (playable[mr][mc] && distFromCenter(mr, mc, size) >= protectionRadius) {
            playable[mr][mc] = false;
            deadCount++;
          }
        }
      }
    }
  }

  ensureConnectivity(playable, size);
  return playable;
}

// Corridor archetype: Narrow central pathways created by dead space channels
function generateCorridorBoard(rng: () => number, size: number): boolean[][] {
  const playable: boolean[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(true));

  const protectionRadius = BOARD_SYMMETRY.centerProtectionRadius;
  const center = Math.floor(size / 2);

  // Create horizontal or vertical corridors by adding dead rows/columns
  const isHorizontal = rng() < 0.5;

  // Select 1-2 positions for corridor walls (offset from center)
  const wallPositions: number[] = [];
  const offset1 = randInt(rng, 1, 2);
  wallPositions.push(center - offset1);
  wallPositions.push(center + offset1);

  // Optionally add another wall pair
  if (rng() < 0.4) {
    const offset2 = randInt(rng, 3, Math.floor(size / 2) - 1);
    if (offset2 !== offset1) {
      wallPositions.push(center - offset2);
      wallPositions.push(center + offset2);
    }
  }

  for (const pos of wallPositions) {
    if (pos < 0 || pos >= size) continue;

    // Create partial walls with gaps for the corridor
    for (let i = 0; i < size; i++) {
      const r = isHorizontal ? pos : i;
      const c = isHorizontal ? i : pos;

      // Skip center protection area
      if (distFromCenter(r, c, size) < protectionRadius) continue;

      // Leave gaps at edges and random positions
      const edgeDist = Math.min(i, size - 1 - i);
      if (edgeDist < 2) continue; // Keep edges open
      if (rng() < 0.3) continue; // Random gaps

      playable[r][c] = false;

      // Apply 180° symmetry
      const [mr, mc] = getRotatedPosition(r, c, size);
      if (mr !== r || mc !== c) {
        playable[mr][mc] = false;
      }
    }
  }

  // Add corner dead spaces
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

// Islands archetype: Board divided by thin channels creating connected regions
function generateIslandsBoard(rng: () => number, size: number): boolean[][] {
  const playable: boolean[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(true));

  const protectionRadius = BOARD_SYMMETRY.centerProtectionRadius;
  const center = Math.floor(size / 2);

  // Create thin channels (1 cell wide) that divide the board
  // Choose channel pattern
  const pattern = rng() < 0.5 ? 'plus' : 'corners';

  if (pattern === 'plus') {
    // Create a + shaped channel through the board (avoiding center)
    // Horizontal channel at a random row offset from center
    const hOffset = rng() < 0.5 ? -3 : 3;
    const hRow = center + hOffset;

    if (hRow >= 0 && hRow < size) {
      for (let c = 0; c < size; c++) {
        // Leave gaps for connectivity
        if (c === 0 || c === size - 1 || c === center) continue;
        if (rng() < 0.3) continue; // Random gaps
        playable[hRow][c] = false;
        // Symmetric row
        const symRow = center - hOffset;
        if (symRow >= 0 && symRow < size && symRow !== hRow) {
          playable[symRow][c] = false;
        }
      }
    }

    // Vertical channel at a random col offset from center
    const vOffset = rng() < 0.5 ? -3 : 3;
    const vCol = center + vOffset;

    if (vCol >= 0 && vCol < size) {
      for (let r = 0; r < size; r++) {
        if (r === 0 || r === size - 1 || r === center) continue;
        if (rng() < 0.3) continue;
        playable[r][vCol] = false;
        const symCol = center - vOffset;
        if (symCol >= 0 && symCol < size && symCol !== vCol) {
          playable[r][symCol] = false;
        }
      }
    }
  } else {
    // Create L-shaped dead zones in corners, leaving center open
    const armLength = randInt(rng, 2, 3);

    // Process each corner
    const corners = [[0, 0], [0, size-1], [size-1, 0], [size-1, size-1]];
    for (const [cornerR, cornerC] of corners) {
      // Create small L-shape extending from corner
      for (let i = 1; i <= armLength; i++) {
        // Horizontal arm
        const hc = cornerC === 0 ? i : size - 1 - i;
        if (hc >= 0 && hc < size && distFromCenter(cornerR, hc, size) >= protectionRadius) {
          if (rng() < 0.7) playable[cornerR][hc] = false;
        }
        // Vertical arm
        const vr = cornerR === 0 ? i : size - 1 - i;
        if (vr >= 0 && vr < size && distFromCenter(vr, cornerC, size) >= protectionRadius) {
          if (rng() < 0.7) playable[vr][cornerC] = false;
        }
      }
      // Corner itself
      playable[cornerR][cornerC] = false;
    }

    // Add a few scattered interior dead cells for variety
    const scatterCount = randInt(rng, 2, 4);
    for (let i = 0; i < scatterCount; i++) {
      const r = randInt(rng, 2, size - 3);
      const c = randInt(rng, 2, size - 3);
      if (distFromCenter(r, c, size) >= protectionRadius && playable[r][c]) {
        playable[r][c] = false;
        // Apply symmetry
        const [mr, mc] = getRotatedPosition(r, c, size);
        if (mr !== r || mc !== c) {
          playable[mr][mc] = false;
        }
      }
    }
  }

  ensureConnectivity(playable, size);
  return playable;
}

// Diagonal archetype: Diamond-shaped playable area
function generateDiagonalBoard(rng: () => number, size: number): boolean[][] {
  const playable: boolean[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(true));

  const protectionRadius = BOARD_SYMMETRY.centerProtectionRadius;
  const center = Math.floor(size / 2);

  // Create dead spaces in corners to form diamond shape
  const diamondMargin = randInt(rng, 2, 3);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Distance from center using Chebyshev distance (max of row/col dist)
      const rowDist = Math.abs(r - center);
      const colDist = Math.abs(c - center);

      // Use Manhattan distance for diamond shape
      const manhattanDist = rowDist + colDist;

      // Cells far from center in diamond shape become dead
      if (manhattanDist > center + diamondMargin - 1) {
        // Add some randomness to edges
        if (manhattanDist === center + diamondMargin && rng() < 0.5) continue;

        playable[r][c] = false;
      }
    }
  }

  // Add small random dead patches along diagonals
  const diagonalPatches = randInt(rng, 1, 3);
  for (let i = 0; i < diagonalPatches; i++) {
    // Pick a point along a diagonal (in first half)
    const offset = randInt(rng, 2, center - 1);
    const positions: [number, number][] = [
      [offset, offset],
      [offset, size - 1 - offset],
    ];

    const [r, c] = positions[Math.floor(rng() * positions.length)];

    if (distFromCenter(r, c, size) >= protectionRadius && playable[r][c]) {
      playable[r][c] = false;
      const [mr, mc] = getRotatedPosition(r, c, size);
      if (mr !== r || mc !== c) {
        playable[mr][mc] = false;
      }
    }
  }

  ensureConnectivity(playable, size);
  return playable;
}

// Scattered archetype: Random interior holes
function generateScatteredBoard(rng: () => number, size: number): boolean[][] {
  const playable: boolean[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(true));

  const protectionRadius = BOARD_SYMMETRY.centerProtectionRadius;

  // Add small dead patches throughout (1-2 cells each)
  const numPatches = randInt(rng, 4, 7);

  // Collect candidate positions (interior cells in first half)
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

    // Check if placement would leave neighbors accessible
    let hasAccessibleNeighbor = false;
    for (const [nr, nc] of getNeighbors(r, c, size)) {
      if (playable[nr][nc] && distFromCenter(nr, nc, size) < protectionRadius) {
        hasAccessibleNeighbor = true;
        break;
      }
    }
    if (hasAccessibleNeighbor) continue;

    playable[r][c] = false;
    const [mr, mc] = getRotatedPosition(r, c, size);
    if (mr !== r || mc !== c) {
      playable[mr][mc] = false;
    }

    // Optionally expand to adjacent cell
    if (rng() < 0.3) {
      const neighbors = getNeighbors(r, c, size).filter(
        ([nr, nc]) => playable[nr][nc] &&
                      distFromCenter(nr, nc, size) >= protectionRadius &&
                      isInFirstHalf(nr, nc, size)
      );
      if (neighbors.length > 0) {
        const [nr, nc] = neighbors[Math.floor(rng() * neighbors.length)];
        playable[nr][nc] = false;
        const [mnr, mnc] = getRotatedPosition(nr, nc, size);
        if (mnr !== nr || mnc !== nc) {
          playable[mnr][mnc] = false;
        }
      }
    }

    patchesPlaced++;
  }

  // Add small corner cuts
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

// Open archetype: Minimal dead space, mostly open board
function generateOpenBoard(rng: () => number, size: number): boolean[][] {
  const playable: boolean[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(true));

  // Only cut small corners
  const cornerSize = randInt(rng, 1, 2);

  for (let r = 0; r < cornerSize; r++) {
    for (let c = 0; c < cornerSize - r; c++) {
      playable[r][c] = false;
      playable[r][size - 1 - c] = false;
      playable[size - 1 - r][c] = false;
      playable[size - 1 - r][size - 1 - c] = false;
    }
  }

  // Optionally add 1-2 scattered dead cells
  if (rng() < 0.4) {
    const protectionRadius = BOARD_SYMMETRY.centerProtectionRadius;
    const candidates: [number, number][] = [];

    for (let r = 1; r < size - 1; r++) {
      for (let c = 1; c < size - 1; c++) {
        if (isInFirstHalf(r, c, size) &&
            distFromCenter(r, c, size) >= protectionRadius &&
            playable[r][c]) {
          candidates.push([r, c]);
        }
      }
    }

    if (candidates.length > 0) {
      const [r, c] = candidates[Math.floor(rng() * candidates.length)];
      playable[r][c] = false;
      const [mr, mc] = getRotatedPosition(r, c, size);
      if (mr !== r || mc !== c) {
        playable[mr][mc] = false;
      }
    }
  }

  ensureConnectivity(playable, size);
  return playable;
}

// ============ MAIN BOARD SHAPE GENERATOR ============

// Result type for board generation
interface BoardShapeResult {
  playable: boolean[][];
  archetype: BoardArchetype;
}

// Generate the board shape by selecting and dispatching to a random archetype
function generateBoardShape(rng: () => number, size: number): BoardShapeResult {
  // Select a random archetype
  const archetypeIndex = Math.floor(rng() * BOARD_ARCHETYPES.length);
  const archetype: BoardArchetype = BOARD_ARCHETYPES[archetypeIndex];

  // Dispatch to the appropriate generator
  let playable: boolean[][];
  switch (archetype) {
    case 'corridor':
      playable = generateCorridorBoard(rng, size);
      break;
    case 'islands':
      playable = generateIslandsBoard(rng, size);
      break;
    case 'diagonal':
      playable = generateDiagonalBoard(rng, size);
      break;
    case 'scattered':
      playable = generateScatteredBoard(rng, size);
      break;
    case 'open':
      playable = generateOpenBoard(rng, size);
      break;
    case 'classic':
    default:
      playable = generateClassicBoard(rng, size);
      break;
  }

  return { playable, archetype };
}

// Calculate edge distance (how close to the edge of playable area)
function getEdgeDistance(r: number, c: number, size: number): number {
  const distTop = r;
  const distBottom = size - 1 - r;
  const distLeft = c;
  const distRight = size - 1 - c;
  return Math.min(distTop, distBottom, distLeft, distRight);
}

// Check if any adjacent cell has a bonus
function hasAdjacentBonus(r: number, c: number, bonuses: BonusType[][], size: number): boolean {
  for (const [nr, nc] of getNeighbors(r, c, size)) {
    if (bonuses[nr][nc] !== null) return true;
  }
  return false;
}

// Score a position for bonus placement based on preferences
function scorePosition(
  r: number,
  c: number,
  size: number,
  centerR: number,
  centerC: number,
  edgePreference: number
): number {
  const edgeDist = getEdgeDistance(r, c, size);
  const maxEdgeDist = Math.floor(size / 2);

  // Score based on edge preference (higher edgePreference = prefer edges)
  // edgeDist 0 = on edge, edgeDist max = near center
  const normalizedEdge = 1 - edgeDist / maxEdgeDist;
  return normalizedEdge * edgePreference + (1 - normalizedEdge) * (1 - edgePreference);
}

// Place bonus squares on the board with balanced distribution
function placeBonuses(
  rng: () => number,
  playable: boolean[][],
  size: number
): BonusType[][] {
  const bonuses: BonusType[][] = Array(size)
    .fill(null)
    .map(() => Array(size).fill(null));

  const centerR = Math.floor(size / 2);
  const centerC = Math.floor(size / 2);

  // Place start square in center
  bonuses[centerR][centerC] = 'START';

  // Manhattan distance from center
  const distFromCenterFn = (r: number, c: number) =>
    Math.abs(r - centerR) + Math.abs(c - centerC);

  // Track placement balance for each bonus type
  // We track: top vs bottom, left vs right (for overall balance)
  const balanceTracker: Record<string, { top: number; bottom: number; left: number; right: number }> = {
    TW: { top: 0, bottom: 0, left: 0, right: 0 },
    DW: { top: 0, bottom: 0, left: 0, right: 0 },
    TL: { top: 0, bottom: 0, left: 0, right: 0 },
    DL: { top: 0, bottom: 0, left: 0, right: 0 },
  };

  // Get position's half-board attributes
  const getHalves = (r: number, c: number): { isTop: boolean; isLeft: boolean } => {
    return {
      isTop: r < centerR,
      isLeft: c < centerC,
    };
  };

  // Get valid positions for bonus placement
  const getValidPositions = (bonusType: keyof typeof BONUS_PLACEMENT): [number, number][] => {
    const config = BONUS_PLACEMENT[bonusType];
    const positions: [number, number][] = [];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        // Skip non-playable, center, or already assigned
        if (!playable[r][c]) continue;
        if (r === centerR && c === centerC) continue;
        if (bonuses[r][c] !== null) continue;

        // Check minimum distance from center
        if (distFromCenterFn(r, c) < config.minDistFromCenter) continue;

        // Check adjacent bonus constraint
        if (!config.allowAdjacent && hasAdjacentBonus(r, c, bonuses, size)) continue;

        positions.push([r, c]);
      }
    }

    // IMPORTANT: Shuffle positions to remove top-left iteration bias
    return shuffle(rng, positions);
  };

  // Place bonuses in order: TW → DW → TL → DL (rarest first)
  const bonusTypes: (keyof typeof BONUS_PLACEMENT)[] = ['TW', 'DW', 'TL', 'DL'];

  for (const bonusType of bonusTypes) {
    const config = BONUS_PLACEMENT[bonusType];
    const count = BOARD_CONFIG.bonusCounts[bonusType];
    const tracker = balanceTracker[bonusType];

    // Place each bonus individually with balance tracking
    for (let i = 0; i < count; i++) {
      const validPositions = getValidPositions(bonusType);
      if (validPositions.length === 0) break;

      // Score positions with edge preference AND balance bonuses
      const scoredPositions = validPositions.map(([r, c]) => {
        const baseScore = scorePosition(r, c, size, centerR, centerC, config.edgePreference);
        const halves = getHalves(r, c);

        // Calculate balance bonus: strongly prefer under-represented halves
        // This ensures top/bottom and left/right are balanced
        let balanceBonus = 0;

        // Vertical balance (top vs bottom)
        if (halves.isTop && tracker.top > tracker.bottom) {
          balanceBonus -= 1.0; // Penalize top if top is over-represented
        } else if (!halves.isTop && tracker.bottom > tracker.top) {
          balanceBonus -= 1.0; // Penalize bottom if bottom is over-represented
        } else if (halves.isTop && tracker.top < tracker.bottom) {
          balanceBonus += 0.8; // Boost top if top is under-represented
        } else if (!halves.isTop && tracker.bottom < tracker.top) {
          balanceBonus += 0.8; // Boost bottom if bottom is under-represented
        }

        // Horizontal balance (left vs right)
        if (halves.isLeft && tracker.left > tracker.right) {
          balanceBonus -= 0.5;
        } else if (!halves.isLeft && tracker.right > tracker.left) {
          balanceBonus -= 0.5;
        } else if (halves.isLeft && tracker.left < tracker.right) {
          balanceBonus += 0.4;
        } else if (!halves.isLeft && tracker.right < tracker.left) {
          balanceBonus += 0.4;
        }

        return {
          pos: [r, c] as [number, number],
          score: baseScore + balanceBonus,
          halves,
        };
      });

      // Sort by score (descending)
      scoredPositions.sort((a, b) => b.score - a.score);

      // Pick from top candidates with weighted random selection
      const topN = Math.min(5, scoredPositions.length);
      const weights = scoredPositions.slice(0, topN).map((_, idx) => Math.pow(0.5, idx));
      const totalWeight = weights.reduce((a, b) => a + b, 0);

      let pick = rng() * totalWeight;
      let selectedIdx = 0;
      for (let j = 0; j < weights.length; j++) {
        pick -= weights[j];
        if (pick <= 0) {
          selectedIdx = j;
          break;
        }
      }

      const selected = scoredPositions[selectedIdx];
      const [r, c] = selected.pos;
      bonuses[r][c] = bonusType;

      // Update balance tracker
      if (selected.halves.isTop) tracker.top++;
      else tracker.bottom++;
      if (selected.halves.isLeft) tracker.left++;
      else tracker.right++;
    }
  }

  return bonuses;
}

// Sort letters: vowels first (alphabetically), then consonants (alphabetically)
function sortLetters(letters: string[]): string[] {
  const vowels = letters.filter((l) => VOWELS.includes(l)).sort();
  const consonants = letters.filter((l) => !VOWELS.includes(l)).sort();
  return [...vowels, ...consonants];
}

// Check if a set of letters can form a given word
function canFormWord(letters: string[], word: string): boolean {
  const available = [...letters];
  for (const char of word) {
    const idx = available.indexOf(char);
    if (idx === -1) return false;
    available.splice(idx, 1);
  }
  return true;
}

// Count how many words from a list can be formed with given letters
function countFormableWords(letters: string[], wordList: string[]): number {
  return wordList.filter(word => canFormWord(letters, word)).length;
}

// Check if letters meet playability requirements
function isPlayable(letters: string[]): boolean {
  const twoLetterCount = countFormableWords(letters, COMMON_2_LETTER_WORDS);
  const threeLetterCount = countFormableWords(letters, COMMON_3_LETTER_WORDS);
  return twoLetterCount >= 3 && threeLetterCount >= 2;
}

// Check if at least one 5+ letter word can be formed
function canFormAnyLongWord(letters: string[]): boolean {
  return COMMON_LONG_WORDS.some(word => canFormWord(letters, word));
}

// Check if difficult letter rules are satisfied
function meetsDifficultLetterRules(letters: string[]): boolean {
  // Count difficult letters - max 1 allowed
  const difficultCount = letters.filter(l => DIFFICULT_LETTERS.includes(l)).length;
  if (difficultCount > 1) return false;

  // Check if each difficult letter has its required companions
  for (const letter of letters) {
    const rules = DIFFICULT_LETTER_RULES[letter];
    if (rules && rules.requires.length > 0) {
      // Check that all required letters are present
      for (const required of rules.requires) {
        if (!letters.includes(required)) {
          return false;
        }
      }
    }
  }

  return true;
}

// Check if letters meet all constraints
function meetsConstraints(letters: string[]): boolean {
  const { minVowels, maxVowels, minUniqueLetters, maxDuplicatesPerLetter, totalLetters } = LETTER_CONSTRAINTS;

  if (letters.length !== totalLetters) return false;

  // Check vowel count
  const vowelCount = letters.filter(l => VOWELS.includes(l)).length;
  if (vowelCount < minVowels || vowelCount > maxVowels) return false;

  // Check unique letters
  const uniqueLetters = new Set(letters);
  if (uniqueLetters.size < minUniqueLetters) return false;

  // Check max duplicates per letter
  const letterCounts = new Map<string, number>();
  for (const letter of letters) {
    const count = (letterCounts.get(letter) || 0) + 1;
    if (count > maxDuplicatesPerLetter) return false;
    letterCounts.set(letter, count);
  }

  return true;
}

// Generate the letter set for a puzzle with constraint-based drawing
function generateLetters(rng: () => number): string[] {
  const { totalLetters, minVowels, maxVowels, maxDuplicatesPerLetter } = LETTER_CONSTRAINTS;

  // Create separate vowel and consonant pools
  const vowelPool: string[] = [];
  const consonantPool: string[] = [];

  for (const [letter, count] of Object.entries(LETTER_DISTRIBUTION)) {
    const pool = VOWELS.includes(letter) ? vowelPool : consonantPool;
    for (let i = 0; i < count; i++) {
      pool.push(letter);
    }
  }

  const maxAttempts = 100; // Increased from 50 to accommodate stricter rules

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const shuffledVowels = shuffle(rng, [...vowelPool]);
    const shuffledConsonants = shuffle(rng, [...consonantPool]);

    const drawn: string[] = [];
    const letterCounts = new Map<string, number>();

    // Decide how many vowels (between minVowels and maxVowels)
    const targetVowels = randInt(rng, minVowels, maxVowels);
    const targetConsonants = totalLetters - targetVowels;

    // Draw vowels
    let vowelIdx = 0;
    while (drawn.filter(l => VOWELS.includes(l)).length < targetVowels && vowelIdx < shuffledVowels.length) {
      const letter = shuffledVowels[vowelIdx++];
      const count = letterCounts.get(letter) || 0;
      if (count < maxDuplicatesPerLetter) {
        drawn.push(letter);
        letterCounts.set(letter, count + 1);
      }
    }

    // Draw consonants
    let consonantIdx = 0;
    while (drawn.filter(l => !VOWELS.includes(l)).length < targetConsonants && consonantIdx < shuffledConsonants.length) {
      const letter = shuffledConsonants[consonantIdx++];
      const count = letterCounts.get(letter) || 0;
      if (count < maxDuplicatesPerLetter) {
        drawn.push(letter);
        letterCounts.set(letter, count + 1);
      }
    }

    // Fill any remaining slots if needed
    const allRemaining = shuffle(rng, [...shuffledVowels.slice(vowelIdx), ...shuffledConsonants.slice(consonantIdx)]);
    let remainingIdx = 0;
    while (drawn.length < totalLetters && remainingIdx < allRemaining.length) {
      const letter = allRemaining[remainingIdx++];
      const count = letterCounts.get(letter) || 0;
      if (count < maxDuplicatesPerLetter) {
        drawn.push(letter);
        letterCounts.set(letter, count + 1);
      }
    }

    // Check all constraints:
    // 1. Basic constraints (vowels, unique letters, duplicates)
    if (!meetsConstraints(drawn)) continue;

    // 2. Difficult letter rules (max 1 difficult, Q requires U)
    if (!meetsDifficultLetterRules(drawn)) continue;

    // 3. Basic playability (can form 2 and 3 letter words)
    if (!isPlayable(drawn)) continue;

    // 4. Can form at least one 5+ letter word
    if (!canFormAnyLongWord(drawn)) continue;

    return sortLetters(drawn);
  }

  // Fallback: pre-validated letter sets that are known to be playable
  // These sets have no difficult letters and can form multiple long words
  const fallbackSets = [
    ['A', 'E', 'I', 'O', 'U', 'B', 'C', 'D', 'G', 'L', 'N', 'R', 'S', 'T'],
    ['A', 'E', 'I', 'O', 'C', 'D', 'F', 'H', 'L', 'M', 'N', 'R', 'S', 'T'],
    ['A', 'E', 'I', 'U', 'B', 'D', 'G', 'L', 'M', 'N', 'P', 'R', 'S', 'T'],
    ['A', 'E', 'O', 'U', 'C', 'D', 'H', 'L', 'M', 'N', 'P', 'R', 'S', 'W'],
    ['A', 'E', 'I', 'O', 'B', 'D', 'F', 'G', 'L', 'N', 'R', 'S', 'T', 'Y'],
    ['A', 'E', 'I', 'O', 'C', 'G', 'H', 'L', 'N', 'P', 'R', 'S', 'T', 'W'],
    ['A', 'E', 'I', 'U', 'B', 'C', 'D', 'L', 'M', 'N', 'R', 'S', 'T', 'W'],
    ['A', 'E', 'O', 'U', 'B', 'C', 'D', 'G', 'L', 'N', 'R', 'S', 'T', 'Y'],
  ];

  const fallbackIdx = Math.floor(rng() * fallbackSets.length);
  return sortLetters(shuffle(rng, fallbackSets[fallbackIdx]));
}

// Generate a complete game board
interface BoardResult {
  board: GameBoard;
  archetype: BoardArchetype;
}

function generateBoard(rng: () => number): BoardResult {
  const { playable, archetype } = generateBoardShape(rng, BOARD_SIZE);
  const bonuses = placeBonuses(rng, playable, BOARD_SIZE);

  const cells: Cell[][] = Array(BOARD_SIZE)
    .fill(null)
    .map((_, row) =>
      Array(BOARD_SIZE)
        .fill(null)
        .map((_, col) => ({
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

// Get today's date string in YYYY-MM-DD format (Pacific time)
export function getTodayDateString(): string {
  const now = new Date();
  // Format date in Pacific time
  const pacificDate = now.toLocaleDateString('en-CA', {
    timeZone: 'America/Los_Angeles',
  });
  return pacificDate; // Returns YYYY-MM-DD format
}

// Generate the daily puzzle
export function generateDailyPuzzle(dateString?: string): DailyPuzzle {
  const date = dateString || getTodayDateString();
  const seed = Date.parse(date);
  const rng = createRng(date);

  const { board, archetype } = generateBoard(rng);
  const letters = generateLetters(rng);

  return {
    date,
    board,
    letters,
    seed,
    archetype,
  };
}

// Get puzzle for a specific date (useful for testing)
export function getPuzzleForDate(dateString: string): DailyPuzzle {
  return generateDailyPuzzle(dateString);
}

// Generate a random puzzle (for debug mode)
export function generateRandomPuzzle(): DailyPuzzle {
  const randomSeed = `debug-${Date.now()}-${Math.random()}`;
  const rng = createRng(randomSeed);

  const { board, archetype } = generateBoard(rng);
  const letters = generateLetters(rng);

  return {
    date: `Debug #${Date.now().toString(36).slice(-6).toUpperCase()}`,
    board,
    letters,
    seed: Date.now(),
    archetype,
  };
}
