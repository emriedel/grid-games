'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, NavBar, GameContainer } from '@grid-games/ui';
import { dabbleConfig } from '@/config';
import { getPoolPuzzles, getFutureAssignedPuzzles } from '@/lib/puzzleGenerator';
import { STAR_THRESHOLDS, BONUS_COLORS } from '@/constants/gameConfig';
import type { BonusType } from '@/types';

interface CellData {
  row: number;
  col: number;
  bonus: BonusType;
  isPlayable: boolean;
}

interface BoardData {
  size: number;
  cells: CellData[][];
}

interface PoolPuzzle {
  id: string;
  archetype: string;
  letters: string[];
  board: BoardData;
  thresholds: {
    heuristicMax: number;
    star1: number;
    star2: number;
    star3: number;
  };
}

interface AssignedPuzzle {
  id: string;
  archetype: string;
  letters: string[];
  board: BoardData;
  thresholds: {
    heuristicMax: number;
    star1: number;
    star2: number;
    star3: number;
  };
}

// Simple board preview component (read-only)
function BoardPreview({ board }: { board: BoardData }) {
  return (
    <div
      className="grid gap-0.5 p-1.5 bg-neutral-800 rounded-lg w-full"
      style={{
        gridTemplateColumns: `repeat(${board.size}, 1fr)`,
      }}
    >
      {board.cells.flat().map((cell) => {
        if (!cell.isPlayable) {
          return (
            <div
              key={`${cell.row}-${cell.col}`}
              className="aspect-square w-full bg-neutral-900 rounded-sm"
            />
          );
        }

        const bonusStyle = cell.bonus ? BONUS_COLORS[cell.bonus] : null;

        return (
          <div
            key={`${cell.row}-${cell.col}`}
            className={`
              aspect-square w-full rounded-sm flex items-center justify-center
              ${bonusStyle ? `${bonusStyle.bg} ${bonusStyle.text}` : 'bg-neutral-700'}
            `}
          >
            {bonusStyle && (
              <span className="text-[6px] sm:text-[8px] font-semibold">{bonusStyle.label}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

type PuzzleEntry =
  | { type: 'pool'; puzzle: PoolPuzzle }
  | { type: 'assigned'; puzzleNumber: number; puzzle: AssignedPuzzle };

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

// Calculate star threshold values from heuristicMax
function getStarThresholdValues(heuristicMax: number): { star1: number; star2: number; star3: number } {
  return {
    star1: Math.round(heuristicMax * STAR_THRESHOLDS.star1Percent),
    star2: Math.round(heuristicMax * STAR_THRESHOLDS.star2Percent),
    star3: Math.round(heuristicMax * STAR_THRESHOLDS.star3Percent),
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
        puzzle: p as PoolPuzzle,
      }));

      // Load future assigned puzzles
      const futureAssigned = await getFutureAssignedPuzzles();
      const assignedEntries: PuzzleEntry[] = futureAssigned.map((p) => ({
        type: 'assigned' as const,
        puzzleNumber: p.puzzleNumber,
        puzzle: p.puzzle as AssignedPuzzle,
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
        navBar={<NavBar title="Debug" gameId={dabbleConfig.id} />}
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
        navBar={<NavBar title="Debug" gameId={dabbleConfig.id} />}
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
        navBar={<NavBar title="Debug" gameId={dabbleConfig.id} />}
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
  const puzzle = currentEntry.type === 'pool' ? currentEntry.puzzle : currentEntry.puzzle;
  const thresholdValues = getStarThresholdValues(puzzle.thresholds.heuristicMax);

  return (
    <GameContainer
      maxWidth="md"
      navBar={<NavBar title="Debug - Puzzle Browser" gameId={dabbleConfig.id} />}
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
              <span className="text-[var(--muted)]">Archetype:</span>{' '}
              <span className="font-medium capitalize">{puzzle.archetype}</span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Heuristic Max:</span>{' '}
              <span className="font-bold text-[var(--accent)]">{puzzle.thresholds.heuristicMax}</span>
            </div>
          </div>

          {/* Letters */}
          <div className="pt-2 border-t border-[var(--border)]">
            <div className="text-[var(--muted)] text-sm mb-2">Letters:</div>
            <div className="flex flex-wrap gap-1">
              {puzzle.letters.map((letter, i) => (
                <span
                  key={i}
                  className="w-7 h-7 flex items-center justify-center bg-[var(--accent)] text-[var(--accent-foreground)] rounded font-bold text-sm"
                >
                  {letter}
                </span>
              ))}
            </div>
          </div>

          {/* Star Thresholds */}
          <div className="pt-2 border-t border-[var(--border)]">
            <div className="text-[var(--muted)] text-sm mb-2">Star Thresholds:</div>
            <div className="flex justify-around text-center">
              <div>
                <div className="text-lg">★</div>
                <div className="text-sm text-[var(--accent)]">{thresholdValues.star1}+</div>
              </div>
              <div>
                <div className="text-lg">★★</div>
                <div className="text-sm text-[var(--accent)]">{thresholdValues.star2}+</div>
              </div>
              <div>
                <div className="text-lg">★★★</div>
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
