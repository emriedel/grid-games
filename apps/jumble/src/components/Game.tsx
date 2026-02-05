'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { LandingScreen, NavBar, GameContainer, DebugPanel, DebugButton, ResultsModal } from '@grid-games/ui';
import { formatDisplayDate, getTodayDateString } from '@grid-games/shared';
import { Position, FoundWord } from '@/types';
import { useGameState } from '@/hooks/useGameState';
import { jumbleConfig } from '@/config';
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

// Jumble-specific wrapper for ResultsModal
interface JumbleResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  foundWords: FoundWord[];
  score: number;
}

function JumbleResultsModal({
  isOpen,
  onClose,
  foundWords,
  score,
}: JumbleResultsModalProps) {
  const displayDate = formatDisplayDate(getTodayDateString());

  // Group words by length for share text
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

  // Build share text with word count by length
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

  const shareText = [
    'Jumble',
    `Score: ${score} pts`,
    counts.join(' | '),
    '',
    'https://nerdcube.games/jumble',
  ].join('\n');

  return (
    <ResultsModal
      isOpen={isOpen}
      onClose={onClose}
      gameId="jumble"
      gameName="Jumble"
      date={displayDate}
      primaryStat={{ value: score, label: 'points' }}
      secondaryStats={[
        { label: 'words found', value: foundWords.length },
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
    resumeGame,
    isWordAlreadyFound,
    regeneratePuzzle,
    hasInProgress,
    hasCompleted,
  } = useGameState();

  const [showResults, setShowResults] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; word: string } | null>(null);
  const [landingMode, setLandingMode] = useState<'fresh' | 'in-progress' | 'completed'>('fresh');
  const [viewingCompletedGame, setViewingCompletedGame] = useState(false);
  const [wasPlayingThisSession, setWasPlayingThisSession] = useState(false);

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

  // Watch for status change to finished (only auto-show if game was played this session)
  if (status === 'finished' && !showResults && foundWords.length > 0 && wasPlayingThisSession) {
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
          mode={landingMode}
          onPlay={startGame}
          onResume={resumeGame}
          onRules={() => setShowHowToPlay(true)}
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
          puzzleInfo={{ date: puzzleInfo.date }}
          mode="completed"
          onSeeResults={() => setViewingCompletedGame(true)}
          gameId="jumble"
        />
        <JumbleResultsModal
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
      <JumbleResultsModal
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
