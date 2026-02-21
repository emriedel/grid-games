'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArchivePage, Skeleton } from '@grid-games/ui';
import { getAvailableMonths, listPuzzlesForMonth, getTodayDateString } from '@grid-games/shared';
import {
  isPuzzleCompleted,
  isPuzzleInProgress,
  getTodayPuzzleNumber,
  didAchieveOptimal,
  getSavedPuzzleId,
  getPuzzleState,
} from '@/lib/storage';
import { getPuzzleIdsForRange } from '@/lib/puzzleGenerator';
import { CAROM_LAUNCH_DATE_STRING } from '@/config';

export function ArchivePageContent() {
  const router = useRouter();
  const todayPuzzleNumber = getTodayPuzzleNumber();
  const [puzzleIds, setPuzzleIds] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Get available months for pagination
  const availableMonths = useMemo(() => {
    const today = getTodayDateString();
    return getAvailableMonths(CAROM_LAUNCH_DATE_STRING, today);
  }, []);

  // State for monthly puzzle lists
  const [monthlyPuzzles, setMonthlyPuzzles] = useState<Map<string, Array<{ puzzleNumber: number; date: string }>>>(new Map());

  // Get puzzles for a specific month
  const getPuzzlesForMonth = useCallback((month: string): Array<{ puzzleNumber: number; date: string }> => {
    return monthlyPuzzles.get(month) || [];
  }, [monthlyPuzzles]);

  // Load puzzleIds from monthly files and monthly puzzle lists
  useEffect(() => {
    async function loadPuzzleData() {
      if (todayPuzzleNumber <= 1) {
        setIsLoading(false);
        return;
      }
      try {
        const ids = await getPuzzleIdsForRange(1, todayPuzzleNumber - 1);
        setPuzzleIds(ids);

        // Load puzzle lists for all available months
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const newMonthlyPuzzles = new Map<string, Array<{ puzzleNumber: number; date: string }>>();

        for (const month of availableMonths) {
          const list = await listPuzzlesForMonth(month, 'carom', basePath);
          const formattedList = list.map(entry => ({
            puzzleNumber: entry.puzzleNumber,
            date: new Date(entry.date + 'T00:00:00').toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
          }));
          newMonthlyPuzzles.set(month, formattedList);
        }

        setMonthlyPuzzles(newMonthlyPuzzles);
      } catch (error) {
        console.warn('[carom] Failed to load puzzle data for archive:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadPuzzleData();
  }, [todayPuzzleNumber, availableMonths]);

  const handleSelectPuzzle = useCallback(
    (puzzleNumber: number) => {
      router.push(`/?puzzle=${puzzleNumber}`);
    },
    [router]
  );

  // Check completion with puzzleId verification
  const checkPuzzleCompleted = useCallback(
    (puzzleNumber: number): boolean => {
      const currentPuzzleId = puzzleIds.get(puzzleNumber);
      const savedPuzzleId = getSavedPuzzleId(puzzleNumber);
      const puzzleIdMatches = currentPuzzleId === savedPuzzleId;
      return puzzleIdMatches && isPuzzleCompleted(puzzleNumber, currentPuzzleId);
    },
    [puzzleIds]
  );

  // Check in-progress with puzzleId verification
  const checkPuzzleInProgress = useCallback(
    (puzzleNumber: number): boolean => {
      const currentPuzzleId = puzzleIds.get(puzzleNumber);
      const savedPuzzleId = getSavedPuzzleId(puzzleNumber);
      const puzzleIdMatches = currentPuzzleId === savedPuzzleId;
      return puzzleIdMatches && isPuzzleInProgress(puzzleNumber, currentPuzzleId);
    },
    [puzzleIds]
  );

  // Check if achieved optimal (for trophy display)
  const checkPerfectCompletion = useCallback(
    (puzzleNumber: number): boolean => {
      const currentPuzzleId = puzzleIds.get(puzzleNumber);
      const savedPuzzleId = getSavedPuzzleId(puzzleNumber);
      if (currentPuzzleId !== savedPuzzleId) return false;

      // Also need to verify not cheating
      const state = getPuzzleState(puzzleNumber, currentPuzzleId);
      if (state?.status === 'completed' && state.data.optimalMoves !== undefined) {
        const isCheating = state.data.moveCount < state.data.optimalMoves;
        if (isCheating) return false;
      }

      return didAchieveOptimal(puzzleNumber, currentPuzzleId);
    },
    [puzzleIds]
  );

  // Check for cheating (moveCount < optimalMoves)
  const checkIsCheating = useCallback(
    (puzzleNumber: number): boolean => {
      const currentPuzzleId = puzzleIds.get(puzzleNumber);
      const savedPuzzleId = getSavedPuzzleId(puzzleNumber);
      if (currentPuzzleId !== savedPuzzleId) return false;

      const state = getPuzzleState(puzzleNumber, currentPuzzleId);
      if (state?.status === 'completed' && state.data.optimalMoves !== undefined) {
        return state.data.moveCount < state.data.optimalMoves;
      }
      return false;
    },
    [puzzleIds]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background,#0a0a0a)] flex flex-col items-center">
        <div className="w-full max-w-md mx-auto flex items-center justify-center px-4 py-3 border-b border-[var(--border,#27272a)]">
          <h1 className="text-lg font-bold text-[var(--foreground,#ededed)]">
            Carom Archive
          </h1>
        </div>
        <div className="w-full max-w-md flex-1 flex flex-col px-4 py-4">
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ArchivePage
      gameName="Carom"
      gameId="carom"
      baseDate={CAROM_LAUNCH_DATE_STRING}
      todayPuzzleNumber={todayPuzzleNumber}
      isPuzzleCompleted={checkPuzzleCompleted}
      isPuzzleInProgress={checkPuzzleInProgress}
      onSelectPuzzle={handleSelectPuzzle}
      backHref="/carom"
      statusDisplay="checkmark"
      isPerfectCompletion={checkPerfectCompletion}
      isCheating={checkIsCheating}
      availableMonths={availableMonths}
      getPuzzlesForMonth={getPuzzlesForMonth}
    />
  );
}
