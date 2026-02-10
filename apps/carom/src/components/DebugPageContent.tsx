'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, NavBar, GameContainer } from '@grid-games/ui';
import { caromConfig } from '@/config';
import { getPoolPuzzles, getFutureAssignedPuzzles } from '@/lib/puzzleGenerator';
import { BOARD_SIZE } from '@/constants/gameConfig';
import {
  PrecomputedPuzzle,
  Direction,
  WallFlags,
  WALL_TOP,
  WALL_RIGHT,
  WALL_BOTTOM,
  WALL_LEFT,
  PieceType,
} from '@/types';

interface PoolPuzzle extends PrecomputedPuzzle {
  id: string;
}

// Simple board preview component (read-only)
interface BoardPreviewProps {
  walls: WallFlags[][];
  goal: { row: number; col: number };
  pieces: { id: string; type: PieceType; row: number; col: number }[];
}

function BoardPreview({ walls, goal, pieces }: BoardPreviewProps) {
  return (
    <div className="w-full aspect-square bg-[var(--background)] rounded-lg overflow-hidden border-[3px] border-[var(--wall-color)] relative">
      {/* Grid cells */}
      <div
        className="grid h-full"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
        }}
      >
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, index) => {
          const row = Math.floor(index / BOARD_SIZE);
          const col = index % BOARD_SIZE;
          const cellWalls = walls[row][col];
          const isGoal = goal.row === row && goal.col === col;

          // Wall classes
          const wallClasses: string[] = [];
          if ((cellWalls & WALL_TOP) !== 0) wallClasses.push('border-t-2 border-t-[var(--wall-color)]');
          if ((cellWalls & WALL_RIGHT) !== 0) wallClasses.push('border-r-2 border-r-[var(--wall-color)]');
          if ((cellWalls & WALL_BOTTOM) !== 0) wallClasses.push('border-b-2 border-b-[var(--wall-color)]');
          if ((cellWalls & WALL_LEFT) !== 0) wallClasses.push('border-l-2 border-l-[var(--wall-color)]');

          return (
            <div
              key={`${row}-${col}`}
              className={`
                relative border border-[var(--cell-border)]
                ${isGoal ? 'bg-[var(--goal-bg)]' : 'bg-[var(--cell-bg)]'}
                ${wallClasses.join(' ')}
              `}
            >
              {isGoal && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-4 h-4 sm:w-6 sm:h-6 text-[var(--accent)] opacity-60" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pieces overlay */}
      {pieces.map((piece) => {
        const isTarget = piece.type === 'target';
        const gradient = isTarget
          ? 'radial-gradient(circle at 30% 30%, #fbbf24, #f59e0b 60%)'
          : 'radial-gradient(circle at 30% 30%, #60a5fa, #3b82f6 60%)';

        return (
          <div
            key={piece.id}
            className="absolute rounded-lg"
            style={{
              width: `${(100 / BOARD_SIZE) * 0.6}%`,
              height: `${(100 / BOARD_SIZE) * 0.6}%`,
              top: `${(piece.row / BOARD_SIZE) * 100 + (100 / BOARD_SIZE) * 0.2}%`,
              left: `${(piece.col / BOARD_SIZE) * 100 + (100 / BOARD_SIZE) * 0.2}%`,
              background: gradient,
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            }}
          />
        );
      })}
    </div>
  );
}

type PuzzleEntry =
  | { type: 'pool'; puzzle: PoolPuzzle }
  | { type: 'assigned'; puzzleNumber: number; puzzle: PrecomputedPuzzle };

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
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
        navBar={<NavBar title="Debug" gameId={caromConfig.id} />}
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
        navBar={<NavBar title="Debug" gameId={caromConfig.id} />}
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
        navBar={<NavBar title="Debug" gameId={caromConfig.id} />}
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

  return (
    <GameContainer
      maxWidth="md"
      navBar={<NavBar title="Debug - Puzzle Browser" gameId={caromConfig.id} />}
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
        <div className="w-full max-w-[280px]">
          <BoardPreview
            walls={puzzle.walls}
            goal={puzzle.goal}
            pieces={puzzle.pieces}
          />
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
              <span className="text-[var(--muted)]">Optimal Moves:</span>{' '}
              <span className="font-bold text-[var(--accent)]">{puzzle.optimalMoves}</span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Pieces:</span>{' '}
              <span>{puzzle.pieces.length}</span>
            </div>
          </div>

          {/* Solution Path */}
          {puzzle.solutionPath && puzzle.solutionPath.length > 0 && (
            <div className="pt-2 border-t border-[var(--border)]">
              <div className="text-[var(--muted)] text-sm mb-1">Solution Path:</div>
              <div className="text-xs font-mono bg-[var(--background)] rounded p-2 overflow-x-auto">
                {puzzle.solutionPath.map((m: { pieceId: string; direction: Direction }, i: number) => (
                  <span key={i}>
                    {i > 0 && <span className="text-[var(--muted)]"> → </span>}
                    <span className={m.pieceId === 'target' ? 'text-[var(--accent)]' : 'text-blue-400'}>
                      {m.pieceId}
                    </span>
                    <span className="text-[var(--muted)]"> {m.direction}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Play Button */}
        <Button variant="primary" size="lg" onClick={handlePlay}>
          Play This Puzzle
        </Button>
      </div>
    </GameContainer>
  );
}
