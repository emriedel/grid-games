'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Undo2 } from 'lucide-react';
import { LandingScreen, NavBar, GameContainer, Button, DebugPanel, DebugButton } from '@grid-games/ui';
import { formatDisplayDate } from '@grid-games/shared';
import { caromConfig } from '@/config';
import { useGameState } from '@/hooks/useGameState';
import { getDailyPuzzle, generateRandomPuzzle } from '@/lib/puzzleGenerator';
import { saveGameCompletion, getTodayGameState } from '@/lib/storage';
import { Board } from './Board';
import { HeaderMoveCounter } from './HeaderMoveCounter';
import { HowToPlayModal } from './HowToPlayModal';
import { ResultsModal } from './ResultsModal';
import { Direction, Puzzle } from '@/types';

export function Game() {
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';

  const { state, startGame, selectPiece, deselectPiece, movePiece, reset, undo, canUndo } = useGameState();
  const [showRules, setShowRules] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize puzzle on mount
  useEffect(() => {
    async function loadPuzzle() {
      setIsLoading(true);
      try {
        const dailyPuzzle = await getDailyPuzzle();
        setPuzzle(dailyPuzzle);
      } catch (error) {
        console.error('Failed to load puzzle:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPuzzle();

    // Check if already completed today
    const savedState = getTodayGameState();
    if (savedState?.completed && !isDebug) {
      // Could show results directly or let user replay
    }
  }, [isDebug]);

  // Handle game start
  const handlePlay = useCallback(() => {
    if (puzzle) {
      startGame(puzzle);
    }
  }, [puzzle, startGame]);

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
      saveGameCompletion(state.moveCount, state.puzzle.optimalMoves);
      // Small delay before showing results
      const timer = setTimeout(() => {
        setShowResults(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.moveCount, state.puzzle]);

  // Handle new random puzzle (debug mode)
  const handleNewPuzzle = useCallback(async () => {
    const newPuzzle = await generateRandomPuzzle();
    setPuzzle(newPuzzle);
    startGame(newPuzzle);
  }, [startGame]);

  // Landing screen
  if (state.phase === 'landing') {
    const puzzleInfo = puzzle
      ? {
          number: puzzle.puzzleNumber,
          date: formatDisplayDate(puzzle.date),
        }
      : caromConfig.getPuzzleInfo();

    return (
      <>
        <LandingScreen
          icon={caromConfig.icon}
          name={caromConfig.name}
          description={caromConfig.description}
          puzzleInfo={puzzleInfo}
          onPlay={handlePlay}
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
