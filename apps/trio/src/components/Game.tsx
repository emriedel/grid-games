'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LandingScreen, NavBar, GameContainer, Button, ResultsModal, useBugReporter, useToast } from '@grid-games/ui';
import { buildShareText, isValidPuzzleNumber } from '@grid-games/shared';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tableau } from './Tableau';
import { HowToPlayModal } from './HowToPlayModal';
import { AttemptsIndicator } from './AttemptsIndicator';
import { HintsIndicator } from './HintsIndicator';
import { FoundSetDisplay } from './FoundSetDisplay';
import { useGameState } from '@/hooks/useGameState';
import {
  loadPuzzleByNumber,
  loadPoolPuzzle,
  createInitialCards,
  getTodayPuzzleNumber,
} from '@/lib/puzzleLoader';
import {
  getPuzzleState,
  saveInProgressState,
  saveCompletedState,
} from '@/lib/storage';
import { PUZZLE_BASE_DATE } from '@/config';
import { GAME_CONFIG } from '@/constants';
import type { SequentialPuzzle } from '@/types';

// Trio-specific wrapper for ResultsModal
interface TrioResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  puzzleNumber?: number;
  roundsCompleted: number;
  incorrectGuesses: number;
  hintsUsed: number;
  won: boolean;
  isArchive?: boolean;
}

function TrioResultsModal({
  isOpen,
  onClose,
  puzzleNumber,
  roundsCompleted,
  incorrectGuesses,
  hintsUsed,
  won,
  isArchive,
}: TrioResultsModalProps) {
  // Build Strands-style emoji grid
  const buildEmojiGrid = () => {
    const lines: string[] = [];

    // Rounds completed (🎯)
    if (roundsCompleted > 0) {
      lines.push('🎯'.repeat(roundsCompleted) + (won ? '' : ` (${roundsCompleted}/${GAME_CONFIG.ROUND_COUNT})`));
    }

    // Wrong guesses (❌) - only show if any
    if (incorrectGuesses > 0) {
      lines.push('❌'.repeat(incorrectGuesses));
    }

    // Hints used (💡) - only show if any
    if (hintsUsed > 0) {
      lines.push('💡'.repeat(hintsUsed));
    }

    return lines.filter(line => line.length > 0).join('\n');
  };

  const emojiGrid = buildEmojiGrid();

  const shareUrl = isArchive && puzzleNumber
    ? `https://nerdcube.games/trio?puzzle=${puzzleNumber}`
    : 'https://nerdcube.games/trio';

  const shareText = buildShareText({
    gameId: 'trio',
    gameName: 'Trio',
    puzzleId: puzzleNumber ? `#${puzzleNumber}` : '',
    score: roundsCompleted,
    maxScore: GAME_CONFIG.ROUND_COUNT,
    emojiGrid,
    shareUrl,
  });

  const messageType = won ? 'success' : 'failure';

  return (
    <ResultsModal
      isOpen={isOpen}
      onClose={onClose}
      gameId="trio"
      gameName="Trio"
      puzzleNumber={puzzleNumber}
      primaryStat={{
        value: `${roundsCompleted}/${GAME_CONFIG.ROUND_COUNT}`,
        label: 'rounds'
      }}
      shareConfig={{ text: shareText }}
      messageType={messageType}
    >
      {/* Emoji summary */}
      <div className="text-center mb-4 whitespace-pre-line text-2xl">
        {emojiGrid}
      </div>
      <div className="text-center text-[var(--muted)]">
        {won ? (
          <span>All {GAME_CONFIG.ROUND_COUNT} rounds completed!</span>
        ) : (
          <span>{roundsCompleted}/{GAME_CONFIG.ROUND_COUNT} rounds - better luck next time!</span>
        )}
      </div>
    </ResultsModal>
  );
}

