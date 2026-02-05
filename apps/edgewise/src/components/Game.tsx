'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { LandingScreen, NavBar, GameContainer, Button, DebugPanel, DebugButton, ResultsModal } from '@grid-games/ui';
import { getTodayDateString, formatDisplayDate, getPuzzleNumber, buildShareText } from '@grid-games/shared';

import { GameBoard } from './GameBoard';
import { AttemptsIndicator } from './AttemptsIndicator';
import { FeedbackHistory } from './FeedbackDots';
import { HowToPlayModal } from './HowToPlayModal';

import { getTodayPuzzle, initializeGameState, getRandomPuzzle } from '@/lib/puzzleLoader';
import {
  rotateSquare,
  groupRotate,
  checkAllCategories,
  generateFeedback,
  isPuzzleSolved,
} from '@/lib/gameLogic';
import {
  getTodayResult,
  saveDailyResult,
  saveGameState,
  getSavedGameState,
  restoreSquaresFromState,
  clearGameState,
  clearDailyResult,
} from '@/lib/storage';

import { edgewiseConfig } from '@/config';
import { PUZZLE_BASE_DATE, MAX_ATTEMPTS } from '@/constants/gameConfig';
import { GameState, SquareState, Puzzle, GuessFeedback, CategoryPosition } from '@/types';

// Edgewise-specific wrapper for ResultsModal
interface EdgewiseResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTryAgain: () => void;
  solved: boolean;
  guessesUsed: number;
  feedbackHistory: GuessFeedback[];
  puzzleDate: string;
  puzzleNumber: number;
}

