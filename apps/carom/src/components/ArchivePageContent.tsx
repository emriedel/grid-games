'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArchivePage } from '@grid-games/ui';
import { isPuzzleCompleted, isPuzzleInProgress, getTodayPuzzleNumber } from '@/lib/storage';

// Carom launched Jan 30, 2026
const PUZZLE_BASE_DATE = '2026-01-30';

export function ArchivePageContent() {
  const router = useRouter();

  const handleSelectPuzzle = useCallback((puzzleNumber: number) => {
    router.push(`/?puzzle=${puzzleNumber}`);
  }, [router]);

  return (
    <ArchivePage
      gameName="Carom"
      gameId="carom"
      baseDate={PUZZLE_BASE_DATE}
      todayPuzzleNumber={getTodayPuzzleNumber()}
      isPuzzleCompleted={isPuzzleCompleted}
      isPuzzleInProgress={isPuzzleInProgress}
      onSelectPuzzle={handleSelectPuzzle}
      backHref="/"
    />
  );
}
