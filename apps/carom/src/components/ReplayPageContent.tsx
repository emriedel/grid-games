'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { NavBar, GameContainer, Button } from '@grid-games/ui';
import { getDateForPuzzleNumber } from '@grid-games/shared';
import { caromConfig, CAROM_LAUNCH_DATE } from '@/config';
import { parseReplayParams } from '@/lib/replay';
import { getDailyPuzzle } from '@/lib/puzzleGenerator';
import { useReplayFromMoves } from '@/hooks/useReplay';
import { Board } from './Board';
import { ReplayControls } from './ReplayControls';
import { HeaderMoveCounter } from './HeaderMoveCounter';
import { Puzzle, Direction } from '@/types';

export function ReplayPageContent() {
  const searchParams = useSearchParams();

  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [moves, setMoves] = useState<{ pieceId: string; direction: Direction }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [versionMismatch, setVersionMismatch] = useState(false);
  const [puzzleNumber, setPuzzleNumber] = useState<number | null>(null);

  // Parse URL params and load puzzle
  useEffect(() => {
    async function loadReplay() {
      setIsLoading(true);
      setError(null);
      setVersionMismatch(false);

      const params = parseReplayParams(searchParams);
      if (!params) {
        setError('Invalid replay URL. Missing or malformed parameters.');
        setIsLoading(false);
        return;
      }

      try {
        // Load puzzle by number
        const dateStr = getDateForPuzzleNumber(CAROM_LAUNCH_DATE, params.puzzleNumber);
        const loadedPuzzle = await getDailyPuzzle(dateStr);

        setPuzzle(loadedPuzzle);
        setMoves(params.moves);
        setPuzzleNumber(params.puzzleNumber);

        // Check for version mismatch
        if (loadedPuzzle.puzzleId) {
          const loadedIdPrefix = loadedPuzzle.puzzleId.slice(0, 8);
          if (loadedIdPrefix !== params.puzzleId) {
            setVersionMismatch(true);
          }
        }
      } catch (err) {
        console.error('Failed to load replay:', err);
        setError('Failed to load puzzle. The puzzle may not exist.');
      } finally {
        setIsLoading(false);
      }
    }

    loadReplay();
  }, [searchParams]);

  const replayState = useReplayFromMoves(puzzle, moves);

  // Auto-play after a short delay when replay loads
  useEffect(() => {
    if (puzzle && moves.length > 0 && !isLoading) {
      const timer = setTimeout(() => {
        replayState.play();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [puzzle, moves.length, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-xl text-[var(--foreground)]">Loading replay...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[var(--background)]">
        <div className="text-xl text-[var(--foreground)]">{error}</div>
        <Link href="/">
          <Button variant="primary">Play Today's Puzzle</Button>
        </Link>
      </div>
    );
  }

  if (!puzzle) {
    return null;
  }

  return (
    <GameContainer
      maxWidth="full"
      navBar={
        <NavBar
          title={puzzleNumber ? `${caromConfig.name} #${puzzleNumber} Replay` : `${caromConfig.name} Replay`}
          gameId={caromConfig.id}
          rightContent={
            <HeaderMoveCounter
              moves={moves.length}
              isFinished={true}
            />
          }
        />
      }
    >
      <div className="flex flex-col items-center gap-6 py-4 w-full max-w-md sm:max-w-lg">
        {/* Version mismatch warning */}
        {versionMismatch && (
          <div className="w-full p-3 rounded-lg bg-[var(--warning)]/10 border border-[var(--warning)]/30 text-sm text-[var(--warning)]">
            This replay was recorded on a different version of this puzzle.
          </div>
        )}

        {/* Board */}
        <Board
          board={puzzle.board}
          pieces={replayState.pieces}
          selectedPieceId={null}
          onPieceSelect={() => {}}
          onDeselect={() => {}}
          onMove={() => {}}
          disabled={true}
        />

        {/* Replay controls */}
        <ReplayControls
          currentStep={replayState.currentStep}
          totalSteps={replayState.totalSteps}
          isPlaying={replayState.isPlaying}
          isAtEnd={replayState.isAtEnd}
          isAtStart={replayState.isAtStart}
          onPlay={replayState.play}
          onPause={replayState.pause}
          onStepForward={replayState.stepForward}
          onStepBackward={replayState.stepBackward}
        />

        {/* Play this puzzle link */}
        <div className="flex flex-col items-center gap-2 pt-4">
          <Link href={puzzleNumber ? `/?puzzle=${puzzleNumber}` : '/'}>
            <Button variant="secondary">Play This Puzzle</Button>
          </Link>
        </div>
      </div>
    </GameContainer>
  );
}
