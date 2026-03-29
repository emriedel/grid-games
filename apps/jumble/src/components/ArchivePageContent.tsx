'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArchivePage, Skeleton } from '@grid-games/ui';
import { verifyPuzzleIdMatch, getAvailableMonths, listPuzzlesForMonth, getTodayDateString } from '@grid-games/shared';
import {
  isPuzzleCompletedAny,
  isPuzzleInProgressAny,
  getSavedPuzzleId,
  getTodayPuzzleNumber,
  getPuzzleStars,
  getPuzzleScore,
} from '@/lib/storage';
import { getPuzzleIdsForRange } from '@/lib/puzzleGenerator';
import { PUZZLE_BASE_DATE_STRING } from '@/config';

export function ArchivePageContent() {
  const router = useRouter();
  const todayPuzzleNumber = getTodayPuzzleNumber();
  const [puzzleIds, setPuzzleIds] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Get available months for pagination
  const availableMonths = useMemo(() => {
    const today = getTodayDateString();
    return getAvailableMonths(PUZZLE_BASE_DATE_STRING, today);
  }, []);

  // State for monthly puzzle lists
  const [monthlyPuzzles, setMonthlyPuzzles] = useState<Map<string, Array<{ puzzleNumber: number; date: string }>>>(new Map());

  // Get puzzles for a specific month
  const getPuzzlesForMonth = useCallback((month: string): Array<{ puzzleNumber: number; date: string }> => {
    return monthlyPuzzles.get(month) || [];
  }, [monthlyPuzzles]);

  // Load puzzle IDs from monthly files and monthly puzzle lists
  useEffect(() => {
    async function loadPuzzleData() {
      if (todayPuzzleNumber <= 1) {
        setIsLoading(false);
        return;
      }

      try {
        // Load puzzle IDs for verification
        const ids = await getPuzzleIdsForRange(1, todayPuzzleNumber - 1);
        setPuzzleIds(ids);

        // Load puzzle lists for all available months
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
        const newMonthlyPuzzles = new Map<string, Array<{ puzzleNumber: number; date: string }>>();

        for (const month of availableMonths) {
          const list = await listPuzzlesForMonth(month, 'jumble', basePath);
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
        console.warn('[jumble] Failed to load puzzle data for archive:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPuzzleData();
  }, [todayPuzzleNumber, availableMonths]);

  // Check completion with puzzleId verification
  const checkPuzzleCompleted = useCallback(
    (puzzleNumber: number): boolean => {
      // Get the current puzzleId from monthly files
      const currentPuzzleId = puzzleIds.get(puzzleNumber);
      // Get the saved puzzleId from localStorage
      const savedPuzzleId = getSavedPuzzleId(puzzleNumber);

      // Verify the puzzleId matches (handles regenerated puzzles)
      const puzzleIdMatches = verifyPuzzleIdMatch(currentPuzzleId, savedPuzzleId);

      // Only show as completed if puzzleId matches and puzzle is completed
      return puzzleIdMatches && isPuzzleCompletedAny(puzzleNumber);
    },
    [puzzleIds]
  );

  // Check in-progress with puzzleId verification
  const checkPuzzleInProgress = useCallback(
    (puzzleNumber: number): boolean => {
      // Get the current puzzleId from monthly files
      const currentPuzzleId = puzzleIds.get(puzzleNumber);
      // Get the saved puzzleId from localStorage
      const savedPuzzleId = getSavedPuzzleId(puzzleNumber);

      // Verify the puzzleId matches
      const puzzleIdMatches = verifyPuzzleIdMatch(currentPuzzleId, savedPuzzleId);

      // Only show as in-progress if puzzleId matches
      return puzzleIdMatches && isPuzzleInProgressAny(puzzleNumber);
    },
    [puzzleIds]
  );

  // Get stars for a puzzle (only if puzzleId matches)
  const getVerifiedPuzzleStars = useCallback(
    (puzzleNumber: number): number => {
      const currentPuzzleId = puzzleIds.get(puzzleNumber);
      const savedPuzzleId = getSavedPuzzleId(puzzleNumber);

      if (!verifyPuzzleIdMatch(currentPuzzleId, savedPuzzleId)) {
        return 0;
      }

      return getPuzzleStars(puzzleNumber) ?? 0;
    },
    [puzzleIds]
  );

  // Get score for a puzzle (only if puzzleId matches)
  const getVerifiedPuzzleScore = useCallback(
    (puzzleNumber: number): number | null => {
      const currentPuzzleId = puzzleIds.get(puzzleNumber);
      const savedPuzzleId = getSavedPuzzleId(puzzleNumber);

      if (!verifyPuzzleIdMatch(currentPuzzleId, savedPuzzleId)) {
        return null;
      }

      return getPuzzleScore(puzzleNumber);
    },
    [puzzleIds]
  );

  const handleSelectPuzzle = useCallback(
    (puzzleNumber: number) => {
      router.push(`/?puzzle=${puzzleNumber}`);
    },
    [router]
  );

  // Show loading while fetching puzzle IDs
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background,#0a0a0a)] flex flex-col items-center">
        <div className="w-full max-w-md mx-auto flex items-center justify-center px-4 py-3 border-b border-[var(--border,#27272a)]">
          <h1 className="text-lg font-bold text-[var(--foreground,#ededed)]">
            Jumble Archive
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
      gameName="Jumble"
      gameId="jumble"
      baseDate={PUZZLE_BASE_DATE_STRING}
      todayPuzzleNumber={todayPuzzleNumber}
      isPuzzleCompleted={checkPuzzleCompleted}
      isPuzzleInProgress={checkPuzzleInProgress}
      getPuzzleStars={getVerifiedPuzzleStars}
      getPuzzleScore={getVerifiedPuzzleScore}
      onSelectPuzzle={handleSelectPuzzle}
      backHref="/jumble"
      availableMonths={availableMonths}
      getPuzzlesForMonth={getPuzzlesForMonth}
    />
  );
}
