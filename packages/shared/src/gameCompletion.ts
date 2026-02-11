import { getPuzzleNumber } from './date';

/**
 * Check if today's puzzle is completed for a given game
 * Scans localStorage for any key matching the game's puzzle pattern
 * SSR-safe: returns false when window is undefined
 */
export function isTodayCompletedForGame(
  gameId: string,
  launchDateString: string
): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const launchDate = new Date(launchDateString + 'T00:00:00');
    const todayPuzzleNumber = getPuzzleNumber(launchDate);

    // Scan localStorage for matching keys
    // Keys follow pattern: {gameId}-{puzzleNumber} or {gameId}-{puzzleNumber}-{puzzleId}
    const prefix = `${gameId}-${todayPuzzleNumber}`;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key === prefix || key.startsWith(`${prefix}-`))) {
        const stored = localStorage.getItem(key);
        if (stored) {
          const state = JSON.parse(stored);
          if (state?.status === 'completed') {
            return true;
          }
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}
