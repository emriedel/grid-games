'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArchivePage } from '@grid-games/ui';
import { verifyPuzzleIdMatch } from '@grid-games/shared';
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

  // Load puzzle IDs from monthly files
  useEffect(() => {
    async function loadPuzzleIds() {
      if (todayPuzzleNumber <= 1) {
        setIsLoading(false);
        return;
      }

      try {
        const ids = await getPuzzleIdsForRange(1, todayPuzzleNumber - 1);
        setPuzzleIds(ids);
      } catch (error) {
        console.warn('[jumble] Failed to load puzzle IDs for archive:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPuzzleIds();
  }, [todayPuzzleNumber]);

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
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-xl text-[var(--foreground)]">Loading archive...</div>
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
      backHref="/"
    />
  );
}
