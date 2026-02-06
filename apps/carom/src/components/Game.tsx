'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Undo2 } from 'lucide-react';
import { LandingScreen, NavBar, GameContainer, Button, DebugPanel, DebugButton, ResultsModal, ArchiveModal } from '@grid-games/ui';
import { formatDisplayDate, shareOrCopy, getPuzzleNumber, getDateForPuzzleNumber } from '@grid-games/shared';
import { caromConfig } from '@/config';
import { useGameState } from '@/hooks/useGameState';
import { getDailyPuzzle, generateRandomPuzzle } from '@/lib/puzzleGenerator';
import {
  saveGameCompletion,
  getCompletionState,
  getInProgressState,
  isTodayCompleted,
  hasInProgressGame,
  getPuzzleState,
  savePuzzleState,
  isPuzzleCompleted,
  isPuzzleInProgress,
  getTodayPuzzleNumber,
} from '@/lib/storage';
import { Board } from './Board';
import { HeaderMoveCounter } from './HeaderMoveCounter';
import { HowToPlayModal } from './HowToPlayModal';
import { Direction, Puzzle, Move } from '@/types';

const directionArrows: Record<Direction, string> = {
  up: '⬆️',
  down: '⬇️',
  left: '⬅️',
  right: '➡️',
};

// Carom-specific wrapper for ResultsModal
interface CaromResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  moveCount: number;
  date: string;
  puzzleNumber: number;
  moveHistory: Move[];
}

function CaromResultsModal({
  isOpen,
  onClose,
  moveCount,
  date,
  puzzleNumber,
  moveHistory,
}: CaromResultsModalProps) {
  const displayDate = formatDisplayDate(date);
  const movesText = moveCount === 1 ? 'move' : 'moves';
  const arrowSequence = moveHistory.map((m) => directionArrows[m.direction]).join('');

  const shareText = `Carom #${puzzleNumber}\n${arrowSequence}\n${moveCount} ${movesText}\n\nhttps://nerdcube.games/carom`;

  return (
    <ResultsModal
      isOpen={isOpen}
      onClose={onClose}
      gameId="carom"
      gameName="Carom"
      date={displayDate}
      puzzleNumber={puzzleNumber}
      primaryStat={{ value: moveCount, label: movesText }}
      shareConfig={{ text: shareText }}
    >
      {/* Arrow sequence visualization */}
      <div className="text-center">
        <div className="text-2xl tracking-wider">{arrowSequence}</div>
      </div>
    </ResultsModal>
  );
}

// Base date for puzzle numbering (Carom launched Jan 30, 2026)
const PUZZLE_BASE_DATE = '2026-01-30';
const PUZZLE_BASE_DATE_OBJ = new Date(PUZZLE_BASE_DATE);

