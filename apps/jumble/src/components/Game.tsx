'use client';

import { useState, useCallback, useRef } from 'react';
import { Position } from '@/types';
import { useGameState } from '@/hooks/useGameState';
import BoggleGrid from './BoggleGrid';
import Timer from './Timer';
import CurrentWord from './CurrentWord';
import FoundWordsList from './FoundWordsList';
import ResultsModal from './ResultsModal';
import StatsModal from './StatsModal';
import HowToPlayModal from './HowToPlayModal';

export default function Game() {
  const {
    board,
    foundWords,
    currentWord,
    status,
    timeRemaining,
    puzzleNumber,
    totalScore,
    allValidWords,
    setCurrentPath,
    submitWord,
    startGame,
    endGame,
    isWordAlreadyFound,
  } = useGameState();

  const [showResults, setShowResults] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; word: string } | null>(null);

  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showFeedback = useCallback((type: 'success' | 'error', word: string) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setFeedback({ type, word });
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, 1000);
  }, []);

  const handlePathChange = useCallback((path: Position[]) => {
    setCurrentPath(path);
  }, [setCurrentPath]);

  const handlePathComplete = useCallback((path: Position[]) => {
    const success = submitWord(path);
    if (success && currentWord) {
      showFeedback('success', currentWord);
    } else if (currentWord && !success) {
      showFeedback('error', currentWord);
    }
    setCurrentPath([]);
  }, [submitWord, currentWord, showFeedback, setCurrentPath]);

  const handleClearPath = useCallback(() => {
    setCurrentPath([]);
  }, [setCurrentPath]);

  const handleEndGame = useCallback(() => {
    endGame();
    setShowResults(true);
  }, [endGame]);

  // Watch for status change to finished
  if (status === 'finished' && !showResults && foundWords.length > 0) {
    setShowResults(true);
  }

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  // Ready state - show start button
  if (status === 'ready') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] p-4">
        <h1 className="text-4xl font-bold mb-2">JUMBLE</h1>
        <p className="text-lg opacity-60 mb-8">#{puzzleNumber}</p>

        <button
          onClick={startGame}
          className="
            px-8 py-4 rounded-xl text-xl font-bold
            bg-[var(--accent)] hover:opacity-90
            transition-opacity
          "
        >
          Start Game
        </button>

        <div className="flex gap-4 mt-8">
          <button
            onClick={() => setShowHowToPlay(true)}
            className="px-4 py-2 rounded-lg bg-[var(--tile-bg)] hover:bg-[var(--tile-bg-selected)]"
          >
            How to Play
          </button>
          <button
            onClick={() => setShowStats(true)}
            className="px-4 py-2 rounded-lg bg-[var(--tile-bg)] hover:bg-[var(--tile-bg-selected)]"
          >
            Stats
          </button>
        </div>

        <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
        <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      </div>
    );
  }

  // Finished state with results already shown
  if (status === 'finished') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] p-4">
        <h1 className="text-4xl font-bold mb-2">JUMBLE</h1>
        <p className="text-lg opacity-60 mb-4">#{puzzleNumber}</p>
        <p className="text-xl mb-8">You&apos;ve already played today!</p>

        <div className="flex gap-4">
          <button
            onClick={() => setShowResults(true)}
            className="px-6 py-3 rounded-lg bg-[var(--accent)] hover:opacity-90"
          >
            View Results
          </button>
          <button
            onClick={() => setShowStats(true)}
            className="px-6 py-3 rounded-lg bg-[var(--tile-bg)] hover:bg-[var(--tile-bg-selected)]"
          >
            Stats
          </button>
        </div>

        <ResultsModal
          isOpen={showResults}
          onClose={() => setShowResults(false)}
          puzzleNumber={puzzleNumber}
          foundWords={foundWords}
          totalPossibleWords={allValidWords.size}
          score={totalScore}
        />
        <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      </div>
    );
  }

  // Playing state
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">JUMBLE #{puzzleNumber}</h1>
        <Timer timeRemaining={timeRemaining} />
      </div>

      {/* Grid */}
      <div className="flex-shrink-0 mb-4">
        <BoggleGrid
          board={board}
          onPathChange={handlePathChange}
          onPathComplete={handlePathComplete}
          disabled={status !== 'playing'}
        />
      </div>

      {/* Current Word */}
      <div className="relative mb-4">
        <CurrentWord
          word={currentWord}
          isAlreadyFound={isWordAlreadyFound(currentWord)}
          onClear={handleClearPath}
        />
        {/* Feedback toast */}
        {feedback && (
          <div
            className={`
              absolute inset-0 flex items-center justify-center
              text-xl font-bold animate-pulse
              ${feedback.type === 'success' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}
            `}
          >
            {feedback.type === 'success' ? `+${foundWords[foundWords.length - 1]?.score || 0}` : 'Invalid'}
          </div>
        )}
      </div>

      {/* Found Words */}
      <div className="mb-4">
        <FoundWordsList foundWords={foundWords} totalScore={totalScore} />
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-center gap-4 mt-auto pt-4">
        <button
          onClick={() => setShowHowToPlay(true)}
          className="px-4 py-2 rounded-lg bg-[var(--tile-bg)] hover:bg-[var(--tile-bg-selected)]"
        >
          ?
        </button>
        <button
          onClick={() => setShowStats(true)}
          className="px-4 py-2 rounded-lg bg-[var(--tile-bg)] hover:bg-[var(--tile-bg-selected)]"
        >
          Stats
        </button>
        <button
          onClick={handleEndGame}
          className="px-4 py-2 rounded-lg bg-[var(--danger)] hover:opacity-90"
        >
          End Game
        </button>
      </div>

      {/* Modals */}
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      <ResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        puzzleNumber={puzzleNumber}
        foundWords={foundWords}
        totalPossibleWords={allValidWords.size}
        score={totalScore}
      />
    </div>
  );
}
