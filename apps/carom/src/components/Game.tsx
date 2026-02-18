'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Undo2 } from 'lucide-react';
import { LandingScreen, NavBar, GameContainer, Button, ResultsModal, useBugReporter } from '@grid-games/ui';
import { formatDisplayDate, getDateForPuzzleNumber, isValidPuzzleNumber, shareOrCopy } from '@grid-games/shared';
import { caromConfig, CAROM_LAUNCH_DATE } from '@/config';
import { useGameState } from '@/hooks/useGameState';
import { useReplay } from '@/hooks/useReplay';
import { getDailyPuzzle, getPuzzleFromPool } from '@/lib/puzzleGenerator';
import { buildReplayUrl } from '@/lib/replay';
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
import { ReplayControls } from './ReplayControls';
import { Direction, Puzzle, Move } from '@/types';

// Carom-specific wrapper for ResultsModal
interface CaromResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  moveCount: number;
  optimalMoves: number;
  achievedOptimal: boolean;
  puzzleNumber: number;
  puzzleId: string | undefined;
  moveHistory: Move[];
  isArchive: boolean;
}

function CaromResultsModal({
  isOpen,
  onClose,
  moveCount,
  optimalMoves,
  achievedOptimal,
  puzzleNumber,
  puzzleId,
  moveHistory,
  isArchive,
}: CaromResultsModalProps) {
  const [replayCopied, setReplayCopied] = useState(false);
  const movesText = moveCount === 1 ? 'move' : 'moves';

  // Check if user somehow got fewer moves than optimal (cheating/bug)
  const isCheating = moveCount < optimalMoves;

  // Build share text - skull for cheaters, trophy if optimal, checkmark otherwise
  const resultEmoji = isCheating ? ' 💀' : (achievedOptimal ? ' 🏆' : ' ✅');
  const baseUrl = 'https://nerdcube.games/carom';
  const puzzleUrl = isArchive ? `${baseUrl}?puzzle=${puzzleNumber}` : baseUrl;
  const shareText = `Carom #${puzzleNumber}\n${moveCount} ${movesText}${resultEmoji}\n\n${puzzleUrl}`;

  // Determine message type: success if optimal, neutral otherwise
  const messageType = isCheating ? 'neutral' : (achievedOptimal ? 'success' : 'neutral');

  // Handle share replay
  const handleShareReplay = useCallback(async () => {
    if (!puzzleId || moveHistory.length === 0) return;

    const replayUrl = buildReplayUrl(puzzleNumber, puzzleId, moveHistory);
    const result = await shareOrCopy(replayUrl);

    if (result.success && result.method === 'clipboard') {
      setReplayCopied(true);
      setTimeout(() => setReplayCopied(false), 2000);
    }
  }, [puzzleNumber, puzzleId, moveHistory]);

  // Share Replay button as additional action
  const shareReplayButton = puzzleId && moveHistory.length > 0 ? (
    <Button
      variant="secondary"
      fullWidth
      onClick={handleShareReplay}
    >
      {replayCopied ? 'Link Copied!' : 'Share Replay'}
    </Button>
  ) : undefined;

  return (
    <ResultsModal
      isOpen={isOpen}
      onClose={onClose}
      gameId="carom"
      gameName="Carom"
      puzzleNumber={puzzleNumber}
      primaryStat={{ value: moveCount, label: movesText }}
      shareConfig={{ text: shareText }}
      messageType={messageType}
      additionalActions={shareReplayButton}
    >
      {/* Trophy display if optimal, skull if cheating */}
      {isCheating ? (
        <div className="text-center">
          <div className="text-4xl mb-2">💀</div>
          <div className="text-[var(--muted)] font-medium">Impossible!</div>
        </div>
      ) : achievedOptimal ? (
        <div className="text-center">
          <div className="text-4xl mb-2">🏆</div>
          <div className="text-[var(--accent)] font-medium">Perfect Solution!</div>
        </div>
      ) : null}
    </ResultsModal>
  );
}

// Use the correctly-parsed launch date from config (includes T00:00:00 for local timezone)

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

  const router = useRouter();
  const bugReporter = useBugReporter();

  // Block access to future puzzles (unless in debug mode)
  useEffect(() => {
    if (isArchiveMode && !isDebug && archivePuzzleNumber !== null) {
      if (!isValidPuzzleNumber(CAROM_LAUNCH_DATE, archivePuzzleNumber)) {
        router.replace('/');
      }
    }
  }, [isArchiveMode, isDebug, archivePuzzleNumber, router]);

  const [activePuzzleId, setActivePuzzleId] = useState<string | undefined>(undefined);
  const { state, startGame, restoreGame, selectPiece, deselectPiece, movePiece, reset, replay, setFinished, undo, canUndo } = useGameState({ puzzleNumber: activePuzzleNumber, puzzleId: activePuzzleId });

  // Replay hook - must be called before any conditional returns
  const replayState = useReplay(state.puzzle, state.moveHistory);

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
            ? getDateForPuzzleNumber(CAROM_LAUNCH_DATE, activePuzzleNumber)
            : undefined; // undefined = today

          loadedPuzzle = await getDailyPuzzle(puzzleDateString);
        }

        setPuzzle(loadedPuzzle);
        setActivePuzzleId(loadedPuzzle.puzzleId);

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
          const puzzleState = getPuzzleState(activePuzzleNumber, loadedPuzzle.puzzleId);

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
      setAchievedOptimal(didAchieveOptimal(activePuzzleNumber, puzzle.puzzleId));

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
      }, activePuzzleId);
      // Small delay before showing results
      const timer = setTimeout(() => {
        setShowResults(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [state.phase, state.moveCount, state.puzzle, state.moveHistory, wasPlayingThisSession, activePuzzleNumber, activePuzzleId]);

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
          onReportBug={bugReporter.open}
        />
        <HowToPlayModal isOpen={showRules} onClose={() => setShowRules(false)} />
      </>
    );
  }

  // Playing / Finished states
  const isFinished = state.phase === 'finished';

  // Determine which pieces to show: replay pieces when finished, game pieces otherwise
  const displayPieces = isFinished ? replayState.pieces : state.pieces;

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
            onReportBug={bugReporter.open}
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
              pieces={displayPieces}
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
                className="p-2 rounded-lg bg-[var(--tile-bg)] text-[var(--foreground)] border border-[var(--tile-border)] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--tile-bg-selected)] hover:border-[var(--accent)]/40 transition-colors"
                aria-label="Undo last move"
                title="Undo"
              >
                <Undo2 className="w-5 h-5" />
              </button>
              <Button variant="secondary" onClick={reset} className="border border-[var(--tile-border)] hover:border-[var(--accent)]/40">
                Reset
              </Button>
            </div>
          )}

          {/* Replay controls and action buttons - show when finished */}
          {isFinished && (
            <div className="flex flex-col items-center gap-4">
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

              {/* Action buttons */}
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
            puzzleNumber={state.puzzle.puzzleNumber ?? activePuzzleNumber}
            puzzleId={activePuzzleId}
            moveHistory={state.moveHistory}
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
