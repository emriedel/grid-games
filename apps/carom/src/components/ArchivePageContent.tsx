'use client';

import { useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Clock } from 'lucide-react';
import { HamburgerMenu } from '@grid-games/ui';
import { isPuzzleCompletedAny, isPuzzleInProgressAny, getTodayPuzzleNumber, didAchieveOptimalAny } from '@/lib/storage';

// Carom launched Feb 1, 2026
const PUZZLE_BASE_DATE = '2026-02-01';

interface ArchiveEntry {
  number: number;
  date: string;
  isCompleted: boolean;
  isInProgress: boolean;
  achievedOptimal: boolean;
}

export function ArchivePageContent() {
  const router = useRouter();
  const todayPuzzleNumber = getTodayPuzzleNumber();

  const handleSelectPuzzle = useCallback((puzzleNumber: number) => {
    router.push(`/?puzzle=${puzzleNumber}`);
  }, [router]);

  // Calculate archive entries (puzzle #1 to yesterday's puzzle)
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

      const isCompleted = isPuzzleCompletedAny(num);
      entries.push({
        number: num,
        date: dateStr,
        isCompleted,
        isInProgress: isPuzzleInProgressAny(num),
        achievedOptimal: isCompleted && didAchieveOptimalAny(num),
      });
    }

    return entries;
  }, [todayPuzzleNumber]);

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
        <a
          href="/"
          className="flex items-center gap-2 py-3 text-[var(--accent)] hover:underline"
        >
          <ArrowLeft size={16} />
          <span>Back to Carom</span>
        </a>

        {/* Content */}
        <div className="flex-1 pb-8">
          {archiveEntries.length === 0 ? (
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
                        {entry.achievedOptimal ? (
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
