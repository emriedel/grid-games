'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LandingScreen, NavBar, GameContainer, ResultsModal } from '@grid-games/ui';
import { formatDisplayDate, getDateForPuzzleNumber, isValidPuzzleNumber, buildShareText } from '@grid-games/shared';
import { getTodayPuzzleNumber } from '@/lib/storage';
import { Position, FoundWord } from '@/types';
import { useGameState } from '@/hooks/useGameState';
import { jumbleConfig, PUZZLE_BASE_DATE } from '@/config';
import { formatStars } from '@/constants/gameConfig';
import BoggleGrid from './BoggleGrid';
import Timer from './Timer';
import CurrentWord from './CurrentWord';
import FoundWordsList from './FoundWordsList';
import HowToPlayModal from './HowToPlayModal';

// Number to keycap emoji mapping
const numberEmojis: Record<number, string> = {
  3: '3️⃣',
  4: '4️⃣',
  5: '5️⃣',
  6: '6️⃣',
  7: '7️⃣',
  8: '8️⃣',
  9: '9️⃣',
};

// Generate word count emoji breakdown for share text
function generateWordCountEmoji(foundWords: FoundWord[]): string {
  const wordCounts: Record<number, number> = {};
  for (const fw of foundWords) {
    const len = fw.word.length;
    wordCounts[len] = (wordCounts[len] || 0) + 1;
  }

  const counts: string[] = [];
  for (let len = 3; len <= 6; len++) {
    if (wordCounts[len]) {
      counts.push(`${numberEmojis[len]}: ${wordCounts[len]}`);
    }
  }

  // 7+ letter words
  const sevenPlus = Object.entries(wordCounts)
    .filter(([len]) => parseInt(len) >= 7)
    .reduce((sum, [, count]) => sum + count, 0);
  if (sevenPlus > 0) {
    counts.push(`${numberEmojis[7]}+: ${sevenPlus}`);
  }

  return counts.join(' | ');
}

// Jumble-specific wrapper for ResultsModal
interface JumbleResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  foundWords: FoundWord[];
  score: number;
  maxPossibleScore: number;
  stars: number;
  puzzleNumber?: number;
  isArchiveMode?: boolean;
}

function JumbleResultsModal({
  isOpen,
  onClose,
  foundWords,
  score,
  maxPossibleScore,
  stars,
  puzzleNumber,
  isArchiveMode,
}: JumbleResultsModalProps) {
  // Group words by length for display
  const wordsByLength: Record<number, FoundWord[]> = {};
  for (const fw of foundWords) {
    const len = fw.word.length;
    if (!wordsByLength[len]) {
      wordsByLength[len] = [];
    }
    wordsByLength[len].push(fw);
  }

  // Sort words within each length group alphabetically
  for (const len in wordsByLength) {
    wordsByLength[len].sort((a, b) => a.word.localeCompare(b.word));
  }

  // Get sorted lengths
  const lengths = Object.keys(wordsByLength)
    .map(Number)
    .sort((a, b) => a - b);

  // Build share text using shared utility
  const shareText = buildShareText({
    gameId: 'jumble',
    gameName: 'Jumble',
    puzzleId: puzzleNumber || 0,
    score,
    maxScore: maxPossibleScore,
    emojiGrid: formatStars(stars),
    extraLines: [generateWordCountEmoji(foundWords)],
    shareUrl: isArchiveMode && puzzleNumber
      ? `https://nerdcube.games/jumble?puzzle=${puzzleNumber}`
      : 'https://nerdcube.games/jumble',
  });

  return (
    <ResultsModal
      isOpen={isOpen}
      onClose={onClose}
      gameId="jumble"
      gameName="Jumble"
      puzzleNumber={puzzleNumber}
      primaryStat={{ value: score, label: 'points' }}
      secondaryStats={[
        { label: 'words found', value: foundWords.length },
        { label: 'rating', value: formatStars(stars) },
      ]}
      shareConfig={{ text: shareText }}
    >
      {/* Words grouped by length */}
      {foundWords.length > 0 && (
        <div className="space-y-4 max-h-48 overflow-y-auto">
          {lengths.map((len) => {
            const words = wordsByLength[len];
            const emoji = len >= 7 ? `${numberEmojis[7]}+` : numberEmojis[len];
            return (
              <div key={len}>
                <h3 className="text-sm font-bold mb-2 text-[var(--muted)]">
                  {emoji} {len >= 7 ? '7+ letters' : `${len} letters`} ({words.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {words.map((fw) => (
                    <span
                      key={fw.word}
                      className="px-2 py-1 text-xs rounded bg-[var(--tile-bg)] text-[var(--foreground)]"
                    >
                      {fw.word}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
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
  const todayPuzzleNumber = getTodayPuzzleNumber();

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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; word: string } | null>(null);
  const [landingMode, setLandingMode] = useState<'fresh' | 'in-progress' | 'completed'>('fresh');
  const [viewingCompletedGame, setViewingCompletedGame] = useState(false);
  const [wasPlayingThisSession, setWasPlayingThisSession] = useState(false);
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

  // Handle replay - reset game state and start fresh
  const handleReplay = useCallback(() => {
    setShowResults(false);
    setViewingCompletedGame(false);
    hasAutoShownResultsRef.current = false;
    setWasPlayingThisSession(true);
    resetGame();
  }, [resetGame]);

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

  // Ready state - show landing screen
  if (status === 'ready') {
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
          onRules={() => setShowHowToPlay(true)}
          archiveHref="/archive"
          gameId="jumble"
        />
        <HowToPlayModal isOpen={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
      </>
    );
  }

  // Finished state - show landing screen unless viewing completed game
  if (status === 'finished' && !viewingCompletedGame) {
    return (
      <>
        <LandingScreen
          icon={jumbleConfig.icon}
          name={jumbleConfig.name}
          description={jumbleConfig.description}
          puzzleInfo={puzzleInfo}
          mode="completed"
          onSeeResults={() => setViewingCompletedGame(true)}
          archiveHref="/archive"
          gameId="jumble"
        />
        <JumbleResultsModal
          isOpen={showResults}
          onClose={() => setShowResults(false)}
          foundWords={foundWords}
          score={totalScore}
          maxPossibleScore={maxPossibleScore}
          stars={stars}
          puzzleNumber={puzzleInfo.number}
          isArchiveMode={isArchiveMode}
        />
      </>
    );
  }

  // Playing state (or viewing completed game)
  const isViewingCompleted = status === 'finished' && viewingCompletedGame;

  return (
    <GameContainer
      maxWidth="md"
      navBar={
        <NavBar
          title={`${jumbleConfig.name} #${puzzleInfo.number}`}
          gameId={jumbleConfig.id}
          onRulesClick={() => setShowHowToPlay(true)}
          rightContent={!isViewingCompleted ? <Timer timeRemaining={timeRemaining} /> : undefined}
        />
      }
    >
      {/* Current Word - Above the grid (hide when viewing completed game) */}
      {!isViewingCompleted && (
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
        <FoundWordsList foundWords={foundWords} totalScore={totalScore} />
      </div>

      {/* See Results and Play Again buttons - show when viewing completed game */}
      {isViewingCompleted && (
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
        maxPossibleScore={maxPossibleScore}
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
