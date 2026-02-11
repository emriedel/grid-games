'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LandingScreen, NavBar, GameContainer, ResultsModal } from '@grid-games/ui';
import { formatDisplayDate, getDateForPuzzleNumber, isValidPuzzleNumber } from '@grid-games/shared';
import { Position, FoundWord } from '@/types';
import { useGameState } from '@/hooks/useGameState';
import { jumbleConfig, PUZZLE_BASE_DATE } from '@/config';
import { formatStars } from '@/constants/gameConfig';
import BoggleGrid from './BoggleGrid';
import Timer from './Timer';
import CurrentWord from './CurrentWord';
import FoundWordsList from './FoundWordsList';
import HowToPlayModal from './HowToPlayModal';

// Jumble-specific wrapper for ResultsModal
interface JumbleResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  foundWords: FoundWord[];
  score: number;
  stars: number;
  puzzleNumber?: number;
  isArchiveMode?: boolean;
}

function JumbleResultsModal({
  isOpen,
  onClose,
  foundWords,
  score,
  stars,
  puzzleNumber,
  isArchiveMode,
}: JumbleResultsModalProps) {
  // Build simplified share text
  const shareText = [
    `Jumble #${puzzleNumber || 0}`,
    `${score} pts ${formatStars(stars)}`,
    `${foundWords.length} words`,
    '',
    isArchiveMode && puzzleNumber
      ? `https://nerdcube.games/jumble?puzzle=${puzzleNumber}`
      : 'https://nerdcube.games/jumble',
  ].join('\n');

  return (
    <ResultsModal
      isOpen={isOpen}
      onClose={onClose}
      gameId="jumble"
      gameName="Jumble"
      puzzleNumber={puzzleNumber}
      primaryStat={{ value: score, label: 'points' }}
      shareConfig={{ text: shareText }}
    >
      {/* Stars display */}
      <div className="text-center mb-4">
        <span className="text-3xl text-[var(--foreground)]">{formatStars(stars)}</span>
      </div>
      {/* Words count */}
      <div className="text-center text-[var(--muted)]">
        {foundWords.length} words found
      </div>
    </ResultsModal>
  );
}

// Use imported PUZZLE_BASE_DATE from config

