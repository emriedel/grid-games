'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LandingScreen,
  NavBar,
  GameContainer,
  ResultsModal,
  Button,
} from '@grid-games/ui';
import { shareOrCopy } from '@grid-games/shared';
import { useGameState } from '@/hooks/useGameState';
import { Board } from './Board';
import { PieceTray } from './PieceTray';
import { HowToPlayModal } from './HowToPlayModal';
import {
  loadPuzzleByNumber,
  getTodayPuzzleNumber,
  generateFallbackPuzzle,
  loadPoolPuzzleById,
} from '@/lib/puzzleLoader';
import {
  getSavedState,
  saveInProgressState,
  saveCompletedState,
  hasCompletedPuzzle,
  hasInProgressGame,
} from '@/lib/storage';
import type { Position, PentominoId } from '@/types';
import { tesseraConfig } from '@/config';

export function Game() {
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === 'true';
  const puzzleParam = searchParams.get('puzzle');
  const poolIdParam = searchParams.get('poolId');

  // Loading and UI state
  const [isLoading, setIsLoading] = useState(true);
  const [landingMode, setLandingMode] = useState<'fresh' | 'in-progress' | 'completed'>('fresh');
  const [exitedLanding, setExitedLanding] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [puzzleNumber, setPuzzleNumber] = useState<number>(1);
  const [puzzleId, setPuzzleId] = useState<string | undefined>();

  // Game state
  const {
    state,
    loadPuzzle,
    startGame,
    selectPiece,
    deselectPiece,
    rotatePiece,
    tryPlacePiece,
    removePieceFromBoard,
    clearAll,
    restoreState,
  } = useGameState();

  // Determine if this is an archive puzzle
  const isArchiveMode = puzzleParam !== null;
  const targetPuzzleNumber = puzzleParam ? parseInt(puzzleParam, 10) : getTodayPuzzleNumber();

  // Initialize game
  useEffect(() => {
    async function init() {
      let puzzle;
      let num = targetPuzzleNumber;

      // Debug mode with poolId - load from pool
      if (debugMode && poolIdParam) {
        puzzle = await loadPoolPuzzleById(poolIdParam);
        if (puzzle) {
          num = 0; // Pool puzzles don't have a number
        }
      }

      // Normal loading
      if (!puzzle) {
        setPuzzleNumber(num);
        puzzle = await loadPuzzleByNumber(num);

        // Fallback to generated puzzle
        if (!puzzle) {
          puzzle = generateFallbackPuzzle(num);
        }
      }

      setPuzzleNumber(num);
      setPuzzleId(puzzle.id);
      loadPuzzle(puzzle);

      // Debug output
      if (debugMode) {
        console.log('[Tessera Debug] Puzzle #', num);
        console.log('[Tessera Debug] Shape:', puzzle.shapeName);
        console.log('[Tessera Debug] Pieces:', puzzle.pentominoIds.join(', '));
        if (poolIdParam) {
          console.log('[Tessera Debug] Pool ID:', poolIdParam);
        }
      }

      // Check saved state (skip in debug mode)
      if (!debugMode) {
        const savedState = getSavedState(num, puzzle.id);

        if (savedState?.status === 'completed') {
          if (isArchiveMode) {
            // For archive, go straight to board view
            setExitedLanding(true);
            restoreState({ placedPieces: savedState.data.placedPieces });
          } else {
            setLandingMode('completed');
          }
        } else if (savedState?.status === 'in-progress') {
          setLandingMode('in-progress');
        }
      }

      setIsLoading(false);
    }

    init();
  }, [debugMode, targetPuzzleNumber, isArchiveMode, poolIdParam, loadPuzzle, restoreState]);

  // Save state during gameplay
  useEffect(() => {
    if (state.phase === 'playing' && !debugMode && state.puzzle) {
      saveInProgressState(puzzleNumber, state, puzzleId);
    }
  }, [state, puzzleNumber, puzzleId, debugMode]);

  // Handle completion
  useEffect(() => {
    if (state.phase === 'finished' && state.won) {
      if (!debugMode && state.puzzle) {
        saveCompletedState(puzzleNumber, state, puzzleId);
      }
      setShowResults(true);
    }
  }, [state.phase, state.won, debugMode, puzzleNumber, puzzleId, state]);

  // Handlers
  const handlePlay = useCallback(() => {
    startGame();
  }, [startGame]);

  const handleResume = useCallback(() => {
    const savedState = getSavedState(puzzleNumber, puzzleId);
    if (savedState?.data.placedPieces) {
      restoreState({ placedPieces: savedState.data.placedPieces });
    }
    startGame();
  }, [puzzleNumber, puzzleId, restoreState, startGame]);

  const handleSeeResults = useCallback(() => {
    const savedState = getSavedState(puzzleNumber, puzzleId);
    if (savedState?.data.placedPieces) {
      restoreState({ placedPieces: savedState.data.placedPieces });
    }
    setExitedLanding(true);
  }, [puzzleNumber, puzzleId, restoreState]);

  const handleCellClick = useCallback((position: Position) => {
    if (state.selectedPieceId) {
      tryPlacePiece(position);
    }
  }, [state.selectedPieceId, tryPlacePiece]);

  const handlePieceClick = useCallback((pentominoId: PentominoId) => {
    // If clicking on a placed piece, remove it
    const isPlaced = state.placedPieces.some((p) => p.pentominoId === pentominoId);
    if (isPlaced) {
      removePieceFromBoard(pentominoId);
    }
  }, [state.placedPieces, removePieceFromBoard]);

  // Build share text
  const shareText = `Tessera #${puzzleNumber}
Completed!

https://nerdcube.games/tessera`;

  // Loading state
  if (isLoading || !state.puzzle || !state.board) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900">
        <div className="text-white text-lg">Loading puzzle...</div>
      </div>
    );
  }

  // Determine if we should show landing
  const showLanding = !exitedLanding && state.phase === 'landing' && !isArchiveMode;

  // Landing screen
  if (showLanding) {
    return (
      <LandingScreen
        gameId="tessera"
        name="Tessera"
        description="Fill the target shape using pentomino pieces"
        puzzleInfo={{ number: puzzleNumber, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
        mode={landingMode}
        onPlay={handlePlay}
        onResume={handleResume}
        onSeeResults={handleSeeResults}
        archiveHref="/archive"
      />
    );
  }

  // Determine display state
  const isFinished = state.phase === 'finished' || (exitedLanding && hasCompletedPuzzle(puzzleNumber, puzzleId));

  return (
    <GameContainer
      navBar={
        <NavBar
          title={`Tessera #${puzzleNumber}`}
          gameId="tessera"
          rightContent={
            <button
              onClick={() => setShowHowToPlay(true)}
              className="text-[var(--muted)] hover:text-[var(--foreground)] px-2"
              aria-label="How to play"
            >
              ?
            </button>
          }
        />
      }
    >
      <div className="flex flex-col items-center gap-4 p-4">
        {/* Shape name */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {state.puzzle.shapeName}
          </h2>
        </div>

        {/* Board */}
        <Board
          board={state.board}
          selectedPieceId={state.selectedPieceId}
          selectedRotation={state.selectedRotation}
          onCellClick={handleCellClick}
          onPieceClick={handlePieceClick}
        />

        {/* Piece tray (only when playing) */}
        {!isFinished && (
          <PieceTray
            availablePieces={state.availablePieces}
            selectedPieceId={state.selectedPieceId}
            selectedRotation={state.selectedRotation}
            onPieceSelect={selectPiece}
          />
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {!isFinished && state.placedPieces.length > 0 && (
            <Button variant="secondary" onClick={clearAll}>
              Clear All
            </Button>
          )}
          {isFinished && (
            <Button variant="primary" onClick={() => setShowResults(true)}>
              See Results
            </Button>
          )}
        </div>
      </div>

      {/* How to Play Modal */}
      <HowToPlayModal
        isOpen={showHowToPlay}
        onClose={() => setShowHowToPlay(false)}
      />

      {/* Results Modal */}
      <ResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        gameId="tessera"
        gameName="Tessera"
        puzzleNumber={puzzleNumber}
        primaryStat={{ value: 'Complete', label: state.puzzle.shapeName }}
        shareConfig={{ text: shareText }}
        messageType="success"
      />
    </GameContainer>
  );
}
