import type { PoolFile, PoolPuzzle } from '../../scripts/types';
import { getTodayPuzzleNumber } from './storage';

export interface FutureAssignedPuzzle {
  puzzleNumber: number;
  puzzle: PoolPuzzle;
}

/**
 * Load puzzles from pool.json
 */
export async function getPoolPuzzles(): Promise<PoolPuzzle[]> {
  try {
    const response = await fetch('/puzzles/pool.json');
    if (!response.ok) {
      console.log('pool.json not found');
      return [];
    }
    const data: PoolFile = await response.json();
    return data.puzzles || [];
  } catch (error) {
    console.error('Failed to load pool puzzles:', error);
    return [];
  }
}

/**
 * Load future assigned puzzles (puzzles assigned after today)
 */
export async function getFutureAssignedPuzzles(): Promise<FutureAssignedPuzzle[]> {
  const todayNumber = getTodayPuzzleNumber();
  const results: FutureAssignedPuzzle[] = [];

  // Try to load the next few months of assigned puzzles
  const now = new Date();
  const months: string[] = [];

  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    months.push(`${year}-${month}`);
  }

  for (const month of months) {
    try {
      const response = await fetch(`/puzzles/assigned/${month}.json`);
      if (!response.ok) continue;

      const data = await response.json();
      const puzzles = data.puzzles || {};

      for (const [numStr, puzzle] of Object.entries(puzzles)) {
        const puzzleNumber = parseInt(numStr, 10);
        // Only include future puzzles
        if (puzzleNumber > todayNumber) {
          results.push({
            puzzleNumber,
            puzzle: puzzle as PoolPuzzle,
          });
        }
      }
    } catch {
      // Month file doesn't exist, continue
    }
  }

  // Sort by puzzle number
  results.sort((a, b) => a.puzzleNumber - b.puzzleNumber);
  return results;
}

/**
 * Update puzzle status in pool.json
 * Note: This is a client-side function that requires a server endpoint to actually persist changes
 */
export async function updatePuzzleStatus(
  puzzleId: string,
  status: 'pending' | 'approved' | 'rejected'
): Promise<boolean> {
  try {
    const response = await fetch('/api/debug/update-puzzle-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzleId, status }),
    });
    return response.ok;
  } catch (error) {
    console.error('Failed to update puzzle status:', error);
    return false;
  }
}