export default function Game() {
  const searchParams = useSearchParams();
  const isDebug = searchParams.get('debug') === 'true';
  const puzzleParam = searchParams.get('puzzle');

  // Determine if this is archive mode
  const archivePuzzleNumber = puzzleParam ? parseInt(puzzleParam, 10) : null;

  const router = useRouter();

  // Block access to future puzzles (unless in debug mode)
  useEffect(() => {
    if (archivePuzzleNumber !== null && !isDebug) {
      if (!isValidPuzzleNumber(PUZZLE_BASE_DATE, archivePuzzleNumber)) {
        router.replace('/');
      }
    }
  }, [archivePuzzleNumber, isDebug, router]);

  const {
    board,
    foundWords,
    currentWord,
    status,
    timeRemaining,
    puzzleNumber,
    totalScore,
    allValidWords,
    maxPossibleScore,
    stars,
    setCurrentPath,
    submitWord,
    startGame,
    resumeGame,
    resetGame,
    isWordAlreadyFound,
    regeneratePuzzle,
    hasInProgress,
    hasCompleted,
    isArchiveMode,
  } = useGameState({ archivePuzzleNumber });

  const [showResults, setShowResults] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; word: string; message?: string } | null>(null);
  const [landingMode, setLandingMode] = useState<'fresh' | 'in-progress' | 'completed'>('fresh');
  const [wasPlayingThisSession, setWasPlayingThisSession] = useState(false);
  const [exitedLanding, setExitedLanding] = useState(false);
  const hasAutoShownResultsRef = useRef(false);

  // Determine landing mode after mount to avoid hydration mismatch
  useEffect(() => {
    if (!isDebug) {
      if (hasCompleted) {
        setLandingMode('completed');
      } else if (hasInProgress) {
        setLandingMode('in-progress');
      }
    }
  }, [isDebug, hasCompleted, hasInProgress]);

  // Track when game is actively being played
  useEffect(() => {
    if (status === 'playing') {
      setWasPlayingThisSession(true);
    }
  }, [status]);

  // Auto-show results modal when game finishes (only once per session)
  useEffect(() => {
    if (status === 'finished' && foundWords.length > 0 && wasPlayingThisSession && !hasAutoShownResultsRef.current) {
      hasAutoShownResultsRef.current = true;
      setShowResults(true);
    }
  }, [status, foundWords.length, wasPlayingThisSession]);

  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showFeedback = useCallback((type: 'success' | 'error', word: string, message?: string) => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    setFeedback({ type, word, message });
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedback(null);
    }, 1000);
  }, []);

  const handlePathChange = useCallback((path: Position[]) => {
    setCurrentPath(path);
  }, [setCurrentPath]);

  const handlePathComplete = useCallback((path: Position[]) => {
    const result = submitWord(path);
    if (result.success && currentWord) {
      showFeedback('success', currentWord);
    } else if (currentWord && !result.success) {
      const errorMessages: Record<string, string> = {
        'already-found': 'Already found',
        'too-short': 'Too short',
        'not-in-list': 'Not in word list',
      };
      showFeedback('error', currentWord, errorMessages[result.reason]);
    }
    setCurrentPath([]);
  }, [submitWord, currentWord, showFeedback, setCurrentPath]);

  // Handle replay - reset game state and start fresh
  const handleReplay = useCallback(() => {
    setShowResults(false);
    setExitedLanding(false);
    hasAutoShownResultsRef.current = false;
    setWasPlayingThisSession(true);
    resetGame();
  }, [resetGame]);

  // Handle "See Results" from landing screen for completed puzzles
  // Goes to game board view without opening modal (user can click "See Results" button there)
  const handleSeeResults = useCallback(() => {
    setExitedLanding(true);
  }, []);

  // Get puzzle info for display (use puzzleNumber from hook for archive mode)
  const puzzleInfo = isArchiveMode
    ? {
        number: puzzleNumber,
        date: formatDisplayDate(getDateForPuzzleNumber(PUZZLE_BASE_DATE, puzzleNumber)),
      }
    : jumbleConfig.getPuzzleInfo();

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-xl text-[var(--foreground)]">Loading...</div>
      </div>
    );
  }

  // Ready state - show landing screen (unless user has clicked "See Results" for completed puzzle)
  if (status === 'ready' && !exitedLanding) {
    return (
      <>
        <LandingScreen
          icon={jumbleConfig.icon}
          name={jumbleConfig.name}
          description={jumbleConfig.description}
          puzzleInfo={puzzleInfo}
          mode={landingMode}
          onPlay={startGame}
          onResume={resumeGame}
          onSeeResults={handleSeeResults}
          onRules={() => setShowHowToPlay(true)}
          archiveHref="/archive"
          gameId="jumble"
        />
        <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      </>
    );
  }

  // Playing or finished state - show game board
  // Also treat as finished if we exited landing for a completed puzzle
  const isFinished = status === 'finished' || (exitedLanding && hasCompleted);

  return (
    <GameContainer
      maxWidth="md"
      navBar={
        <NavBar
          title={`${jumbleConfig.name} #${puzzleInfo.number}`}
          gameId={jumbleConfig.id}
          onRulesClick={() => setShowHowToPlay(true)}
          rightContent={
            <div className="flex items-center gap-3 pr-1">
              {isFinished ? (
                <div className="text-xl">{formatStars(stars)}</div>
              ) : (
                <Timer timeRemaining={timeRemaining} />
              )}
              <div className="px-2.5 py-1 rounded-lg bg-[var(--tile-bg)]">
                <span className="text-2xl font-bold text-[var(--accent)]">{totalScore}</span>
              </div>
            </div>
          }
        />
      }
    >
      {/* Current Word - Above the grid (hide when viewing finished game) */}
      {!isFinished && (
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
              {feedback.type === 'success' ? `+${foundWords[foundWords.length - 1]?.score || 0}` : feedback.message || 'Invalid'}
            </div>
          )}
        </div>
      )}

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
        <FoundWordsList foundWords={foundWords} />
      </div>

      {/* See Results and Play Again buttons - show when game is finished */}
      {isFinished && (
        <div className="flex gap-2 w-full max-w-xs mx-auto">
          <button
            onClick={() => setShowResults(true)}
            className="flex-1 py-3 px-6 rounded-lg bg-[var(--accent)] text-white font-semibold hover:opacity-90 transition-opacity"
          >
            See Results
          </button>
          <button
            onClick={handleReplay}
            className="flex-1 py-3 px-6 rounded-lg bg-[var(--tile-bg)] text-[var(--foreground)] font-semibold hover:bg-[var(--tile-bg-selected)] transition-colors"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Modals */}
      <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      <JumbleResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        foundWords={foundWords}
        score={totalScore}
        stars={stars}
        puzzleNumber={puzzleInfo.number}
        isArchiveMode={isArchiveMode}
      />

      {/* Debug Panel */}
      {isDebug && (
        <div className="fixed bottom-4 left-4 p-4 bg-black/80 rounded-lg text-sm text-white space-y-2">
          <div>Words: {allValidWords.size} | Max: {maxPossibleScore}pts</div>
          <button
            onClick={regeneratePuzzle}
            className="px-3 py-1 bg-[var(--accent)] rounded text-white text-sm hover:opacity-90"
          >
            Regenerate
          </button>
        </div>
      )}
    </GameContainer>
  );
}
