'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { LandingScreen, NavBar, GameContainer, Button, ResultsModal, useBugReporter, useToast } from '@grid-games/ui';
import { formatDisplayDate, buildShareText } from '@grid-games/shared';

import { GameBoard } from './GameBoard';
import { AttemptsIndicator } from './AttemptsIndicator';
import { HowToPlayModal } from './HowToPlayModal';

import {
  loadPuzzleByNumber,
  initializeGameState,
  getDateForPuzzleNumber,
} from '@/lib/puzzleLoader';
import {
  rotateSquare,
  groupRotate,
  checkAllCategories,
  generateFeedback,
  isPuzzleSolved,
} from '@/lib/gameLogic';
import {
  getTodayPuzzleNumber,
  findPuzzleState,
  saveGameProgress,
  saveGameCompletion,
  restoreSquaresFromRotations,
  clearPuzzleState,
} from '@/lib/storage';

import { edgewiseConfig } from '@/config';
import { MAX_ATTEMPTS } from '@/constants/gameConfig';
import { GameState, SquareState, Puzzle, GuessFeedback, CategoryPosition } from '@/types';

// Create a unique key for the current board configuration
function getBoardConfigKey(squares: SquareState[]): string {
  // Use the first word of each square (identifies which square) + rotation
  return squares.map(s => `${s.words[0]}:${s.rotation}`).join('|');
}

// Edgewise-specific wrapper for ResultsModal
interface EdgewiseResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  solved: boolean;
  guessesUsed: number;
  feedbackHistory: GuessFeedback[];
  puzzleDate: string;
  puzzleNumber: number;
}

function EdgewiseResultsModal({
  isOpen,
  onClose,
  solved,
  guessesUsed,
  feedbackHistory,
  puzzleNumber,
}: EdgewiseResultsModalProps) {
  // Generate emoji line showing guess history (❌ for wrong, ✅ for win)
  const generateGuessEmojis = (): string => {
    return feedbackHistory.map((feedback) => {
      const isWin = feedback.filter(v => v === 2).length === 4;
      return isWin ? '✅' : '❌';
    }).join('');
  };

  const emojiLine = generateGuessEmojis();

  const shareText = buildShareText({
    gameId: 'edgewise',
    gameName: 'Edgewise',
    puzzleId: puzzleNumber,
    score: guessesUsed,
    maxScore: 4,
    emojiGrid: emojiLine,
    shareUrl: 'https://nerdcube.games/edgewise',
  });

  // Determine message type: success if solved, failure otherwise
  const messageType = solved ? 'success' : 'failure';

  return (
    <ResultsModal
      isOpen={isOpen}
      onClose={onClose}
      gameId="edgewise"
      gameName="Edgewise"
      puzzleNumber={puzzleNumber}
      primaryStat={{
        value: solved ? guessesUsed : '❌',
        label: solved ? (guessesUsed === 1 ? 'guess' : 'guesses') : 'not solved',
      }}
      shareConfig={{ text: shareText }}
      messageType={messageType}
    />
  );
}

