'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, NavBar, GameContainer } from '@grid-games/ui';
import { jumbleConfig } from '@/config';
import { getPoolPuzzles, getFutureAssignedPuzzles, type AssignedPuzzle } from '@/lib/puzzleGenerator';
import { STAR_THRESHOLDS, formatStars } from '@/constants/gameConfig';
import type { Board } from '@/types';

// Simple board preview component (read-only)
function BoardPreview({ board }: { board: Board }) {
  return (
    <div
      className="grid gap-0.5 p-1.5 bg-neutral-800 rounded-lg w-full"
      style={{
        gridTemplateColumns: `repeat(${board.length}, 1fr)`,
      }}
    >
      {board.flat().map((letter, i) => (
        <div
          key={i}
          className="aspect-square w-full bg-[var(--tile-bg)] rounded-sm flex items-center justify-center text-[var(--foreground)] font-bold text-xs"
        >
          {letter === 'QU' ? 'Qu' : letter}
        </div>
      ))}
    </div>
  );
}

type PuzzleEntry =
  | { type: 'pool'; puzzle: AssignedPuzzle }
  | { type: 'assigned'; puzzleNumber: number; puzzle: AssignedPuzzle };

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

// Calculate star threshold values from maxPossibleScore
function getStarThresholdValues(maxPossibleScore: number): { star1: number; star2: number; star3: number } {
  return {
    star1: Math.round(maxPossibleScore * STAR_THRESHOLDS.star1Percent),
    star2: Math.round(maxPossibleScore * STAR_THRESHOLDS.star2Percent),
    star3: Math.round(maxPossibleScore * STAR_THRESHOLDS.star3Percent),
  };
}

