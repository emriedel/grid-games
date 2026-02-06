'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Check, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Modal } from './Modal';

export interface ArchiveEntry {
  number: number;
  date: string;
  isCompleted: boolean;
  isInProgress: boolean;
}

export interface ArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Game name for display */
  gameName: string;
  /** Base date for puzzle numbering (YYYY-MM-DD) */
  baseDate: string;
  /** Today's puzzle number (determines archive range: 1 to todayNumber-1) */
  todayPuzzleNumber: number;
  /** Function to check if a puzzle number is completed */
  isPuzzleCompleted: (puzzleNumber: number) => boolean;
  /** Function to check if a puzzle number is in progress (optional) */
  isPuzzleInProgress?: (puzzleNumber: number) => boolean;
  /** Callback when user selects a puzzle */
  onSelectPuzzle: (puzzleNumber: number) => void;
}

const ITEMS_PER_PAGE = 14;

/**
 * Modal for browsing and selecting archive puzzles
 * Shows a scrollable list of past puzzles with completion status
 */
export function ArchiveModal({
  isOpen,
  onClose,
  gameName,
  baseDate,
  todayPuzzleNumber,
  isPuzzleCompleted,
  isPuzzleInProgress,
  onSelectPuzzle,
}: ArchiveModalProps) {
  // Calculate archive range (puzzle #1 to yesterday's puzzle)
  const archiveRange = useMemo(() => {
    const entries: ArchiveEntry[] = [];
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

      entries.push({
        number: num,
        date: dateStr,
        isCompleted: isPuzzleCompleted(num),
        isInProgress: isPuzzleInProgress?.(num) ?? false,
      });
    }

    return entries;
  }, [baseDate, todayPuzzleNumber, isPuzzleCompleted, isPuzzleInProgress]);

  // Pagination
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(archiveRange.length / ITEMS_PER_PAGE);
  const paginatedEntries = archiveRange.slice(
    page * ITEMS_PER_PAGE,
    (page + 1) * ITEMS_PER_PAGE
  );

  // Reset page when modal opens
  useEffect(() => {
    if (isOpen) {
      setPage(0);
    }
  }, [isOpen]);

  const handleSelect = (puzzleNumber: number) => {
    onSelectPuzzle(puzzleNumber);
    onClose();
  };

  if (archiveRange.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">
            {gameName} Archive
          </h2>
          <p className="text-[var(--muted)]">
            No archive puzzles available yet.
            <br />
            Check back tomorrow!
          </p>
          <button
            onClick={onClose}
            className="mt-6 px-4 py-2 rounded-lg bg-[var(--tile-bg)] text-[var(--foreground)] hover:bg-[var(--tile-bg-selected)] transition-colors"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <h2 className="text-xl font-bold text-[var(--foreground)] mb-2">
          {gameName} Archive
        </h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          {archiveRange.length} past {archiveRange.length === 1 ? 'puzzle' : 'puzzles'} available
        </p>

        {/* Puzzle list */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {paginatedEntries.map((entry) => (
            <button
              key={entry.number}
              onClick={() => handleSelect(entry.number)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-[var(--tile-bg)] hover:bg-[var(--tile-bg-selected)] transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-[var(--accent)] font-bold">
                  #{entry.number}
                </span>
                <span className="text-[var(--foreground)]">{entry.date}</span>
              </div>
              {entry.isCompleted ? (
                <Check size={18} className="text-[var(--success)]" />
              ) : entry.isInProgress ? (
                <Clock size={18} className="text-[var(--warning)]" />
              ) : null}
            </button>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--border)]">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--tile-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
              Newer
            </button>
            <span className="text-sm text-[var(--muted)]">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--tile-bg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Older
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
