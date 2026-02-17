'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArchivePage, Skeleton } from '@grid-games/ui';
import {
  isPuzzleCompleted,
  isPuzzleInProgress,
  getTodayPuzzleNumber,
  getSavedPuzzleId,
  findPuzzleState,
} from '@/lib/storage';
import { PUZZLE_BASE_DATE_STRING } from '@/config';
import { loadPuzzleIdsForRange } from '@/lib/puzzleLoader';

export function ArchivePageContent() {
  const router = useRouter();
  const todayPuzzleNumber = getTodayPuzzleNumber();
  const [puzzleIds, setPuzzleIds] = useState<Map<number, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Load puzzleIds from monthly files
  useEffect(() => {
    async function loadPuzzleIds() {
      if (todayPuzzleNumber <= 1) {
        setIsLoading(false);
        return;
      }
      try {
        const ids = await loadPuzzleIdsForRange(1, todayPuzzleNumber - 1);
        setPuzzleIds(ids);
      } catch (error) {
        console.warn('[tessera] Failed to load puzzle IDs for archive:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadPuzzleIds();
  }, [todayPuzzleNumber]);

  const handleSelectPuzzle = useCallback((puzzleNumber: number) => {
    router.push(`/?puzzle=${puzzleNumber}`);
  }, [router]);

  // Create wrapper functions that check puzzleId matches
  const checkPuzzleCompleted = useCallback((puzzleNumber: number): boolean => {
    const currentPuzzleId = puzzleIds.get(puzzleNumber);
    const savedPuzzleId = getSavedPuzzleId(puzzleNumber);

    // Only show as completed if puzzleIds match (or both undefined for legacy)
    const puzzleIdMatches = currentPuzzleId === undefined || savedPuzzleId === currentPuzzleId;
    return puzzleIdMatches && isPuzzleCompleted(puzzleNumber, currentPuzzleId);
  }, [puzzleIds]);

  const checkPuzzleInProgress = useCallback((puzzleNumber: number): boolean => {
    const currentPuzzleId = puzzleIds.get(puzzleNumber);
    const savedPuzzleId = getSavedPuzzleId(puzzleNumber);

    const puzzleIdMatches = currentPuzzleId === undefined || savedPuzzleId === currentPuzzleId;
    return puzzleIdMatches && isPuzzleInProgress(puzzleNumber, currentPuzzleId);
  }, [puzzleIds]);

  // Get "stars" - for Tessera, 1 star for completion
  const getPuzzleStarsWrapper = useCallback((puzzleNumber: number): number => {
    const currentPuzzleId = puzzleIds.get(puzzleNumber);
    const savedPuzzleId = getSavedPuzzleId(puzzleNumber);

    // Only return stars if puzzleIds match
    if (currentPuzzleId !== undefined && savedPuzzleId !== currentPuzzleId) {
      return 0;
    }

    const state = findPuzzleState(puzzleNumber);
    if (state?.status !== 'completed') return 0;

    // Tessera always awards 1 star for completion
    return 1;
  }, [puzzleIds]);

  // Score - for Tessera, return number of pieces placed (null if not completed)
  const getPuzzleScoreWrapper = useCallback((puzzleNumber: number): number | null => {
    const currentPuzzleId = puzzleIds.get(puzzleNumber);
    const savedPuzzleId = getSavedPuzzleId(puzzleNumber);

    // Only return score if puzzleIds match
    if (currentPuzzleId !== undefined && savedPuzzleId !== currentPuzzleId) {
      return null;
    }

    const state = findPuzzleState(puzzleNumber);
    if (state?.status !== 'completed') return null;

    // Return pieces placed count
    return state.data.placedPieces?.length ?? 0;
  }, [puzzleIds]);

  // Format score - show pieces count
  const formatScore = useCallback((score: number): string => {
    return `${score} pieces`;
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background,#0a0a0a)] flex flex-col items-center">
        <div className="w-full max-w-md mx-auto flex items-center justify-center px-4 py-3 border-b border-[var(--border,#27272a)]">
          <h1 className="text-lg font-bold text-[var(--foreground,#ededed)]">
            Tessera Archive
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
      gameName="Tessera"
      gameId="tessera"
      baseDate={PUZZLE_BASE_DATE_STRING}
      todayPuzzleNumber={todayPuzzleNumber}
      isPuzzleCompleted={checkPuzzleCompleted}
      isPuzzleInProgress={checkPuzzleInProgress}
      getPuzzleStars={getPuzzleStarsWrapper}
      getPuzzleScore={getPuzzleScoreWrapper}
      formatScore={formatScore}
      onSelectPuzzle={handleSelectPuzzle}
      backHref="/"
    />
  );
}
