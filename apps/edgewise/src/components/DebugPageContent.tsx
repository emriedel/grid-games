'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button, NavBar, GameContainer } from '@grid-games/ui';
import { edgewiseConfig } from '@/config';
import { getPoolPuzzles, getFutureAssignedPuzzles, updatePuzzleStatus } from '@/lib/debugHelpers';
import type { PoolPuzzle, PoolPuzzleSquare, CategoryType } from '../../scripts/types';

interface FutureAssignedEntry {
  puzzleNumber: number;
  puzzle: PoolPuzzle;
}

type PuzzleEntry =
  | { type: 'pool'; puzzle: PoolPuzzle }
  | { type: 'assigned'; puzzleNumber: number; puzzle: PoolPuzzle };

// Preview component for a single square
function SquarePreview({ square, squareIndex }: { square: PoolPuzzleSquare; squareIndex: number }) {
  // Center-facing edges by square index (these are red herrings in solved position)
  const centerFacingEdges: Record<number, number[]> = {
    0: [1, 2], // right, bottom
    1: [2, 3], // bottom, left
    2: [0, 3], // top, left
    3: [0, 1], // top, right
  };

  const isCenterFacing = (edge: number) => centerFacingEdges[squareIndex]?.includes(edge);

  const getWordStyle = (edge: number): string =>
    isCenterFacing(edge)
      ? 'text-[var(--muted)] text-[8px] opacity-40'
      : 'text-[var(--foreground)] text-[10px]';

  return (
    <div
      className="relative bg-[var(--tile-bg)] border border-[var(--tile-border)] rounded aspect-square"
    >
      {/* Top word */}
      <div className="absolute top-0.5 left-0 right-0 flex justify-center">
        <span className={`font-bold ${getWordStyle(0)}`}>{square.top}</span>
      </div>
      {/* Right word */}
      <div className="absolute right-0.5 top-0 bottom-0 flex items-center justify-center">
        <span
          className={`font-bold ${getWordStyle(1)}`}
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          {square.right}
        </span>
      </div>
      {/* Bottom word */}
      <div className="absolute bottom-0.5 left-0 right-0 flex justify-center">
        <span className={`font-bold ${getWordStyle(2)}`}>{square.bottom}</span>
      </div>
      {/* Left word */}
      <div className="absolute left-0.5 top-0 bottom-0 flex items-center justify-center">
        <span
          className={`font-bold ${getWordStyle(3)}`}
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
        >
          {square.left}
        </span>
      </div>
    </div>
  );
}

// Preview of the full puzzle grid with categories
function PuzzlePreview({ puzzle }: { puzzle: PoolPuzzle }) {
  const { categories, squares } = puzzle;

  return (
    <div className="w-full max-w-[280px]">
      {/* Top category */}
      <div className="flex justify-center mb-1">
        <span className="text-xs font-semibold text-[var(--accent)] px-2 py-0.5 bg-[var(--accent)]/10 rounded">
          {categories.top}
        </span>
      </div>

      <div className="flex items-center gap-1">
        {/* Left category */}
        <div className="flex items-center justify-center w-16">
          <span
            className="text-xs font-semibold text-[var(--accent)] px-2 py-0.5 bg-[var(--accent)]/10 rounded"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
          >
            {categories.left}
          </span>
        </div>

        {/* 2x2 grid */}
        <div className="grid grid-cols-2 gap-1 flex-1">
          <SquarePreview square={squares[0]} squareIndex={0} />
          <SquarePreview square={squares[1]} squareIndex={1} />
          <SquarePreview square={squares[3]} squareIndex={3} />
          <SquarePreview square={squares[2]} squareIndex={2} />
        </div>

        {/* Right category */}
        <div className="flex items-center justify-center w-16">
          <span
            className="text-xs font-semibold text-[var(--accent)] px-2 py-0.5 bg-[var(--accent)]/10 rounded"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            {categories.right}
          </span>
        </div>
      </div>

      {/* Bottom category */}
      <div className="flex justify-center mt-1">
        <span className="text-xs font-semibold text-[var(--accent)] px-2 py-0.5 bg-[var(--accent)]/10 rounded">
          {categories.bottom}
        </span>
      </div>
    </div>
  );
}