export function DebugPageContent() {
  const router = useRouter();
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [puzzles, setPuzzles] = useState<PuzzleEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const allowed = isLocalhost();
    setIsAllowed(allowed);

    if (allowed) {
      loadPuzzles();
    } else {
      setIsLoading(false);
    }
  }, []);

  async function loadPuzzles() {
    setIsLoading(true);
    try {
      // Load pool puzzles
      const poolPuzzles = await getPoolPuzzles();
      const poolEntries: PuzzleEntry[] = poolPuzzles.map((p) => ({
        type: 'pool' as const,
        puzzle: p,
      }));

      // Load future assigned puzzles
      const futureAssigned = await getFutureAssignedPuzzles();
      const assignedEntries: PuzzleEntry[] = futureAssigned.map((p) => ({
        type: 'assigned' as const,
        puzzleNumber: p.puzzleNumber,
        puzzle: p.puzzle,
      }));

      // Combine: future assigned first (by number), then pool
      setPuzzles([...assignedEntries, ...poolEntries]);
    } catch (error) {
      console.error('Failed to load puzzles:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handlePrev = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    setCurrentIndex((i) => Math.min(puzzles.length - 1, i + 1));
  };

  const handlePlay = () => {
    const entry = puzzles[currentIndex];
    if (!entry) return;

    if (entry.type === 'pool') {
      router.push(`/?debug=true&poolId=${entry.puzzle.id}`);
    } else {
      router.push(`/?puzzle=${entry.puzzleNumber}&debug=true`);
    }
  };

  // Not allowed (not localhost)
  if (isAllowed === false) {
    return (
      <GameContainer
        maxWidth="md"
        navBar={<NavBar title="Debug" gameId={jumbleConfig.id} />}
      >
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
          <div className="text-2xl font-bold text-[var(--danger)] mb-4">
            Debug Mode Not Available
          </div>
          <div className="text-[var(--muted)]">
            Debug page is only available on localhost.
          </div>
        </div>
      </GameContainer>
    );
  }

  // Loading
  if (isLoading || isAllowed === null) {
    return (
      <GameContainer
        maxWidth="md"
        navBar={<NavBar title="Debug" gameId={jumbleConfig.id} />}
      >
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-xl text-[var(--foreground)]">Loading puzzles...</div>
        </div>
      </GameContainer>
    );
  }

  // No puzzles
  if (puzzles.length === 0) {
    return (
      <GameContainer
        maxWidth="md"
        navBar={<NavBar title="Debug" gameId={jumbleConfig.id} />}
      >
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
          <div className="text-xl text-[var(--muted)]">
            No unpublished puzzles found.
          </div>
          <div className="text-sm text-[var(--muted)] mt-2">
            Run <code className="bg-[var(--muted)] px-1 rounded">npm run generate-puzzles</code> to generate some.
          </div>
        </div>
      </GameContainer>
    );
  }

  const currentEntry = puzzles[currentIndex];
  const puzzle = currentEntry.puzzle;
  const thresholdValues = getStarThresholdValues(puzzle.maxPossibleScore);

  return (
    <GameContainer
      maxWidth="md"
      navBar={<NavBar title="Debug - Puzzle Browser" gameId={jumbleConfig.id} />}
    >
      <div className="flex flex-col items-center gap-6 py-8 w-full max-w-md mx-auto">
        {/* Navigation */}
        <div className="flex items-center gap-4 w-full justify-between">
          <Button
            variant="secondary"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            Prev
          </Button>
          <div className="text-center">
            <div className="text-lg font-bold">
              {currentIndex + 1} / {puzzles.length}
            </div>
            <div className="text-sm text-[var(--muted)]">
              {currentEntry.type === 'pool' ? 'Pool Puzzle' : `Puzzle #${currentEntry.puzzleNumber}`}
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={handleNext}
            disabled={currentIndex === puzzles.length - 1}
          >
            Next
          </Button>
        </div>

        {/* Board Preview */}
        <div className="w-full max-w-[240px]">
          <BoardPreview board={puzzle.board} />
        </div>

        {/* Puzzle Info Card */}
        <div className="w-full bg-[var(--tile-bg)] rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[var(--muted)]">Type:</span>{' '}
              <span className="font-medium">
                {currentEntry.type === 'pool' ? 'Pool (unassigned)' : 'Future Assigned'}
              </span>
            </div>
            {currentEntry.type === 'pool' && (
              <div>
                <span className="text-[var(--muted)]">ID:</span>{' '}
                <span className="font-mono text-xs">{currentEntry.puzzle.id}</span>
              </div>
            )}
            {currentEntry.type === 'assigned' && (
              <div>
                <span className="text-[var(--muted)]">Puzzle #:</span>{' '}
                <span className="font-medium">{currentEntry.puzzleNumber}</span>
              </div>
            )}
            <div>
              <span className="text-[var(--muted)]">Total Words:</span>{' '}
              <span className="font-medium">{puzzle.debug.totalValidWords}</span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Max Score:</span>{' '}
              <span className="font-bold text-[var(--accent)]">{puzzle.maxPossibleScore}</span>
            </div>
          </div>

          {/* Longest Words */}
          {puzzle.debug.longestWords.length > 0 && (
            <div className="pt-2 border-t border-[var(--border)]">
              <div className="text-[var(--muted)] text-sm mb-2">Longest Words:</div>
              <div className="flex flex-wrap gap-1">
                {puzzle.debug.longestWords.slice(0, 5).map((word, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 text-xs bg-[var(--accent)]/20 text-[var(--accent)] rounded"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Star Thresholds */}
          <div className="pt-2 border-t border-[var(--border)]">
            <div className="text-[var(--muted)] text-sm mb-2">Star Thresholds:</div>
            <div className="flex justify-around text-center">
              <div>
                <div className="text-lg">{formatStars(1)}</div>
                <div className="text-sm text-[var(--accent)]">{thresholdValues.star1}+</div>
              </div>
              <div>
                <div className="text-lg">{formatStars(2)}</div>
                <div className="text-sm text-[var(--accent)]">{thresholdValues.star2}+</div>
              </div>
              <div>
                <div className="text-lg">{formatStars(3)}</div>
                <div className="text-sm text-[var(--accent)]">{thresholdValues.star3}+</div>
              </div>
            </div>
          </div>
        </div>

        {/* Play Button */}
        <Button variant="primary" size="lg" onClick={handlePlay}>
          Play This Puzzle
        </Button>
      </div>
    </GameContainer>
  );
}
