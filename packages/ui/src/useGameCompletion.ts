'use client';

import { useState, useEffect } from 'react';
import { GAMES } from '@grid-games/config';
import { isTodayCompletedForGame } from '@grid-games/shared';

/**
 * Hook to get completion status for all games
 * SSR-safe: returns empty map during SSR, hydrates on client
 */
export function useGameCompletion(): Map<string, boolean> {
  const [completionStatus, setCompletionStatus] = useState<Map<string, boolean>>(
    new Map()
  );

  useEffect(() => {
    // Only runs on client after hydration
    const statusMap = new Map<string, boolean>();

    for (const game of GAMES) {
      if (game.launchDate) {
        statusMap.set(game.id, isTodayCompletedForGame(game.id, game.launchDate));
      }
    }

    setCompletionStatus(statusMap);
  }, []);

  return completionStatus;
}