function EdgewiseResultsModal({
  isOpen,
  onClose,
  onTryAgain,
  solved,
  guessesUsed,
  feedbackHistory,
  puzzleDate,
  puzzleNumber,
}: EdgewiseResultsModalProps) {
  // Generate emoji grid from feedback history
  const generateEmojiGrid = (): string => {
    return feedbackHistory
      .map((feedback) => {
        const sorted = [...feedback].sort((a, b) => b - a);
        return sorted
          .map((v) => {
            if (v === 2) return '🟢';
            if (v === 1) return '🟡';
            return '⚪';
          })
          .join('');
      })
      .join('\n');
  };

  const emojiGrid = generateEmojiGrid();

  const shareText = buildShareText({
    gameId: 'edgewise',
    gameName: 'Edgewise',
    puzzleId: puzzleDate,
    score: guessesUsed,
    maxScore: 4,
    emojiGrid,
    extraLines: [solved ? '🎉' : ''],
    shareUrl: 'https://nerdcube.games/edgewise',
  });

  return (
    <ResultsModal
      isOpen={isOpen}
      onClose={onClose}
      gameId="edgewise"
      gameName="Edgewise"
      date={puzzleDate}
      primaryStat={{
        value: solved ? guessesUsed : '❌',
        label: solved ? (guessesUsed === 1 ? 'guess' : 'guesses') : 'not solved',
      }}
      secondaryStats={
        solved
          ? [{ label: '', value: `Edgewise #${puzzleNumber}` }]
          : undefined
      }
      shareConfig={{ text: shareText }}
    >
      {/* Feedback history visualization */}
      <div className="flex flex-col items-center gap-2 py-2">
        {feedbackHistory.map((feedback, index) => {
          const sorted = [...feedback].sort((a, b) => b - a);
          return (
            <div key={index} className="flex gap-1">
              {sorted.map((v, i) => (
                <div
                  key={i}
                  className={`w-5 h-5 rounded-full ${
                    v === 2 ? 'bg-[var(--success)]' : v === 1 ? 'bg-[var(--warning)]' : 'bg-[var(--muted)] opacity-50'
                  }`}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Try Again button */}
      <div className="mt-4">
        <Button onClick={onTryAgain} variant="secondary" fullWidth>
          Try Again
        </Button>
      </div>
    </ResultsModal>
  );
}

export function Game() {
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';

  const [gameState, setGameState] = useState<GameState>('landing');
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
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

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [landingMode, setLandingMode] = useState<'fresh' | 'in-progress' | 'completed'>('fresh');

  const dateStr = getTodayDateString();
  const puzzleNumber = getPuzzleNumber(PUZZLE_BASE_DATE);

  // Initialize puzzle on mount
  useEffect(() => {
    const loadedPuzzle = getTodayPuzzle();
    if (loadedPuzzle) {
      setPuzzle(loadedPuzzle);

      // Check if already played today
      const todayResult = getTodayResult();
      if (todayResult && !isDebug) {
        // Set landing mode for completed game
        setLandingMode('completed');

        // Restore finished state
        setSolved(todayResult.solved);
        setGuessesUsed(todayResult.guessesUsed);
        setFeedbackHistory(todayResult.feedbackHistory);
        setGameState('finished');

        // Initialize squares to solved state if won
        const initialSquares = initializeGameState(loadedPuzzle, dateStr);
        if (todayResult.solved) {
          // Show solved configuration
          setSquares(loadedPuzzle.squares.map(sq => ({
            words: [sq.top, sq.right, sq.bottom, sq.left],
            rotation: 0,
          })));
          setCategoryResults({ top: true, right: true, bottom: true, left: true });
        } else {
          setSquares(initialSquares);
        }
      } else {
        // Check for in-progress game
        const savedState = getSavedGameState();
        if (savedState && !isDebug) {
          // Set landing mode for in-progress game
          setLandingMode('in-progress');

          const initialSquares = initializeGameState(loadedPuzzle, dateStr);
          const restoredSquares = restoreSquaresFromState(initialSquares, savedState);
          setSquares(restoredSquares);
          setGuessesUsed(savedState.guessesUsed);
          setFeedbackHistory(savedState.feedbackHistory as GuessFeedback[]);
        } else {
          // Start fresh
          const initialSquares = initializeGameState(loadedPuzzle, dateStr);
          setSquares(initialSquares);
        }
      }
    }
  }, [dateStr, isDebug]);

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
      saveGameState(newSquares, guessesUsed, feedbackHistory);

      return newSquares;
    });

    // Reset category results when making changes
    setCategoryResults({ top: null, right: null, bottom: null, left: null });
  }, [gameState, guessesUsed, feedbackHistory]);

  // Handle group rotation
  const handleGroupRotate = useCallback(() => {
    if (gameState !== 'playing') return;

    setSquares(prev => {
      const newSquares = groupRotate(prev);

      // Save state
      saveGameState(newSquares, guessesUsed, feedbackHistory);

      return newSquares;
    });

    // Reset category results when making changes
    setCategoryResults({ top: null, right: null, bottom: null, left: null });
  }, [gameState, guessesUsed, feedbackHistory]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!puzzle || gameState !== 'playing') return;

    const results = checkAllCategories(squares, puzzle);
    const feedback = generateFeedback(results);
    const newGuessesUsed = guessesUsed + 1;

    // Update category results for visual feedback
    const newCategoryResults: Record<CategoryPosition, boolean | null> = {
      top: results.find(r => r.category === 'top')?.correct ?? null,
      right: results.find(r => r.category === 'right')?.correct ?? null,
      bottom: results.find(r => r.category === 'bottom')?.correct ?? null,
      left: results.find(r => r.category === 'left')?.correct ?? null,
    };
    setCategoryResults(newCategoryResults);

    const newFeedbackHistory = [...feedbackHistory, feedback];
    setFeedbackHistory(newFeedbackHistory);
    setGuessesUsed(newGuessesUsed);

    // Check win/lose
    const isSolved = isPuzzleSolved(squares, puzzle);

    if (isSolved) {
      setSolved(true);
      setGameState('finished');
      clearGameState();
      saveDailyResult({
        date: dateStr,
        puzzleNumber,
        solved: true,
        guessesUsed: newGuessesUsed,
        feedbackHistory: newFeedbackHistory,
      });
      setShowResults(true);
    } else if (newGuessesUsed >= MAX_ATTEMPTS) {
      setSolved(false);
      setGameState('finished');
      clearGameState();
      saveDailyResult({
        date: dateStr,
        puzzleNumber,
        solved: false,
        guessesUsed: newGuessesUsed,
        feedbackHistory: newFeedbackHistory,
      });
      setShowResults(true);
    } else {
      // Save in-progress state
      saveGameState(squares, newGuessesUsed, newFeedbackHistory);
    }
  }, [puzzle, squares, guessesUsed, feedbackHistory, gameState, dateStr, puzzleNumber]);

  // Handle try again - reset game state and replay
  const handleTryAgain = useCallback(() => {
    if (!puzzle) return;

    // Clear all saved progress
    clearGameState();
    clearDailyResult();

    // Reset game state
    const initialSquares = initializeGameState(puzzle, dateStr);
    setSquares(initialSquares);
    setGuessesUsed(0);
    setFeedbackHistory([]);
    setSolved(false);
    setCategoryResults({ top: null, right: null, bottom: null, left: null });

    // Back to playing
    setGameState('playing');
    setShowResults(false);
  }, [puzzle, dateStr]);

  // Handle regenerate puzzle (debug mode)
  const handleNewPuzzle = useCallback(() => {
    const result = getRandomPuzzle();
    if (!result) return;

    const { puzzle: newPuzzle, dateStr: newDateStr } = result;
    setPuzzle(newPuzzle);

    const initialSquares = initializeGameState(newPuzzle, newDateStr);
    setSquares(initialSquares);
    setGuessesUsed(0);
    setFeedbackHistory([]);
    setSolved(false);
    setCategoryResults({ top: null, right: null, bottom: null, left: null });
    setGameState('playing');
    setShowResults(false);
  }, []);

  // Render landing screen
  if (gameState === 'landing') {
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
            const todayResult = getTodayResult();
            if (todayResult && puzzle) {
              setSolved(todayResult.solved);
              setGuessesUsed(todayResult.guessesUsed);
              setFeedbackHistory(todayResult.feedbackHistory);
              if (todayResult.solved) {
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
        />
        <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      </>
    );
  }

  // Render main game
  if (!puzzle) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <p className="text-[var(--muted)]">Loading puzzle...</p>
      </div>
    );
  }

  const navBar = (
    <NavBar
      title={`${edgewiseConfig.name} #${puzzleNumber}`}
      gameId={edgewiseConfig.id}
      onRulesClick={() => setShowHowToPlay(true)}
    />
  );

  return (
    <GameContainer navBar={navBar}>
      <div className="flex flex-col items-center gap-4 py-4 px-2">
        {/* Attempts indicator */}
        <AttemptsIndicator attemptsUsed={guessesUsed} />

        {/* Game board */}
        <GameBoard
          squares={squares}
          puzzle={puzzle}
          onRotateSquare={handleRotateSquare}
          onGroupRotate={handleGroupRotate}
          categoryResults={categoryResults}
          disabled={gameState === 'finished'}
        />

        {/* Feedback history */}
        {feedbackHistory.length > 0 && (
          <div className="mt-2">
            <FeedbackHistory history={feedbackHistory} />
          </div>
        )}

        {/* Submit button */}
        {gameState === 'playing' && (
          <Button
            onClick={handleSubmit}
            variant="primary"
            size="lg"
            disabled={guessesUsed >= MAX_ATTEMPTS}
          >
            Submit
          </Button>
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
        onTryAgain={handleTryAgain}
        solved={solved}
        guessesUsed={guessesUsed}
        feedbackHistory={feedbackHistory}
        puzzleDate={formatDisplayDate(dateStr)}
        puzzleNumber={puzzleNumber}
      />

      {/* Debug Panel */}
      {isDebug && (
        <DebugPanel>
          <div>Puzzle #{puzzleNumber}</div>
          <div>Guesses: {guessesUsed}/{MAX_ATTEMPTS}</div>
          <DebugButton onClick={handleNewPuzzle} />
        </DebugPanel>
      )}
    </GameContainer>
  );
}
