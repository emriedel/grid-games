'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArchivePage } from '@grid-games/ui';
import { isPuzzleCompleted, isPuzzleInProgress, getPuzzleStars, getPuzzleScore, getTodayPuzzleNumber } from '@/lib/storage';
import { PUZZLE_BASE_DATE_STRING } from '@/config';

export function ArchivePageContent() {
  const router = useRouter();

  const handleSelectPuzzle = useCallback((puzzleNumber: number) => {
    router.push(`/?puzzle=${puzzleNumber}`);
  }, [router]);

  return (
    <ArchivePage
      gameName="Dabble"
      gameId="dabble"
      baseDate={PUZZLE_BASE_DATE_STRING}
      todayPuzzleNumber={getTodayPuzzleNumber()}
      isPuzzleCompleted={isPuzzleCompleted}
      isPuzzleInProgress={isPuzzleInProgress}
      getPuzzleStars={getPuzzleStars}
      getPuzzleScore={getPuzzleScore}
      onSelectPuzzle={handleSelectPuzzle}
      backHref="/"
    />
  );
}
