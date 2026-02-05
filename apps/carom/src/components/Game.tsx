'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Undo2 } from 'lucide-react';
import { LandingScreen, NavBar, GameContainer, Button, DebugPanel, DebugButton } from '@grid-games/ui';
import { formatDisplayDate } from '@grid-games/shared';
import { caromConfig } from '@/config';
import { useGameState } from '@/hooks/useGameState';
import { getDailyPuzzle, generateRandomPuzzle } from '@/lib/puzzleGenerator';
import {
  saveGameCompletion,
  getCompletionState,
  getInProgressState,
  isTodayCompleted,
  hasInProgressGame,
} from '@/lib/storage';
import { Board } from './Board';
import { HeaderMoveCounter } from './HeaderMoveCounter';
import { HowToPlayModal } from './HowToPlayModal';
import { ResultsModal } from './ResultsModal';
import { Direction, Puzzle } from '@/types';

export function Game() {
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';

  const { state, startGame, restoreGame, selectPiece, deselectPiece, movePiece, reset, undo, canUndo } = useGameState();
  const [showRules, setShowRules] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [landingMode, setLandingMode] = useState<'fresh' | 'in-progress' | 'completed'>('fresh');

  // Initialize puzzle on mount
  useEffect(() => {
    async function loadPuzzle() {
      setIsLoading(true);
      try {
        const dailyPuzzle = await getDailyPuzzle();
        setPuzzle(dailyPuzzle);

        // Determine landing mode after mount (to avoid hydration mismatch)
        if (!isDebug) {
          if (isTodayCompleted()) {
            setLandingMode('completed');
          } else if (hasInProgressGame()) {
            setLandingMode('in-progress');
          }
        }
      } catch (error) {
        console.error('Failed to load puzzle:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPuzzle();
  }, [isDebug]);

  // Handle game start (fresh)
  const handlePlay = useCallback(() => {
    if (puzzle) {
      startGame(puzzle);
    }
  }, [puzzle, startGame]);

  // Handle resume (in-progress)
  const handleResume = useCallback(() => {
    if (!puzzle) return;

    const inProgress = getInProgressState();
    if (inProgress) {
      restoreGame(puzzle, inProgress.pieces, inProgress.moveCount, inProgress.moveHistory);
    } else {
      startGame(puzzle);
    }
  }, [puzzle, restoreGame, startGame]);

  // Handle see results (completed)
  const handleSeeResults = useCallback(() => {
    if (!puzzle) return;

    const completion = getCompletionState();
    if (completion) {
      // Reconstruct final piece positions from move history
      const finalPieces = puzzle.pieces.map(p => ({ ...p }));
      for (const move of completion.moveHistory) {
        const piece = finalPieces.find(p => p.id === move.pieceId);
        if (piece) {
          piece.position = { ...move.to };
        }
      }

      // Restore the final state - don't open modal, just show the game board
      restoreGame(puzzle, finalPieces, completion.moveCount, completion.moveHistory);
    }
  }, [puzzle, restoreGame]);

  // Handle move
  const handleMove = useCallback(
    (direction: Direction) => {
      if (state.selectedPieceId) {
        movePiece(direction);
      }
    },
    [state.selectedPieceId, movePiece]
  );

  // Handle win condition
  useEffect(() => {
    if (state.phase === 'finished' && state.puzzle) {
      saveGameCompletion(state.moveCount, state.puzzle.optimalMoves, state.moveHistory);
      // Small delay before showing results
      const timer = setTimeout(() => {
        setShowResults(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.moveCount, state.puzzle, state.moveHistory]);

  // Handle new random puzzle (debug mode)
  const handleNewPuzzle = useCallback(async () => {
    const newPuzzle = await generateRandomPuzzle();
    setPuzzle(newPuzzle);
    startGame(newPuzzle);
  }, [startGame]);

  // Loading state - show while puzzle is being fetched
  if (isLoading || !puzzle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-xl text-[var(--foreground)]">Loading...</div>
      </div>
    );
  }

  // Landing screen
  if (state.phase === 'landing') {
    const puzzleInfo = {
      number: puzzle.puzzleNumber,
      date: formatDisplayDate(puzzle.date),
    };

    return (
      <>
        <LandingScreen
          icon={caromConfig.icon}
          name={caromConfig.name}
          description={caromConfig.description}
          puzzleInfo={puzzleInfo}
          mode={landingMode}
          onPlay={handlePlay}
          onResume={handleResume}
          onSeeResults={handleSeeResults}
          onRules={() => setShowRules(true)}
          gameId="carom"
        />
        <HowToPlayModal isOpen={showRules} onClose={() => setShowRules(false)} />
      </>
    );
  }

  // Playing / Finished states
  return (
    <>
      <GameContainer
        maxWidth="full"
        navBar={
          <NavBar
            title={
              state.puzzle?.puzzleNumber
                ? `${caromConfig.name} #${state.puzzle.puzzleNumber}`
                : caromConfig.name
            }
            gameId={caromConfig.id}
            onRulesClick={() => setShowRules(true)}
            rightContent={
              <HeaderMoveCounter
                moves={state.moveCount}
                optimalMoves={isDebug ? state.puzzle?.optimalMoves : undefined}
              />
            }
          />
        }
      >
        <div className="flex flex-col items-center gap-6 py-4 w-full max-w-md sm:max-w-lg">
          {/* Board */}
          {state.puzzle && (
            <Board
              board={state.puzzle.board}
              pieces={state.pieces}
              selectedPieceId={state.selectedPieceId}
              onPieceSelect={selectPiece}
              onDeselect={deselectPiece}
              onMove={handleMove}
              disabled={state.isAnimating || state.phase === 'finished'}
            />
          )}

          {/* Undo and Reset buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="p-2 rounded-lg bg-[var(--muted)] text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--border)] transition-colors"
              aria-label="Undo last move"
              title="Undo"
            >
              <Undo2 className="w-5 h-5" />
            </button>
            <Button variant="secondary" onClick={reset}>
              Reset
            </Button>
          </div>

          {/* Debug Panel */}
          {isDebug && state.puzzle && (
            <DebugPanel>
              <div>Optimal: {state.puzzle.optimalMoves} moves</div>
              <div>Date: {state.puzzle.date}</div>
              <div>Selected: {state.selectedPieceId || 'none'}</div>
              <DebugButton onClick={handleNewPuzzle} />
            </DebugPanel>
          )}
        </div>
      </GameContainer>

      <HowToPlayModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {state.puzzle && (
        <ResultsModal
          isOpen={showResults}
          onClose={() => setShowResults(false)}
          moveCount={state.moveCount}
          optimalMoves={state.puzzle.optimalMoves}
          date={state.puzzle.date}
          puzzleNumber={state.puzzle.puzzleNumber}
          moveHistory={state.moveHistory}
        />
      )}
    </>
  );
}
