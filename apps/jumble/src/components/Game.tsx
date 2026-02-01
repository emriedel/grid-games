'use client';

import { useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { LandingScreen, NavBar, GameContainer, DebugPanel, DebugButton } from '@grid-games/ui';
import { Position } from '@/types';
import { useGameState } from '@/hooks/useGameState';
import { jumbleConfig } from '@/config';
import BoggleGrid from './BoggleGrid';
import Timer from './Timer';
import CurrentWord from './CurrentWord';
import FoundWordsList from './FoundWordsList';
import ResultsModal from './ResultsModal';
import HowToPlayModal from './HowToPlayModal';

export default function Game() {
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';

  const {
    board,
    foundWords,
    currentWord,
    status,
    timeRemaining,
    totalScore,
    allValidWords,
    maxPossibleScore,
    setCurrentPath,
    submitWord,
    startGame,
    isWordAlreadyFound,
    regeneratePuzzle,
  } = useGameState();

  const [showResults, setShowResults] = useState(false);
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
          icon={jumbleConfig.icon}
          name={jumbleConfig.name}
          description={jumbleConfig.description}
          puzzleInfo={{ date: puzzleInfo.date }}
          onPlay={startGame}
          onRules={() => setShowHowToPlay(true)}
          homeUrl="/"
        />
        <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      </>
    );
  }

  // Finished state with results already shown
  if (status === 'finished') {
    return (
      <>
        <LandingScreen
          icon={jumbleConfig.icon}
          name={jumbleConfig.name}
          description="You've already played today!"
          puzzleInfo={{ date: puzzleInfo.date }}
          onPlay={() => setShowResults(true)}
          homeUrl="/"
        />
        <ResultsModal
          isOpen={showResults}
          onClose={() => setShowResults(false)}
          foundWords={foundWords}
          score={totalScore}
        />
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
          gameId={jumbleConfig.id}
          onRulesClick={() => setShowHowToPlay(true)}
          rightContent={<Timer timeRemaining={timeRemaining} />}
        />
      }
    >
      {/* Current Word - Above the grid */}
      <div className="relative mb-4 w-full">
        <CurrentWord
          word={currentWord}
          isAlreadyFound={isWordAlreadyFound(currentWord)}
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

      {/* Grid */}
      <div className="flex-shrink-0 mb-4 w-full">
        <BoggleGrid
          board={board}
          onPathChange={handlePathChange}
          onPathComplete={handlePathComplete}
          disabled={status !== 'playing'}
        />
      </div>

      {/* Found Words */}
      <div className="mb-4 w-full">
        <FoundWordsList foundWords={foundWords} totalScore={totalScore} />
      </div>

      {/* Modals */}
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <ResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        foundWords={foundWords}
        score={totalScore}
      />

      {/* Debug Panel */}
      {isDebug && (
        <DebugPanel>
          <div>Words: {allValidWords.size} | Max: {maxPossibleScore}pts</div>
          <DebugButton onClick={regeneratePuzzle} />
        </DebugPanel>
      )}
    </GameContainer>
  );
}