export function Game() {
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';
  const showArchiveParam = searchParams.get('archive') === 'true';
  const puzzleParam = searchParams.get('puzzle');

  // Determine if this is archive mode
  const archivePuzzleNumber = puzzleParam ? parseInt(puzzleParam, 10) : null;
  const isArchiveMode = archivePuzzleNumber !== null && !isNaN(archivePuzzleNumber) && archivePuzzleNumber >= 1;
  const todayPuzzleNumber = getTodayPuzzleNumber();
  const activePuzzleNumber = isArchiveMode ? archivePuzzleNumber : todayPuzzleNumber;

  const { state, startGame, restoreGame, selectPiece, deselectPiece, movePiece, reset, setFinished, undo, canUndo } = useGameState({ puzzleNumber: activePuzzleNumber });
  const [showRules, setShowRules] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [landingMode, setLandingMode] = useState<'fresh' | 'in-progress' | 'completed'>('fresh');
  const [wasPlayingThisSession, setWasPlayingThisSession] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(showArchiveParam);

  // Initialize puzzle on mount
  useEffect(() => {
    async function loadPuzzle() {
      setIsLoading(true);
      try {
        // For archive mode, convert puzzle number to date string
        const puzzleDateString = isArchiveMode
          ? getDateForPuzzleNumber(PUZZLE_BASE_DATE_OBJ, activePuzzleNumber)
          : undefined; // undefined = today

        const loadedPuzzle = await getDailyPuzzle(puzzleDateString);
        setPuzzle(loadedPuzzle);

        // Check saved state using unified storage (skip in debug mode)
        if (!isDebug) {
          const puzzleState = getPuzzleState(activePuzzleNumber);

          if (puzzleState?.status === 'completed') {
            if (isArchiveMode) {
              // Archive: go directly to finished (skip landing)
              // Reconstruct final piece positions from move history
              const finalPieces = loadedPuzzle.pieces.map(p => ({ ...p }));
              for (const move of puzzleState.data.moveHistory) {
                const piece = finalPieces.find(p => p.id === move.pieceId);
                if (piece) {
                  piece.position = { ...move.to };
                }
              }
              restoreGame(loadedPuzzle, finalPieces, puzzleState.data.moveCount, puzzleState.data.moveHistory);
              setFinished();
            } else {
              // Today: show landing with completed mode
              setLandingMode('completed');
            }
          } else if (puzzleState?.status === 'in-progress') {
            if (isArchiveMode) {
              // Archive: restore and go directly to playing (skip landing)
              setWasPlayingThisSession(true);
              restoreGame(
                loadedPuzzle,
                puzzleState.data.pieces ?? loadedPuzzle.pieces,
                puzzleState.data.moveCount,
                puzzleState.data.moveHistory
              );
            } else {
              // Today: show landing with in-progress mode
              setLandingMode('in-progress');
            }
          } else {
            // Fresh puzzle
            if (isArchiveMode) {
              // Archive: go directly to playing (skip landing)
              setWasPlayingThisSession(true);
              startGame(loadedPuzzle);
            }
            // Today: stay on landing (fresh)
          }
        }
      } catch (error) {
        console.error('Failed to load puzzle:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPuzzle();
  }, [isDebug, isArchiveMode, activePuzzleNumber]);

  // Handle game start (fresh)
  const handlePlay = useCallback(() => {
    if (puzzle) {
      setWasPlayingThisSession(true);
      startGame(puzzle);
    }
  }, [puzzle, startGame]);

  // Handle resume (in-progress)
  const handleResume = useCallback(() => {
    if (!puzzle) return;

    setWasPlayingThisSession(true);
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

      // Restore the final state and mark as finished
      restoreGame(puzzle, finalPieces, completion.moveCount, completion.moveHistory);
      setFinished();
    }
  }, [puzzle, restoreGame, setFinished]);

  // Handle move
  const handleMove = useCallback(
    (direction: Direction) => {
      if (state.selectedPieceId) {
        movePiece(direction);
      }
    },
    [state.selectedPieceId, movePiece]
  );

  // Handle win condition - only auto-show results if player was playing this session
  useEffect(() => {
    if (state.phase === 'finished' && state.puzzle && wasPlayingThisSession) {
      // Save using puzzle-number-based storage
      savePuzzleState(activePuzzleNumber, {
        puzzleNumber: activePuzzleNumber,
        status: 'completed',
        data: {
          moveCount: state.moveCount,
          optimalMoves: state.puzzle.optimalMoves,
          moveHistory: state.moveHistory,
        },
      });
      // Small delay before showing results
      const timer = setTimeout(() => {
        setShowResults(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.moveCount, state.puzzle, state.moveHistory, wasPlayingThisSession, activePuzzleNumber]);

  // Handle new random puzzle (debug mode)
  const handleNewPuzzle = useCallback(async () => {
    const newPuzzle = await generateRandomPuzzle();
    setPuzzle(newPuzzle);
    startGame(newPuzzle);
  }, [startGame]);

  // Handle archive puzzle selection
  const handleSelectArchivePuzzle = useCallback((puzzleNumber: number) => {
    // Navigate to the archive puzzle (use relative URL for local/production compatibility)
    window.location.href = `?puzzle=${puzzleNumber}`;
  }, []);

  // Check if an archive puzzle is completed
  const isArchivePuzzleCompleted = useCallback((pn: number) => {
    return isPuzzleCompleted(pn);
  }, []);

  // Check if an archive puzzle is in progress
  const isArchivePuzzleInProgress = useCallback((pn: number) => {
    return isPuzzleInProgress(pn);
  }, []);

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
          onArchive={() => setShowArchiveModal(true)}
          gameId="carom"
        />
        <HowToPlayModal isOpen={showRules} onClose={() => setShowRules(false)} />
        <ArchiveModal
          isOpen={showArchiveModal}
          onClose={() => setShowArchiveModal(false)}
          gameName="Carom"
          baseDate={PUZZLE_BASE_DATE}
          todayPuzzleNumber={todayPuzzleNumber}
          isPuzzleCompleted={isArchivePuzzleCompleted}
          isPuzzleInProgress={isArchivePuzzleInProgress}
          onSelectPuzzle={handleSelectArchivePuzzle}
        />
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

          {/* Undo and Reset buttons - only show when playing */}
          {state.phase === 'playing' && (
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
          )}

          {/* See Results button - show when finished */}
          {state.phase === 'finished' && (
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowResults(true)}
            >
              See Results
            </Button>
          )}

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
        <CaromResultsModal
          isOpen={showResults}
          onClose={() => setShowResults(false)}
          moveCount={state.moveCount}
          date={state.puzzle.date}
          puzzleNumber={state.puzzle.puzzleNumber ?? getPuzzleNumber(new Date('2026-01-30'), new Date(state.puzzle.date))}
          moveHistory={state.moveHistory}
        />
      )}
    </>
  );
}
