'use client';

import { useState, useCallback, useRef } from 'react';
import { LandingScreen, NavBar, GameContainer, Button } from '@grid-games/ui';
import { Position } from '@/types';
import { useGameState } from '@/hooks/useGameState';
import { jumbleConfig } from '@/config';
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

  // Get puzzle info for display
  const puzzleInfo = jumbleConfig.getPuzzleInfo();

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-xl text-[var(--foreground)]">Loading...</div>
      </div>
    );
  }

  // Ready state - show landing screen
  if (status === 'ready') {
    return (
      <>
        <LandingScreen
          emoji={jumbleConfig.emoji}
          name={jumbleConfig.name}
          description={jumbleConfig.description}
          puzzleInfo={{ number: puzzleNumber, date: puzzleInfo.date }}
          onPlay={startGame}
          onRules={() => setShowHowToPlay(true)}
        >
          <Button variant="secondary" fullWidth onClick={() => setShowStats(true)}>
            Stats
          </Button>
        </LandingScreen>
        <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
        <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      </>
    );
  }

  // Finished state with results already shown
  if (status === 'finished') {
    return (
      <>
        <LandingScreen
          emoji={jumbleConfig.emoji}
          name={jumbleConfig.name}
          description="You've already played today!"
          puzzleInfo={{ number: puzzleNumber, date: puzzleInfo.date }}
          onPlay={() => setShowResults(true)}
        >
          <Button variant="secondary" fullWidth onClick={() => setShowStats(true)}>
            Stats
          </Button>
        </LandingScreen>
        <ResultsModal
          isOpen={showResults}
          onClose={() => setShowResults(false)}
          puzzleNumber={puzzleNumber}
          foundWords={foundWords}
          totalPossibleWords={allValidWords.size}
          score={totalScore}
        />
        <StatsModal isOpen={showStats} onClose={() => setShowStats(false)} />
      </>
    );
  }

  // Playing state
  return (
    <GameContainer
      maxWidth="md"
      navBar={
        <NavBar
          title={jumbleConfig.name}
          subtitle={`#${puzzleNumber}`}
          homeUrl={jumbleConfig.homeUrl}
          onRulesClick={() => setShowHowToPlay(true)}
          rightContent={<Timer timeRemaining={timeRemaining} />}
        />
      }
    >
      {/* Grid */}
      <div className="flex-shrink-0 mb-4 w-full">
        <BoggleGrid
          board={board}
          onPathChange={handlePathChange}
          onPathComplete={handlePathComplete}
          disabled={status !== 'playing'}
        />
      </div>

      {/* Current Word */}
      <div className="relative mb-4 w-full">
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
      <div className="mb-4 w-full">
        <FoundWordsList foundWords={foundWords} totalScore={totalScore} />
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-center gap-3 mt-auto pt-4 w-full max-w-xs">
        <Button variant="secondary" onClick={() => setShowStats(true)}>
          Stats
        </Button>
        <Button
          variant="primary"
          onClick={handleEndGame}
          className="!bg-[var(--danger)] hover:!bg-[var(--danger)]/80"
        >
          End Game
        </Button>
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
    </GameContainer>
  );
}