function getCategoryTypeLabel(type: CategoryType): string {
  const labels: Record<CategoryType, string> = {
    'compound-word-prefix': 'Compound Prefix',
    'compound-word-suffix': 'Compound Suffix',
    'proper-noun-group': 'Proper Nouns',
    'finite-group': 'Finite Group',
    'general-category': 'General',
    'things-that': 'Things That...',
    'adjective-category': 'Adjective',
  };
  return labels[type] || type;
}

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const loadPuzzles = useCallback(async () => {
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
      const assignedEntries: PuzzleEntry[] = futureAssigned.map((p: FutureAssignedEntry) => ({
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
  }, []);

  useEffect(() => {
    const allowed = isLocalhost();
    setIsAllowed(allowed);

    if (allowed) {
      loadPuzzles();
    } else {
      setIsLoading(false);
    }
  }, [loadPuzzles]);

  // Filter puzzles by status
  const filteredPuzzles = puzzles.filter((entry) => {
    if (statusFilter === 'all') return true;
    return entry.puzzle.status === statusFilter;
  });

  // Ensure currentIndex is valid after filtering
  useEffect(() => {
    if (currentIndex >= filteredPuzzles.length && filteredPuzzles.length > 0) {
      setCurrentIndex(filteredPuzzles.length - 1);
    }
  }, [filteredPuzzles.length, currentIndex]);

  const handlePrev = () => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    setCurrentIndex((i) => Math.min(filteredPuzzles.length - 1, i + 1));
  };

  const handlePlay = () => {
    const entry = filteredPuzzles[currentIndex];
    if (!entry) return;

    if (entry.type === 'pool') {
      router.push(`/?debug=true&poolId=${entry.puzzle.id}`);
    } else {
      router.push(`/?puzzle=${entry.puzzleNumber}&debug=true`);
    }
  };

  const handleUpdateStatus = async (newStatus: 'approved' | 'rejected') => {
    const entry = filteredPuzzles[currentIndex];
    if (!entry || entry.type !== 'pool') return;

    // Persist to pool.json via API
    const success = await updatePuzzleStatus(entry.puzzle.id, newStatus);

    if (success) {
      // Update locally
      setPuzzles((prev) =>
        prev.map((p) =>
          p.type === 'pool' && p.puzzle.id === entry.puzzle.id
            ? { ...p, puzzle: { ...p.puzzle, status: newStatus } }
            : p
        )
      );
      console.log(`Puzzle ${entry.puzzle.id} marked as ${newStatus}`);
    } else {
      console.error(`Failed to update puzzle ${entry.puzzle.id} status`);
    }
  };

  // Not allowed (not localhost)
  if (isAllowed === false) {
    return (
      <GameContainer
        maxWidth="md"
        navBar={<NavBar title="Debug" gameId={edgewiseConfig.id} />}
      >
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
          <div className="text-2xl font-bold text-[var(--danger)] mb-4">
            Debug Mode Not Available
          </div>
          <div className="text-[var(--muted)]">Debug page is only available on localhost.</div>
        </div>
      </GameContainer>
    );
  }

  // Loading
  if (isLoading || isAllowed === null) {
    return (
      <GameContainer
        maxWidth="md"
        navBar={<NavBar title="Debug" gameId={edgewiseConfig.id} />}
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
        navBar={<NavBar title="Debug" gameId={edgewiseConfig.id} />}
      >
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
          <div className="text-xl text-[var(--muted)]">No puzzles found in pool.</div>
          <div className="text-sm text-[var(--muted)] mt-2">
            Run{' '}
            <code className="bg-[var(--muted)]/20 px-1 rounded">npm run generate-puzzles</code> to
            generate some.
          </div>
        </div>
      </GameContainer>
    );
  }

  // No filtered puzzles
  if (filteredPuzzles.length === 0) {
    return (
      <GameContainer
        maxWidth="md"
        navBar={<NavBar title="Debug - Puzzle Browser" gameId={edgewiseConfig.id} />}
      >
        <div className="flex flex-col items-center gap-4 py-8">
          {/* Filter buttons */}
          <div className="flex gap-2 flex-wrap justify-center">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
              <Button
                key={filter}
                variant={statusFilter === filter ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setStatusFilter(filter)}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Button>
            ))}
          </div>
          <div className="text-[var(--muted)]">No {statusFilter} puzzles found.</div>
        </div>
      </GameContainer>
    );
  }

  const currentEntry = filteredPuzzles[currentIndex];
  const puzzle = currentEntry.puzzle;

  return (
    <GameContainer
      maxWidth="md"
      navBar={<NavBar title="Debug - Puzzle Browser" gameId={edgewiseConfig.id} />}
    >
      <div className="flex flex-col items-center gap-6 py-8 w-full max-w-md mx-auto px-4">
        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap justify-center">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                setStatusFilter(filter);
                setCurrentIndex(0);
              }}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-4 w-full justify-between">
          <Button variant="secondary" onClick={handlePrev} disabled={currentIndex === 0}>
            Prev
          </Button>
          <div className="text-center">
            <div className="text-lg font-bold">
              {currentIndex + 1} / {filteredPuzzles.length}
            </div>
            <div className="text-sm text-[var(--muted)]">
              {currentEntry.type === 'pool' ? 'Pool Puzzle' : `Puzzle #${currentEntry.puzzleNumber}`}
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={handleNext}
            disabled={currentIndex === filteredPuzzles.length - 1}
          >
            Next
          </Button>
        </div>

        {/* Puzzle Preview */}
        <PuzzlePreview puzzle={puzzle} />

        {/* Puzzle Info Card */}
        <div className="w-full bg-[var(--tile-bg)] rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-[var(--muted)]">Status:</span>{' '}
              <span
                className={`font-medium ${
                  puzzle.status === 'approved'
                    ? 'text-green-400'
                    : puzzle.status === 'rejected'
                      ? 'text-red-400'
                      : 'text-yellow-400'
                }`}
              >
                {puzzle.status}
              </span>
            </div>
            <div>
              <span className="text-[var(--muted)]">ID:</span>{' '}
              <span className="font-mono text-xs">{puzzle.id}</span>
            </div>
          </div>

          {/* Categories */}
          <div className="pt-2 border-t border-[var(--border)]">
            <div className="text-[var(--muted)] text-sm mb-2">Categories:</div>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-[var(--muted)]">Top:</span> {puzzle.categories.top}
              </div>
              <div>
                <span className="text-[var(--muted)]">Right:</span> {puzzle.categories.right}
              </div>
              <div>
                <span className="text-[var(--muted)]">Bottom:</span> {puzzle.categories.bottom}
              </div>
              <div>
                <span className="text-[var(--muted)]">Left:</span> {puzzle.categories.left}
              </div>
            </div>
          </div>

          {/* Category Types */}
          {puzzle.metadata?.categoryTypes && (
            <div className="pt-2 border-t border-[var(--border)]">
              <div className="text-[var(--muted)] text-sm mb-2">Category Types:</div>
              <div className="flex flex-wrap gap-1">
                {puzzle.metadata.categoryTypes.map((type, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 bg-[var(--accent)]/20 text-[var(--accent)] rounded"
                  >
                    {getCategoryTypeLabel(type)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Overlap Words */}
          {puzzle.metadata?.overlapWords && puzzle.metadata.overlapWords.length > 0 && (
            <div className="pt-2 border-t border-[var(--border)]">
              <div className="text-[var(--muted)] text-sm mb-2">
                Overlap Words (misdirection):
              </div>
              <div className="text-sm">{puzzle.metadata.overlapWords.join(', ')}</div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <Button variant="primary" size="lg" onClick={handlePlay}>
            Play This Puzzle
          </Button>

          {currentEntry.type === 'pool' && puzzle.status === 'pending' && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1 !bg-green-600 hover:!bg-green-700"
                onClick={() => handleUpdateStatus('approved')}
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                className="flex-1 !bg-red-600 hover:!bg-red-700"
                onClick={() => handleUpdateStatus('rejected')}
              >
                Reject
              </Button>
            </div>
          )}
        </div>
      </div>
    </GameContainer>
  );
}
