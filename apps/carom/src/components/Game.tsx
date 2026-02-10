'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Undo2 } from 'lucide-react';
import { LandingScreen, NavBar, GameContainer, Button, ResultsModal } from '@grid-games/ui';
import { formatDisplayDate, getDateForPuzzleNumber } from '@grid-games/shared';
import { caromConfig, CAROM_LAUNCH_DATE_STRING } from '@/config';
import { useGameState } from '@/hooks/useGameState';
import { getDailyPuzzle, getPuzzleFromPool } from '@/lib/puzzleGenerator';
import {
  getCompletionState,
  getInProgressState,
  getPuzzleState,
  savePuzzleState,
  getTodayPuzzleNumber,
  didAchieveOptimal,
} from '@/lib/storage';
import { Board } from './Board';
import { HeaderMoveCounter } from './HeaderMoveCounter';
import { HowToPlayModal } from './HowToPlayModal';
import { OptimalInfoModal } from './OptimalInfoModal';
import { Direction, Puzzle } from '@/types';

// Carom-specific wrapper for ResultsModal
interface CaromResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  moveCount: number;
  optimalMoves: number;
  achievedOptimal: boolean;
  date: string;
  puzzleNumber: number;
  isArchive: boolean;
}

function CaromResultsModal({
  isOpen,
  onClose,
  moveCount,
  optimalMoves,
  achievedOptimal,
  date,
  puzzleNumber,
  isArchive,
}: CaromResultsModalProps) {
  const displayDate = formatDisplayDate(date);
  const movesText = moveCount === 1 ? 'move' : 'moves';

  // Build share text - no arrow emojis, include trophy if optimal (next to moves)
  const trophyPart = achievedOptimal ? ' 🏆' : '';
  const baseUrl = 'https://nerdcube.games/carom';
  const puzzleUrl = isArchive ? `${baseUrl}?puzzle=${puzzleNumber}` : baseUrl;
  const shareText = `Carom #${puzzleNumber}\n${moveCount} ${movesText}${trophyPart}\n\n${puzzleUrl}`;

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
      {/* Trophy display if optimal */}
      {achievedOptimal && (
        <div className="text-center">
          <div className="text-4xl mb-2">🏆</div>
          <div className="text-[var(--accent)] font-medium">Perfect Solution!</div>
        </div>
      )}
      {!achievedOptimal && (
        <div className="text-center text-[var(--muted)] text-sm">
          Perfect solution: {optimalMoves} moves
        </div>
      )}
    </ResultsModal>
  );
}

// Base date for puzzle numbering
const PUZZLE_BASE_DATE_OBJ = new Date(CAROM_LAUNCH_DATE_STRING);

