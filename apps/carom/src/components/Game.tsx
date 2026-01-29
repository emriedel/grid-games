'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { LandingScreen, NavBar, GameContainer, Button } from '@grid-games/ui';
import { caromConfig } from '@/config';
import { useGameState } from '@/hooks/useGameState';
import { generateDailyPuzzle, generateRandomPuzzle } from '@/lib/puzzleGenerator';
import { saveGameCompletion, getTodayGameState } from '@/lib/storage';
import { Board } from './Board';
import { HeaderMoveCounter } from './HeaderMoveCounter';
import { HowToPlayModal } from './HowToPlayModal';
import { ResultsModal } from './ResultsModal';
import { Direction, Puzzle } from '@/types';

export function Game() {
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';

  const { state, startGame, selectPiece, movePiece, reset, setFinished } = useGameState();
  const [showRules, setShowRules] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);

  // Initialize puzzle on mount
  useEffect(() => {
    const dailyPuzzle = generateDailyPuzzle();
    setPuzzle(dailyPuzzle);

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

  // Landing screen
  if (state.phase === 'landing') {
    return (
      <>
        <LandingScreen
          icon={caromConfig.icon}
          name={caromConfig.name}
          description={caromConfig.description}
          puzzleInfo={caromConfig.getPuzzleInfo()}
          onPlay={handlePlay}
          onRules={() => setShowRules(true)}
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
            title={caromConfig.name}
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
              onMove={handleMove}
              disabled={state.isAnimating || state.phase === 'finished'}
            />
          )}

          {/* Instructions */}
          {!state.selectedPieceId && state.phase === 'playing' && (
            <p className="text-sm text-[var(--muted)] text-center">
              Tap a piece to select it
            </p>
          )}

          {state.selectedPieceId && state.phase === 'playing' && (
            <p className="text-sm text-[var(--muted)] text-center">
              Tap an arrow or swipe to move
            </p>
          )}

          {/* Reset button */}
          <Button variant="secondary" onClick={reset}>
            Reset
          </Button>

          {/* Debug info */}
          {isDebug && state.puzzle && (
            <div className="text-xs text-[var(--muted)] text-center space-y-1">
              <p>Optimal: {state.puzzle.optimalMoves} moves</p>
              <p>Date: {state.puzzle.date}</p>
              <p>Selected: {state.selectedPieceId || 'none'}</p>
              <Button
                variant="secondary"
                onClick={() => {
                  const newPuzzle = generateRandomPuzzle();
                  setPuzzle(newPuzzle);
                  startGame(newPuzzle);
                }}
                className="mt-2 bg-purple-600 hover:bg-purple-700 text-white"
              >
                New Puzzle
              </Button>
            </div>
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
        />
      )}
    </>
  );
}
