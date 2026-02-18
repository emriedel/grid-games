'use client';

import { useCallback, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Clock } from 'lucide-react';
import { HamburgerMenu, Skeleton } from '@grid-games/ui';
import { isPuzzleCompleted, isPuzzleInProgress, getTodayPuzzleNumber, didAchieveOptimal, getSavedPuzzleId, getPuzzleState } from '@/lib/storage';
import { getPuzzleIdsForRange } from '@/lib/puzzleGenerator';

// Carom launched Feb 1, 2026
const PUZZLE_BASE_DATE = '2026-02-01';

interface ArchiveEntry {
  number: number;
  date: string;
  isCompleted: boolean;
  isInProgress: boolean;
  achievedOptimal: boolean;
  isCheating: boolean;
}

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
        console.warn('[carom] Failed to load puzzle IDs for archive:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadPuzzleIds();
  }, [todayPuzzleNumber]);

  const handleSelectPuzzle = useCallback((puzzleNumber: number) => {
    router.push(`/?puzzle=${puzzleNumber}`);
  }, [router]);

  // Calculate archive entries (puzzle #1 to yesterday's puzzle)
  // Uses puzzleIds to check completion for correct puzzle version
  const archiveEntries = useMemo(() => {
    const entries: ArchiveEntry[] = [];
    const baseDateObj = new Date(PUZZLE_BASE_DATE + 'T00:00:00');

    // Archive includes puzzles 1 through (todayNumber - 1)
    for (let num = todayPuzzleNumber - 1; num >= 1; num--) {
      // Calculate date for this puzzle number
      const puzzleDate = new Date(baseDateObj);
      puzzleDate.setDate(puzzleDate.getDate() + num - 1);

      const dateStr = puzzleDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // Get the current puzzleId for this puzzle number
      const currentPuzzleId = puzzleIds.get(num);
      // Get the saved puzzleId from localStorage
      const savedPuzzleId = getSavedPuzzleId(num);

      // Only show as completed if the puzzleIds match (handles both being undefined for legacy)
      // This ensures regenerated puzzles don't show old completion status
      const puzzleIdMatches = currentPuzzleId === savedPuzzleId;
      const isCompleted = puzzleIdMatches && isPuzzleCompleted(num, currentPuzzleId);
      const isInProgressState = puzzleIdMatches && isPuzzleInProgress(num, currentPuzzleId);

      // Check for cheating (moveCount < optimalMoves)
      let isCheating = false;
      if (isCompleted) {
        const state = getPuzzleState(num, currentPuzzleId);
        if (state?.status === 'completed' && state.data.optimalMoves !== undefined) {
          isCheating = state.data.moveCount < state.data.optimalMoves;
        }
      }

      entries.push({
        number: num,
        date: dateStr,
        isCompleted,
        isInProgress: isInProgressState,
        achievedOptimal: isCompleted && !isCheating && didAchieveOptimal(num, currentPuzzleId),
        isCheating,
      });
    }

    return entries;
  }, [todayPuzzleNumber, puzzleIds]);

  return (
    <div className="min-h-screen bg-[var(--background,#0a0a0a)] flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between px-4 py-3 border-b border-[var(--border,#27272a)]">
        {/* Menu button */}
        <HamburgerMenu currentGameId="carom" />

        {/* Title */}
        <h1 className="text-lg font-bold text-[var(--foreground,#ededed)]">
          Carom Archive
        </h1>

        {/* Spacer for centering */}
        <div className="w-8" />
      </div>

      {/* Content container with max width */}
      <div className="w-full max-w-md flex-1 flex flex-col px-4">
        {/* Back link */}
        <Link
          href="/"
          className="flex items-center gap-2 py-3 text-[var(--accent)] hover:underline"
        >
          <ArrowLeft size={16} />
          <span>Back to Carom</span>
        </Link>

        {/* Content */}
        <div className="flex-1 pb-8">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : archiveEntries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--muted,#a1a1aa)]">
                No archive puzzles available yet.
                <br />
                Check back tomorrow!
              </p>
            </div>
          ) : (
            <>
              {/* Puzzle list */}
              <div className="space-y-2">
                {archiveEntries.map((entry) => (
                  <button
                    key={entry.number}
                    onClick={() => handleSelectPuzzle(entry.number)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--tile-bg,#1a1a2e)] hover:bg-[var(--tile-bg-selected,#2a2a4e)] transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[var(--accent)] font-bold">
                        #{entry.number}
                      </span>
                      <span className="text-[var(--foreground,#ededed)]">{entry.date}</span>
                    </div>
                    {entry.isCompleted ? (
                      <div className="flex items-center gap-2">
                        {entry.isCheating ? (
                          <span className="text-xl" title="Impossible!">💀</span>
                        ) : entry.achievedOptimal ? (
                          <span className="text-xl" title="Optimal solution!">🏆</span>
                        ) : (
                          <Check size={18} className="text-[var(--success,#22c55e)]" />
                        )}
                      </div>
                    ) : entry.isInProgress ? (
                      <Clock size={18} className="text-[var(--warning,#f59e0b)]" />
                    ) : null}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
