/**
 * React hook for fetching top scores
 */

import { useState, useEffect } from 'react';
import { getTopScores, type TopScore } from './topScores';

export interface UseTopScoresResult {
  topScores: TopScore[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook to fetch and display top scores for a puzzle
 */
export function useTopScores(
  gameId: string,
  puzzleId: string | undefined
): UseTopScoresResult {
  const [topScores, setTopScores] = useState<TopScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    if (!puzzleId) {
      setTopScores([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    getTopScores(gameId, puzzleId)
      .then((scores) => {
        if (!cancelled) {
          setTopScores(scores);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [gameId, puzzleId, refetchKey]);

  const refetch = () => setRefetchKey((k) => k + 1);

  return { topScores, isLoading, error, refetch };
}
