'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, NavBar, GameContainer } from '@grid-games/ui';
import { inlayConfig } from '@/config';
import { getPoolPuzzles, getFutureAssignedPuzzles } from '@/lib/puzzleLoader';
import { PENTOMINOES } from '@/constants/pentominoes';
import type { Puzzle, PentominoId } from '@/types';

// Simple board preview component (read-only)
function BoardPreview({ shape, pieces }: { shape: boolean[][]; pieces: PentominoId[] }) {
  const rows = shape.length;
  const cols = shape[0]?.length ?? 0;

  return (
    <div
      className="grid gap-0.5 p-1.5 bg-neutral-800 rounded-lg w-full"
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
      }}
    >
      {shape.flat().map((isPlayable, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;

        if (!isPlayable) {
          return (
            <div
              key={`${row}-${col}`}
              className="aspect-square w-full bg-neutral-900 rounded-sm"
            />
          );
        }

        return (
          <div
            key={`${row}-${col}`}
            className="aspect-square w-full bg-[var(--cell-playable)] rounded-sm"
          />
        );
      })}
    </div>
  );
}

// Piece preview component
function PiecePreview({ pentominoId }: { pentominoId: PentominoId }) {
  const pentomino = PENTOMINOES[pentominoId];
  const cells = pentomino.rotations[0]; // Show default rotation
  const maxRow = Math.max(...cells.map((c) => c.row));
  const maxCol = Math.max(...cells.map((c) => c.col));
  const gridSize = Math.max(maxRow, maxCol) + 1;

  // Create grid
  const grid: boolean[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(false));
  for (const cell of cells) {
    grid[cell.row][cell.col] = true;
  }

  return (
    <div
      className="grid gap-[1px] p-1"
      style={{
        gridTemplateColumns: `repeat(${gridSize}, 8px)`,
      }}
    >
      {grid.flat().map((filled, index) => (
        <div
          key={index}
          className="aspect-square rounded-[1px]"
          style={{
            backgroundColor: filled ? pentomino.color : 'transparent',
          }}
        />
      ))}
    </div>
  );
}

type PuzzleEntry =
  | { type: 'pool'; puzzle: Puzzle }
  | { type: 'assigned'; puzzleNumber: number; puzzle: Puzzle };

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
        navBar={<NavBar title="Debug" gameId={inlayConfig.id} />}
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
        navBar={<NavBar title="Debug" gameId={inlayConfig.id} />}
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
        navBar={<NavBar title="Debug" gameId={inlayConfig.id} />}
      >
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
          <div className="text-xl text-[var(--muted)]">
            No unpublished puzzles found.
          </div>
          <div className="text-sm text-[var(--muted)] mt-2">
            Run{' '}
            <code className="bg-[var(--muted)] px-1 rounded">
              npx tsx scripts/generatePuzzles.ts
            </code>{' '}
            to generate some.
          </div>
        </div>
      </GameContainer>
    );
  }

  const currentEntry = puzzles[currentIndex];
  const puzzle = currentEntry.puzzle;

  return (
    <GameContainer
      maxWidth="md"
      navBar={<NavBar title="Debug - Puzzle Browser" gameId={inlayConfig.id} />}
    >
      <div className="flex flex-col items-center gap-6 py-8 w-full max-w-md mx-auto px-4">
        {/* Navigation */}
        <div className="flex items-center gap-4 w-full justify-between">
          <Button variant="secondary" onClick={handlePrev} disabled={currentIndex === 0}>
            Prev
          </Button>
          <div className="text-center">
            <div className="text-lg font-bold">
              {currentIndex + 1} / {puzzles.length}
            </div>
            <div className="text-sm text-[var(--muted)]">
              {currentEntry.type === 'pool'
                ? 'Pool Puzzle'
                : `Puzzle #${currentEntry.puzzleNumber}`}
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
          <BoardPreview shape={puzzle.shape} pieces={puzzle.pentominoIds} />
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
                <span className="font-mono text-xs">{puzzle.id.substring(0, 8)}...</span>
              </div>
            )}
            {currentEntry.type === 'assigned' && (
              <div>
                <span className="text-[var(--muted)]">Puzzle #:</span>{' '}
                <span className="font-medium">{currentEntry.puzzleNumber}</span>
              </div>
            )}
            <div>
              <span className="text-[var(--muted)]">Shape:</span>{' '}
              <span className="font-medium">{puzzle.shapeName}</span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Pieces:</span>{' '}
              <span className="font-bold text-[var(--accent)]">{puzzle.pentominoIds.length}</span>
            </div>
          </div>

          {/* Pieces */}
          <div className="pt-2 border-t border-[var(--border)]">
            <div className="text-[var(--muted)] text-sm mb-2">Pentominoes:</div>
            <div className="flex flex-wrap gap-2">
              {puzzle.pentominoIds.map((id) => (
                <div
                  key={id}
                  className="flex flex-col items-center bg-neutral-800 rounded p-1"
                  title={`${id}-pentomino`}
                >
                  <PiecePreview pentominoId={id} />
                  <span className="text-xs font-mono mt-0.5">{id}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Board dimensions */}
          <div className="pt-2 border-t border-[var(--border)]">
            <div className="text-[var(--muted)] text-sm mb-1">Dimensions:</div>
            <div className="text-sm">
              {puzzle.shape.length} rows x {puzzle.shape[0]?.length ?? 0} cols ={' '}
              {puzzle.shape.flat().filter((c) => c).length} cells
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
