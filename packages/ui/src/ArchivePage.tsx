'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { NavBar } from './NavBar';
import { HamburgerMenu } from './HamburgerMenu';

export interface ArchivePageProps {
  /** Game display name */
  gameName: string;
  /** Game ID for menu highlighting */
  gameId: string;
  /** Base date for puzzle numbering (YYYY-MM-DD) */
  baseDate: string;
  /** Today's puzzle number (determines archive range: 1 to todayNumber-1) */
  todayPuzzleNumber: number;
  /** Function to check if a puzzle number is completed */
  isPuzzleCompleted: (puzzleNumber: number) => boolean;
  /** Function to check if a puzzle number is in progress (optional) */
  isPuzzleInProgress?: (puzzleNumber: number) => boolean;
  /** Function to get star count for a completed puzzle (optional, 0-3) */
  getPuzzleStars?: (puzzleNumber: number) => number;
  /** Function to get score for a completed puzzle (optional) */
  getPuzzleScore?: (puzzleNumber: number) => number | null;
  /** Custom formatter for score display (optional, defaults to showing raw number) */
  formatScore?: (score: number) => string;
  /** Callback when user selects a puzzle */
  onSelectPuzzle: (puzzleNumber: number) => void;
  /** URL to navigate back to the game */
  backHref: string;
  /** Display mode for completion status: 'stars' (default) or 'checkmark' */
  statusDisplay?: 'stars' | 'checkmark';
  /** For 'checkmark' mode: is this a "perfect" completion? Shows trophy instead of checkmark */
  isPerfectCompletion?: (puzzleNumber: number) => boolean;
  /** For 'checkmark' mode: did the user cheat? Shows skull instead of checkmark */
  isCheating?: (puzzleNumber: number) => boolean;
  /** Optional suffix to display after the status icon (e.g., hint emojis) */
  getStatusSuffix?: (puzzleNumber: number) => string;
  /** Available months with puzzles, newest first (e.g., ["2026-03", "2026-02"]) */
  availableMonths?: string[];
  /** Puzzle entries by month (alternative to baseDate calculation) */
  getPuzzlesForMonth?: (month: string) => Array<{ puzzleNumber: number; date: string }>;
}

interface ArchiveEntry {
  number: number;
  date: string;
  isCompleted: boolean;
  isInProgress: boolean;
  stars: number;
  score: number | null;
  isPerfect: boolean;
  isCheating: boolean;
  statusSuffix: string;
}

/**
 * Full-page archive listing component
 * Shows all past puzzles with completion status
 */