export function Game() {
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';
  const puzzleParam = searchParams.get('puzzle');
  const bugReporter = useBugReporter();
  const toast = useToast();

  // Determine if this is an archive puzzle
  const todayPuzzleNumber = getTodayPuzzleNumber();
  const requestedPuzzleNumber = puzzleParam ? parseInt(puzzleParam, 10) : todayPuzzleNumber;
  const isArchive = puzzleParam !== null && requestedPuzzleNumber !== todayPuzzleNumber;

  const [gameState, setGameState] = useState<GameState>('landing');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [puzzleId, setPuzzleId] = useState<string | undefined>(undefined);
  const [puzzleNumber, setPuzzleNumber] = useState(requestedPuzzleNumber);
  const [squares, setSquares] = useState<SquareState[]>([]);
  const [guessesUsed, setGuessesUsed] = useState(0);
  const [feedbackHistory, setFeedbackHistory] = useState<GuessFeedback[]>([]);
  const [solved, setSolved] = useState(false);
  const [categoryResults, setCategoryResults] = useState<Record<CategoryPosition, boolean | null>>({
    top: null,
    right: null,
    bottom: null,
    left: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [landingMode, setLandingMode] = useState<'fresh' | 'in-progress' | 'completed'>('fresh');
  const [guessedConfigs, setGuessedConfigs] = useState<Set<string>>(new Set());
  const [shake, setShake] = useState(false);

  const dateStr = getDateForPuzzleNumber(puzzleNumber);

  // Initialize puzzle on mount
  useEffect(() => {
    async function loadPuzzle() {
      setIsLoading(true);

      const result = await loadPuzzleByNumber(requestedPuzzleNumber);
      if (!result) {
        console.error(`[edgewise] Failed to load puzzle #${requestedPuzzleNumber}`);
        setIsLoading(false);
        return;
      }

      const { puzzle: loadedPuzzle, puzzleId: loadedPuzzleId } = result;
      setPuzzle(loadedPuzzle);
      setPuzzleId(loadedPuzzleId);
      setPuzzleNumber(requestedPuzzleNumber);

      const puzzleDateStr = getDateForPuzzleNumber(requestedPuzzleNumber);

      // Check for existing state for this puzzle
      const existingState = findPuzzleState(requestedPuzzleNumber);
      const stateMatchesPuzzleId = !loadedPuzzleId || !existingState?.puzzleId || existingState.puzzleId === loadedPuzzleId;

      if (existingState && stateMatchesPuzzleId && !isDebug) {
        if (existingState.status === 'completed') {
          // Set landing mode for completed game
          setLandingMode('completed');

          // Restore finished state
          setSolved(existingState.data.solved ?? false);
          setGuessesUsed(existingState.data.guessesUsed);
          setFeedbackHistory(existingState.data.feedbackHistory);

          // For archive puzzles, skip landing and go straight to finished state
          if (isArchive) {
            setGameState('finished');
          } else {
            setGameState('finished');
          }

          // Initialize squares to solved state if won
          const initialSquares = initializeGameState(loadedPuzzle, puzzleDateStr);
          if (existingState.data.solved) {
            // Show solved configuration
            setSquares(loadedPuzzle.squares.map(sq => ({
              words: [sq.top, sq.right, sq.bottom, sq.left],
              rotation: 0,
            })));
            setCategoryResults({ top: true, right: true, bottom: true, left: true });
          } else {
            setSquares(initialSquares);
          }
        } else if (existingState.status === 'in-progress') {
          // Set landing mode for in-progress game
          setLandingMode('in-progress');

          const initialSquares = initializeGameState(loadedPuzzle, puzzleDateStr);
          const restoredSquares = restoreSquaresFromRotations(initialSquares, existingState.data.squareRotations);
          setSquares(restoredSquares);
          setGuessesUsed(existingState.data.guessesUsed);
          setFeedbackHistory(existingState.data.feedbackHistory);

          // For archive puzzles, skip landing
          if (isArchive) {
            setGameState('playing');
          }
        }
      } else {
        // Start fresh
        const initialSquares = initializeGameState(loadedPuzzle, puzzleDateStr);
        setSquares(initialSquares);
        setLandingMode('fresh');

        // For archive puzzles, skip landing and go straight to playing
        if (isArchive) {
          setGameState('playing');
        }
      }

      setIsLoading(false);
    }

    loadPuzzle();
  }, [requestedPuzzleNumber, isDebug, isArchive]);

  // Handle starting the game
  const handlePlay = useCallback(() => {
    setGameState('playing');
  }, []);

  // Handle rotating a single square
  const handleRotateSquare = useCallback((index: number) => {
    if (gameState !== 'playing') return;

    setSquares(prev => {
      const newSquares = [...prev];
      newSquares[index] = rotateSquare(newSquares[index]);

      // Save state
      saveGameProgress(puzzleNumber, newSquares, guessesUsed, feedbackHistory, puzzleId);

      return newSquares;
    });

    // Reset category results when making changes
    setCategoryResults({ top: null, right: null, bottom: null, left: null });
  }, [gameState, guessesUsed, feedbackHistory, puzzleNumber, puzzleId]);

  // Handle group rotation
  const handleGroupRotate = useCallback(() => {
    if (gameState !== 'playing') return;

    setSquares(prev => {
      const newSquares = groupRotate(prev);

      // Save state
      saveGameProgress(puzzleNumber, newSquares, guessesUsed, feedbackHistory, puzzleId);

      return newSquares;
    });

    // Reset category results when making changes
    setCategoryResults({ top: null, right: null, bottom: null, left: null });
  }, [gameState, guessesUsed, feedbackHistory, puzzleNumber, puzzleId]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!puzzle || gameState !== 'playing') return;

    // Check if this configuration was already guessed
    const configKey = getBoardConfigKey(squares);
    if (guessedConfigs.has(configKey)) {
      toast.show('Already guessed this arrangement', 'info');
      return;
    }

    // Track this configuration
    setGuessedConfigs(prev => new Set(prev).add(configKey));

    const results = checkAllCategories(squares, puzzle);
    const feedback = generateFeedback(results);
    const newGuessesUsed = guessesUsed + 1;

    const newFeedbackHistory = [...feedbackHistory, feedback];
    setFeedbackHistory(newFeedbackHistory);
    setGuessesUsed(newGuessesUsed);

    // Check win/lose
    const isSolved = isPuzzleSolved(squares, puzzle);

    if (isSolved) {
      // Only show category completion styling on full solve
      setCategoryResults({ top: true, right: true, bottom: true, left: true });
      setSolved(true);
      setGameState('finished');
      // Clear in-progress state first
      clearPuzzleState(puzzleNumber, puzzleId);
      saveGameCompletion(puzzleNumber, squares, newGuessesUsed, newFeedbackHistory, true, puzzleId);
      setShowResults(true);
    } else if (newGuessesUsed >= MAX_ATTEMPTS) {
      // Trigger shake on final wrong guess
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setSolved(false);
      setGameState('finished');
      // Clear in-progress state first
      clearPuzzleState(puzzleNumber, puzzleId);
      saveGameCompletion(puzzleNumber, squares, newGuessesUsed, newFeedbackHistory, false, puzzleId);
      setShowResults(true);
    } else {
      // Trigger shake on wrong guess
      setShake(true);
      setTimeout(() => setShake(false), 500);
      // Save in-progress state
      saveGameProgress(puzzleNumber, squares, newGuessesUsed, newFeedbackHistory, puzzleId);
    }
  }, [puzzle, squares, guessesUsed, feedbackHistory, gameState, puzzleNumber, puzzleId, guessedConfigs, toast]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[var(--muted)]">Loading puzzle...</p>
      </div>
    );
  }

  // Render landing screen (only for today's puzzle)
  if (gameState === 'landing' && !isArchive) {
    return (
      <>
        <LandingScreen
          icon={edgewiseConfig.icon}
          name={edgewiseConfig.name}
          description={edgewiseConfig.description}
          puzzleInfo={edgewiseConfig.getPuzzleInfo()}
          mode={landingMode}
          onPlay={handlePlay}
          onResume={handlePlay}
          onSeeResults={() => {
            // Restore finished state - don't open modal, just show the completed board
            const existingState = findPuzzleState(puzzleNumber);
            if (existingState?.status === 'completed' && puzzle) {
              setSolved(existingState.data.solved ?? false);
              setGuessesUsed(existingState.data.guessesUsed);
              setFeedbackHistory(existingState.data.feedbackHistory);
              if (existingState.data.solved) {
                setSquares(puzzle.squares.map(sq => ({
                  words: [sq.top, sq.right, sq.bottom, sq.left],
                  rotation: 0,
                })));
                setCategoryResults({ top: true, right: true, bottom: true, left: true });
              }
              setGameState('finished');
            }
          }}
          onRules={() => setShowHowToPlay(true)}
          gameId="edgewise"
          archiveHref="/archive"
          onReportBug={bugReporter.open}
        />
        <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      </>
    );
  }

  // Render main game
  if (!puzzle) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[var(--muted)]">Puzzle not found</p>
      </div>
    );
  }

  const navBar = (
    <NavBar
      title={`${edgewiseConfig.name} #${puzzleNumber}`}
      gameId={edgewiseConfig.id}
      onRulesClick={() => setShowHowToPlay(true)}
      onReportBug={bugReporter.open}
    />
  );

  return (
    <GameContainer navBar={navBar}>
      <div className="flex flex-col items-center gap-4 py-4 px-2">
        {/* Game board */}
        <GameBoard
          squares={squares}
          puzzle={puzzle}
          onRotateSquare={handleRotateSquare}
          onGroupRotate={handleGroupRotate}
          categoryResults={categoryResults}
          disabled={gameState === 'finished'}
          shake={shake}
        />

        {/* Attempts indicator and Submit button */}
        {gameState === 'playing' && (
          <div className="flex flex-col items-center gap-3">
            <AttemptsIndicator attemptsUsed={guessesUsed} />
            <Button
              onClick={handleSubmit}
              variant="primary"
              size="lg"
              disabled={guessesUsed >= MAX_ATTEMPTS}
            >
              Submit
            </Button>
          </div>
        )}

        {/* Show results button when finished */}
        {gameState === 'finished' && (
          <Button
            onClick={() => setShowResults(true)}
            variant="primary"
            size="lg"
          >
            View Results
          </Button>
        )}
      </div>

      {/* Modals */}
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <EdgewiseResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        solved={solved}
        guessesUsed={guessesUsed}
        feedbackHistory={feedbackHistory}
        puzzleDate={formatDisplayDate(dateStr)}
        puzzleNumber={puzzleNumber}
      />

    </GameContainer>
  );
}