export function Game() {
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === 'true';
  const puzzleParam = searchParams.get('puzzle');
  const poolIndexParam = searchParams.get('poolIndex');

  // Determine if this is archive mode or pool mode
  const archivePuzzleNumber = puzzleParam ? parseInt(puzzleParam, 10) : null;
  const isArchiveMode = archivePuzzleNumber !== null && !isNaN(archivePuzzleNumber) && archivePuzzleNumber >= 1;
  const isPoolMode = debugMode && poolIndexParam !== null;
  const todayPuzzleNumber = getTodayPuzzleNumber();

  // Get the puzzle number to use (archive or today)
  const activePuzzleNumber = isArchiveMode ? archivePuzzleNumber : todayPuzzleNumber;

  const router = useRouter();
  useBugReporter();
  const toast = useToast();

  // Game state
  const {
    state,
    loadPuzzle,
    startGame,
    handleCardClick,
    submitSelection,
    revealHint,
    clearRemoving,
    clearAdding,
  } = useGameState();

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [landingMode, setLandingMode] = useState<'fresh' | 'in-progress' | 'completed'>('fresh');
  const [exitedLanding, setExitedLanding] = useState(false);
  const [shakingCardIds, setShakingCardIds] = useState<string[]>([]);
  const [activePuzzleId, setActivePuzzleId] = useState<string | undefined>(undefined);
  const [activePuzzle, setActivePuzzle] = useState<SequentialPuzzle | null>(null);

  // Animation state tracking
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Block access to future puzzles (unless in debug mode)
  useEffect(() => {
    if (isArchiveMode && !debugMode && archivePuzzleNumber !== null) {
      if (!isValidPuzzleNumber(PUZZLE_BASE_DATE, archivePuzzleNumber)) {
        router.replace('/');
      }
    }
  }, [isArchiveMode, debugMode, archivePuzzleNumber, router]);

  // Initialize game
  useEffect(() => {
    async function init() {
      let puzzle: SequentialPuzzle | null = null;

      // Pool mode: load from pool by index (debug only)
      if (isPoolMode && poolIndexParam) {
        const poolIndex = parseInt(poolIndexParam, 10);
        puzzle = await loadPoolPuzzle(poolIndex);
        if (!puzzle) {
          console.error('Pool puzzle not found:', poolIndex);
          puzzle = await loadPuzzleByNumber(activePuzzleNumber);
        }
      } else {
        puzzle = await loadPuzzleByNumber(activePuzzleNumber);
      }

      if (!puzzle) {
        console.error('Failed to load puzzle');
        setIsLoading(false);
        return;
      }

      setActivePuzzle(puzzle);
      setActivePuzzleId(puzzle.id);

      // Create initial cards for round 1
      const cards = createInitialCards(puzzle);
      loadPuzzle(puzzle, cards);

      // Check for saved state (skip in debug mode)
      if (!debugMode) {
        const puzzleState = getPuzzleState(activePuzzleNumber, puzzle.id);

        if (puzzleState?.status === 'completed') {
          if (isArchiveMode) {
            setExitedLanding(true);
          } else {
            setLandingMode('completed');
          }
        } else if (puzzleState?.status === 'in-progress') {
          if (isArchiveMode) {
            startGame();
            setExitedLanding(true);
          } else {
            setLandingMode('in-progress');
          }
        } else {
          if (isArchiveMode) {
            startGame();
            setExitedLanding(true);
          }
        }
      } else {
        if (isPoolMode) {
          startGame();
          setExitedLanding(true);
        }
      }

      setIsLoading(false);
    }
    init();
  }, [debugMode, isArchiveMode, isPoolMode, poolIndexParam, activePuzzleNumber]);

  // Log puzzle info in debug mode
  useEffect(() => {
    if (debugMode && activePuzzle) {
      console.log(`[Trio Debug] Puzzle ID: ${activePuzzle.id}`);
      console.log(`[Trio Debug] Rounds: ${activePuzzle.rounds.length}`);
      console.log(`[Trio Debug] Visual Mapping:`, activePuzzle.visualMapping);
      console.log(`[Trio Debug] === SOLUTION ===`);
      activePuzzle.rounds.forEach((round, i) => {
        const [a, b, c] = round.validSetIndices;
        const posToGrid = (pos: number) => `row ${Math.floor(pos / 3) + 1}, col ${(pos % 3) + 1}`;
        console.log(`[Trio Debug] Round ${i + 1}: positions [${a}, ${b}, ${c}] → ${posToGrid(a)}, ${posToGrid(b)}, ${posToGrid(c)}`);
      });
    }
  }, [debugMode, activePuzzle]);

  // Log current round solution in debug mode
  useEffect(() => {
    if (debugMode && activePuzzle && state.phase === 'playing' && state.cards.length > 0) {
      const roundData = activePuzzle.rounds[state.currentRound - 1];
      if (roundData) {
        const [a, b, c] = roundData.validSetIndices;
        const cardA = state.cards.find(card => card.position === a);
        const cardB = state.cards.find(card => card.position === b);
        const cardC = state.cards.find(card => card.position === c);

        console.log(`[Trio Debug] --- Round ${state.currentRound} Solution ---`);
        console.log(`[Trio Debug] Positions: [${a}, ${b}, ${c}]`);
        if (cardA && cardB && cardC) {
          const describeCard = (card: typeof cardA) =>
            `${card!.count}x ${card!.color} ${card!.pattern} ${card!.shape}`;
          console.log(`[Trio Debug] Card 1 (pos ${a}): ${describeCard(cardA)}`);
          console.log(`[Trio Debug] Card 2 (pos ${b}): ${describeCard(cardB)}`);
          console.log(`[Trio Debug] Card 3 (pos ${c}): ${describeCard(cardC)}`);
        }
      }
    }
  }, [debugMode, activePuzzle, state.currentRound, state.phase, state.cards]);

  // Save in-progress state when playing
  useEffect(() => {
    const hasMeaningfulProgress = state.foundSets.length > 0 || state.incorrectGuesses > 0 || state.hintsUsed > 0;
    if (state.phase === 'playing' && !debugMode && hasMeaningfulProgress) {
      const cardTuples = state.cards.map(c => c.tuple);
      saveInProgressState(
        activePuzzleNumber,
        state.currentRound,
        state.foundSets,
        cardTuples,
        state.incorrectGuesses,
        state.guessHistory,
        state.hintsUsed,
        state.hintedCardIds,
        state.selectedCardIds,
        activePuzzleId
      );
    }
  }, [state.phase, state.foundSets, state.currentRound, state.cards, state.selectedCardIds, state.incorrectGuesses, state.guessHistory, state.hintsUsed, state.hintedCardIds, activePuzzleNumber, activePuzzleId, debugMode]);

  // Handle game completion
  useEffect(() => {
    if (state.phase === 'finished') {
      if (!debugMode) {
        saveCompletedState(
          activePuzzleNumber,
          state.currentRound,
          state.foundSets,
          state.incorrectGuesses,
          state.guessHistory,
          state.hintsUsed,
          state.won,
          activePuzzleId
        );
      }
    }
  }, [state.phase, state.foundSets, state.currentRound, state.incorrectGuesses, state.guessHistory, state.hintsUsed, state.won, activePuzzleNumber, activePuzzleId, debugMode]);

  // Show results modal when game finishes
  const shouldShowResults = state.phase === 'finished' && !showResultsModal;
  useEffect(() => {
    if (shouldShowResults) {
      const timer = setTimeout(() => setShowResultsModal(true), 300);
      return () => clearTimeout(timer);
    }
  }, [shouldShowResults]);

  // Handle removing animation completion
  useEffect(() => {
    if (state.removingCardIds.length > 0) {
      animationTimerRef.current = setTimeout(() => {
        clearRemoving();
      }, GAME_CONFIG.ANIMATION.CARD_REMOVE);

      return () => {
        if (animationTimerRef.current) {
          clearTimeout(animationTimerRef.current);
        }
      };
    }
  }, [state.removingCardIds, clearRemoving]);

  // Handle adding animation completion
  useEffect(() => {
    if (state.addingCardIds.length > 0) {
      animationTimerRef.current = setTimeout(() => {
        clearAdding();
      }, GAME_CONFIG.ANIMATION.CARD_ADD);

      return () => {
        if (animationTimerRef.current) {
          clearTimeout(animationTimerRef.current);
        }
      };
    }
  }, [state.addingCardIds, clearAdding]);

  // Handle submit button click
  const handleSubmit = useCallback(() => {
    const result = submitSelection();

    if (result === 'duplicate') {
      toast.show('Already guessed this combination', 'info');
      return;
    }

    if (result === 'invalid') {
      // Shake animation
      setShakingCardIds([...state.selectedCardIds]);
      setTimeout(() => {
        setShakingCardIds([]);
      }, 500);
    }
  }, [submitSelection, state.selectedCardIds, toast]);

  // Handle hint button click
  const handleUseHint = useCallback(() => {
    revealHint();
  }, [revealHint]);

  // Handle play button from landing screen
  const handlePlay = useCallback(() => {
    startGame();
  }, [startGame]);

  // Handle resume button from landing screen
  const handleResume = useCallback(() => {
    startGame();
  }, [startGame]);

  // Handle "See Results" from landing screen
  const handleSeeResults = useCallback(() => {
    setExitedLanding(true);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900">
        <div className="text-white text-lg">Loading puzzle...</div>
      </div>
    );
  }

  // Error state
  if (!activePuzzle || state.cards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900">
        <div className="text-white text-lg">Failed to load puzzle</div>
      </div>
    );
  }

  // Determine if we should show landing screen
  const showLanding = !exitedLanding && !isArchiveMode && state.phase !== 'playing' && state.phase !== 'finished';

  // Landing screen
  if (showLanding) {
    const puzzleDate = new Date(PUZZLE_BASE_DATE.getTime() + (activePuzzleNumber - 1) * 24 * 60 * 60 * 1000);
    const dateStr = puzzleDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <LandingScreen
        gameId="trio"
        name="Trio"
        description="Find the matching trio in each round"
        puzzleInfo={{ number: activePuzzleNumber, date: dateStr }}
        mode={landingMode}
        onPlay={handlePlay}
        onResume={handleResume}
        onSeeResults={handleSeeResults}
        archiveHref="/archive"
      />
    );
  }

  // Check if game is effectively finished
  const isFinished = state.phase === 'finished' ||
    (exitedLanding && landingMode === 'completed');

  const roundsCompleted = state.foundSets.length;
  const hasThreeSelected = state.selectedCardIds.length === 3;

  return (
    <>
    <GameContainer
      navBar={
        <NavBar
          title="Trio"
          gameId="trio"
          onRulesClick={() => setShowRulesModal(true)}
          rightContent={
            <div className="flex items-center gap-3 pr-2">
              {/* Round counter */}
              <span className="text-lg font-bold text-[var(--accent)]">
                {state.currentRound}/{GAME_CONFIG.ROUND_COUNT}
              </span>
              {/* Attempts indicator */}
              <AttemptsIndicator incorrectGuesses={state.incorrectGuesses} />
            </div>
          }
        />
      }
    >
      {/* Game board */}
      <div className="flex-1 flex flex-col">
        <Tableau
          cards={state.cards}
          selectedCardIds={state.selectedCardIds}
          removingCardIds={state.removingCardIds}
          addingCardIds={state.addingCardIds}
          shakingCardIds={shakingCardIds}
          hintedCardIds={state.hintedCardIds}
          onCardClick={handleCardClick}
        />

        {/* Found set display */}
        {state.lastFoundSet && state.phase === 'playing' && (
          <div className="mt-4">
            <FoundSetDisplay cards={state.lastFoundSet} />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex justify-center items-center gap-4 py-4">
        {!isFinished && (
          <>
            {/* Hint button */}
            <HintsIndicator
              hintsUsed={state.hintsUsed}
              hasThreeSelected={hasThreeSelected}
              onUseHint={handleUseHint}
            />

            {/* Submit button - only visible when 3 cards selected */}
            {hasThreeSelected && (
              <Button
                variant="primary"
                onClick={handleSubmit}
              >
                Submit
              </Button>
            )}
          </>
        )}
        {isFinished && (
          <Button
            variant="primary"
            onClick={() => setShowResultsModal(true)}
          >
            See Results
          </Button>
        )}
      </div>
    </GameContainer>

    {/* Results Modal */}
    <TrioResultsModal
      isOpen={showResultsModal}
      onClose={() => setShowResultsModal(false)}
      puzzleNumber={activePuzzleNumber}
      roundsCompleted={roundsCompleted}
      incorrectGuesses={state.incorrectGuesses}
      hintsUsed={state.hintsUsed}
      won={state.won}
      isArchive={isArchiveMode}
    />

    {/* How to Play Modal */}
    <HowToPlayModal
      isOpen={showRulesModal}
      onClose={() => setShowRulesModal(false)}
    />
  </>
  );
}

export default Game;