export function ArchivePage({
  gameName,
  gameId,
  baseDate,
  todayPuzzleNumber,
  isPuzzleCompleted,
  isPuzzleInProgress,
  getPuzzleStars,
  getPuzzleScore,
  formatScore,
  onSelectPuzzle,
  backHref,
  statusDisplay = 'stars',
  isPerfectCompletion,
  isCheating,
  getStatusSuffix,
  availableMonths,
  getPuzzlesForMonth,
}: ArchivePageProps) {
  // State for monthly pagination
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0);

  // If availableMonths is provided, use monthly pagination
  const useMonthlyPagination = availableMonths && availableMonths.length > 0;
  const currentMonth = useMonthlyPagination ? availableMonths[currentMonthIndex] : null;
  const hasPrevMonth = useMonthlyPagination && currentMonthIndex < availableMonths.length - 1;
  const hasNextMonth = useMonthlyPagination && currentMonthIndex > 0;

  // Format month for display (e.g., "2026-02" -> "February 2026")
  const formatMonth = (month: string): string => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  // Calculate archive entries (puzzle #1 to yesterday's puzzle)
  const archiveEntries = useMemo(() => {
    const entries: ArchiveEntry[] = [];

    // If using monthly pagination with getPuzzlesForMonth, use that
    if (useMonthlyPagination && currentMonth && getPuzzlesForMonth) {
      const monthPuzzles = getPuzzlesForMonth(currentMonth);
      // Sort by puzzle number descending (newest first)
      const sortedPuzzles = [...monthPuzzles].sort((a, b) => b.puzzleNumber - a.puzzleNumber);

      for (const { puzzleNumber: num, date } of sortedPuzzles) {
        // Skip today's puzzle and future puzzles
        if (num >= todayPuzzleNumber) continue;

        const isCompleted = isPuzzleCompleted(num);
        entries.push({
          number: num,
          date,
          isCompleted,
          isInProgress: isPuzzleInProgress?.(num) ?? false,
          stars: isCompleted && getPuzzleStars ? getPuzzleStars(num) : 0,
          score: isCompleted && getPuzzleScore ? getPuzzleScore(num) : null,
          isPerfect: isCompleted && isPerfectCompletion ? isPerfectCompletion(num) : false,
          isCheating: isCompleted && isCheating ? isCheating(num) : false,
          statusSuffix: isCompleted && getStatusSuffix ? getStatusSuffix(num) : '',
        });
      }
    } else {
      // Legacy mode: calculate from baseDate
      const baseDateObj = new Date(baseDate + 'T00:00:00');

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

        const isCompleted = isPuzzleCompleted(num);
        entries.push({
          number: num,
          date: dateStr,
          isCompleted,
          isInProgress: isPuzzleInProgress?.(num) ?? false,
          stars: isCompleted && getPuzzleStars ? getPuzzleStars(num) : 0,
          score: isCompleted && getPuzzleScore ? getPuzzleScore(num) : null,
          isPerfect: isCompleted && isPerfectCompletion ? isPerfectCompletion(num) : false,
          isCheating: isCompleted && isCheating ? isCheating(num) : false,
          statusSuffix: isCompleted && getStatusSuffix ? getStatusSuffix(num) : '',
        });
      }
    }

    return entries;
  }, [baseDate, todayPuzzleNumber, isPuzzleCompleted, isPuzzleInProgress, getPuzzleStars, getPuzzleScore, isPerfectCompletion, isCheating, getStatusSuffix, useMonthlyPagination, currentMonth, getPuzzlesForMonth]);

  return (
    <div className="min-h-screen bg-[var(--background,#0a0a0a)] flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between px-4 py-3 border-b border-[var(--border,#27272a)]">
        {/* Menu button */}
        <HamburgerMenu currentGameId={gameId} />

        {/* Title */}
        <h1 className="text-lg font-bold text-[var(--foreground,#ededed)]">
          {gameName} Archive
        </h1>

        {/* Back button */}
        <a
          href={backHref}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--tile-bg,#1a1a2e)] hover:bg-[var(--tile-bg-selected,#4a4a6e)] transition-colors"
          aria-label={`Back to ${gameName}`}
        >
          <ArrowLeft size={18} className="text-[var(--foreground,#ededed)]" />
        </a>
      </div>

      {/* Content container with max width */}
      <div className="w-full max-w-md flex-1 flex flex-col px-4">

        {/* Month navigation (if using pagination) */}
        {useMonthlyPagination && currentMonth && (
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => setCurrentMonthIndex(i => i + 1)}
              disabled={!hasPrevMonth}
              className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--tile-bg)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold text-[var(--foreground,#ededed)]">
              {formatMonth(currentMonth)}
            </span>
            <button
              onClick={() => setCurrentMonthIndex(i => i - 1)}
              disabled={!hasNextMonth}
              className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--tile-bg)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}

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
                    onClick={() => onSelectPuzzle(entry.number)}
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
                        {entry.score !== null && (
                          <>
                            <span className="text-[var(--muted,#a1a1aa)]">
                              {formatScore ? formatScore(entry.score) : entry.score}
                            </span>
                            <span className="text-lg text-[var(--muted,#a1a1aa)] opacity-50">·</span>
                          </>
                        )}
                        {statusDisplay === 'checkmark' ? (
                          // Checkmark/Trophy/Skull mode
                          <>
                            {entry.statusSuffix && (
                              <span className="mr-1">{entry.statusSuffix}</span>
                            )}
                            {entry.isCheating ? (
                              <span className="text-xl" title="Impossible!">💀</span>
                            ) : entry.isPerfect ? (
                              <span className="text-xl" title="Perfect!">🏆</span>
                            ) : (
                              <Check size={18} className="text-[var(--success,#22c55e)]" />
                            )}
                          </>
                        ) : (
                          // Stars mode (default)
                          <span className="text-[var(--accent)]">
                            {'★'.repeat(entry.stars)}{'☆'.repeat(3 - entry.stars)}
                          </span>
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
