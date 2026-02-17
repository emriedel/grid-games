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
import { getPuzzleIdsForRange } from '@/lib/puzzleLoader';
import { GAME_CONFIG } from '@/constants';

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
        const ids = await getPuzzleIdsForRange(1, todayPuzzleNumber - 1);
        setPuzzleIds(ids);
      } catch (error) {
        console.warn('[trio] Failed to load puzzle IDs for archive:', error);
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

  // Get "stars" based on trios found (1 = found all 5, 0 = missed at least one)
  const getPuzzleStarsWrapper = useCallback((puzzleNumber: number): number => {
    const currentPuzzleId = puzzleIds.get(puzzleNumber);
    const savedPuzzleId = getSavedPuzzleId(puzzleNumber);

    // Only return stars if puzzleIds match
    if (currentPuzzleId !== undefined && savedPuzzleId !== currentPuzzleId) {
      return 0;
    }

    const state = findPuzzleState(puzzleNumber);
    if (state?.status !== 'completed') return 0;

    // Return 1 star if all 5 trios were found (no misses)
    const triosFound = state.data.roundOutcomes.filter(
      o => o === 'found' || o === 'found-with-hint'
    ).length;
    return triosFound === GAME_CONFIG.ROUND_COUNT ? 1 : 0;
  }, [puzzleIds]);

  // Get score - for Trio, show trios found
  const getPuzzleScoreWrapper = useCallback((puzzleNumber: number): number | null => {
    const currentPuzzleId = puzzleIds.get(puzzleNumber);
    const savedPuzzleId = getSavedPuzzleId(puzzleNumber);

    // Only return score if puzzleIds match
    if (currentPuzzleId !== undefined && savedPuzzleId !== currentPuzzleId) {
      return null;
    }

    const state = findPuzzleState(puzzleNumber);
    if (state?.status !== 'completed') return null;

    // Return trios found (found or found-with-hint)
    return state.data.roundOutcomes.filter(
      o => o === 'found' || o === 'found-with-hint'
    ).length;
  }, [puzzleIds]);

  // Format score as "X/5"
  const formatScore = useCallback((score: number): string => {
    return `${score}/${GAME_CONFIG.ROUND_COUNT}`;
  }, []);

  // Check if a puzzle was completed perfectly (all found without hints)
  const checkPerfectCompletion = useCallback((puzzleNumber: number): boolean => {
    const currentPuzzleId = puzzleIds.get(puzzleNumber);
    const savedPuzzleId = getSavedPuzzleId(puzzleNumber);

    // Only check if puzzleIds match
    if (currentPuzzleId !== undefined && savedPuzzleId !== currentPuzzleId) {
      return false;
    }

    const state = findPuzzleState(puzzleNumber);
    if (state?.status !== 'completed' || !state.data.roundOutcomes) return false;

    // Perfect = all 'found' (no hints, no misses)
    return state.data.roundOutcomes.every(o => o === 'found');
  }, [puzzleIds]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background,#0a0a0a)] flex flex-col items-center">
        <div className="w-full max-w-md mx-auto flex items-center justify-center px-4 py-3 border-b border-[var(--border,#27272a)]">
          <h1 className="text-lg font-bold text-[var(--foreground,#ededed)]">
            Trio Archive
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
      gameName="Trio"
      gameId="trio"
      baseDate={PUZZLE_BASE_DATE_STRING}
      todayPuzzleNumber={todayPuzzleNumber}
      isPuzzleCompleted={checkPuzzleCompleted}
      isPuzzleInProgress={checkPuzzleInProgress}
      getPuzzleStars={getPuzzleStarsWrapper}
      getPuzzleScore={getPuzzleScoreWrapper}
      formatScore={formatScore}
      onSelectPuzzle={handleSelectPuzzle}
      backHref="/"
      statusDisplay="checkmark"
      isPerfectCompletion={checkPerfectCompletion}
    />
  );
}