export function Game() {
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';
  const puzzleParam = searchParams.get('puzzle');
  const poolIdParam = searchParams.get('poolId');

  // Determine if this is archive mode
  const archivePuzzleNumber = puzzleParam ? parseInt(puzzleParam, 10) : null;
  const isArchiveMode = archivePuzzleNumber !== null && !isNaN(archivePuzzleNumber) && archivePuzzleNumber >= 1;
  const isPoolMode = isDebug && poolIdParam !== null;
  const todayPuzzleNumber = getTodayPuzzleNumber();
  const activePuzzleNumber = isArchiveMode ? archivePuzzleNumber : todayPuzzleNumber;

  const { state, startGame, restoreGame, selectPiece, deselectPiece, movePiece, reset, replay, setFinished, undo, canUndo } = useGameState({ puzzleNumber: activePuzzleNumber });
  const [showRules, setShowRules] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showOptimalInfo, setShowOptimalInfo] = useState(false);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [landingMode, setLandingMode] = useState<'fresh' | 'in-progress' | 'completed'>('fresh');
  const [wasPlayingThisSession, setWasPlayingThisSession] = useState(false);
  const [achievedOptimal, setAchievedOptimal] = useState(false);

  // Initialize puzzle on mount
  useEffect(() => {
    async function loadPuzzle() {
      setIsLoading(true);
      try {
        let loadedPuzzle: Puzzle;

        // Pool mode: load from pool by ID (debug only)
        if (isPoolMode && poolIdParam) {
          const poolPuzzle = await getPuzzleFromPool(poolIdParam);
          if (poolPuzzle) {
            loadedPuzzle = poolPuzzle;
          } else {
            console.error('Pool puzzle not found:', poolIdParam);
            // Fall back to daily puzzle
            loadedPuzzle = await getDailyPuzzle();
          }
        } else {
          // For archive mode, convert puzzle number to date string
          const puzzleDateString = isArchiveMode
            ? getDateForPuzzleNumber(PUZZLE_BASE_DATE_OBJ, activePuzzleNumber)
            : undefined; // undefined = today

          loadedPuzzle = await getDailyPuzzle(puzzleDateString);
        }

        setPuzzle(loadedPuzzle);

        // Debug logging - console only
        if (isDebug) {
          console.log('[Carom Debug] Puzzle #' + loadedPuzzle.puzzleNumber);
          console.log('[Carom Debug] Date:', loadedPuzzle.date);
          console.log('[Carom Debug] Optimal moves:', loadedPuzzle.optimalMoves);

          // Use pre-computed solution path if available
          if (loadedPuzzle.solutionPath) {
            console.log('[Carom Debug] Optimal solution:',
              loadedPuzzle.solutionPath.map(m => `${m.pieceId} ${m.direction}`).join(' -> '));
          }
        }

        // Check saved state using unified storage (skip in debug mode)
        if (!isDebug) {
          const puzzleState = getPuzzleState(activePuzzleNumber);

          if (puzzleState?.status === 'completed') {
            // Check if optimal was achieved
            setAchievedOptimal(puzzleState.data.achievedOptimal ?? false);

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
        } else if (isPoolMode) {
          // Pool mode in debug: start game immediately
          setWasPlayingThisSession(true);
          startGame(loadedPuzzle);
        }
      } catch (error) {
        console.error('Failed to load puzzle:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPuzzle();
  }, [isDebug, isArchiveMode, isPoolMode, poolIdParam, activePuzzleNumber]);

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
      // Check if optimal was achieved
      setAchievedOptimal(didAchieveOptimal(activePuzzleNumber));

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
  }, [puzzle, restoreGame, setFinished, activePuzzleNumber]);

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
      const isOptimal = state.moveCount === state.puzzle.optimalMoves;
      setAchievedOptimal(isOptimal);

      // Save using puzzle-number-based storage
      savePuzzleState(activePuzzleNumber, {
        puzzleNumber: activePuzzleNumber,
        status: 'completed',
        data: {
          moveCount: state.moveCount,
          optimalMoves: state.puzzle.optimalMoves,
          moveHistory: state.moveHistory,
          achievedOptimal: isOptimal,
        },
      });
      // Small delay before showing results
      const timer = setTimeout(() => {
        setShowResults(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.moveCount, state.puzzle, state.moveHistory, wasPlayingThisSession, activePuzzleNumber]);

  // Handle replay - reset game state and start fresh
  const handleReplay = useCallback(() => {
    setShowResults(false);
    setWasPlayingThisSession(true);
    setAchievedOptimal(false);
    replay();
  }, [replay]);

  // Handle optimal info click
  const handleOptimalInfoClick = useCallback(() => {
    setShowOptimalInfo(true);
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
          archiveHref="/archive"
          gameId="carom"
        />
        <HowToPlayModal isOpen={showRules} onClose={() => setShowRules(false)} />
      </>
    );
  }

  // Playing / Finished states
  const isFinished = state.phase === 'finished';

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
                optimalMoves={state.puzzle?.optimalMoves}
                achievedOptimal={achievedOptimal}
                isFinished={isFinished}
                onClick={handleOptimalInfoClick}
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
              disabled={state.isAnimating || isFinished}
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

          {/* See Results and Play Again buttons - show when finished */}
          {isFinished && (
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setShowResults(true)}
              >
                See Results
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleReplay}
              >
                Play Again
              </Button>
            </div>
          )}

        </div>
      </GameContainer>

      <HowToPlayModal isOpen={showRules} onClose={() => setShowRules(false)} />

      {state.puzzle && (
        <>
          <CaromResultsModal
            isOpen={showResults}
            onClose={() => setShowResults(false)}
            moveCount={state.moveCount}
            optimalMoves={state.puzzle.optimalMoves}
            achievedOptimal={achievedOptimal}
            date={state.puzzle.date}
            puzzleNumber={state.puzzle.puzzleNumber ?? activePuzzleNumber}
            isArchive={isArchiveMode}
          />
          <OptimalInfoModal
            isOpen={showOptimalInfo}
            onClose={() => setShowOptimalInfo(false)}
            optimalMoves={state.puzzle.optimalMoves}
          />
        </>
      )}
    </>
  );
}
