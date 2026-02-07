'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArchivePage } from '@grid-games/ui';
import { isPuzzleCompleted, isPuzzleInProgress, getPuzzleStars, getTodayPuzzleNumber } from '@/lib/storage';

const PUZZLE_BASE_DATE = '2026-02-01';

export function ArchivePageContent() {
  const router = useRouter();

  const handleSelectPuzzle = useCallback((puzzleNumber: number) => {
    router.push(`/?puzzle=${puzzleNumber}`);
  }, [router]);

  return (
    <ArchivePage
      gameName="Dabble"
      gameId="dabble"
      baseDate={PUZZLE_BASE_DATE}
      todayPuzzleNumber={getTodayPuzzleNumber()}
      isPuzzleCompleted={isPuzzleCompleted}
      isPuzzleInProgress={isPuzzleInProgress}
      getPuzzleStars={getPuzzleStars}
      onSelectPuzzle={handleSelectPuzzle}
      backHref="/"
    />
  );
}
