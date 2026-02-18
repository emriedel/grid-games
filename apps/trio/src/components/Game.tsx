'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LandingScreen, NavBar, GameContainer, Button, ResultsModal, useBugReporter, useToast } from '@grid-games/ui';
import { buildShareText, isValidPuzzleNumber } from '@grid-games/shared';
import { useSearchParams, useRouter } from 'next/navigation';
import { Tableau } from './Tableau';
import { HowToPlayModal } from './HowToPlayModal';
import { RoundProgress } from './RoundProgress';
import { HintsIndicator } from './HintsIndicator';
import { FoundSetDisplay } from './FoundSetDisplay';
import { AllFoundTrios } from './AllFoundTrios';
import { useGameState } from '@/hooks/useGameState';
import {
  loadPuzzleByNumber,
  loadPoolPuzzle,
  createInitialCards,
  createCardFromTuple,
  getTodayPuzzleNumber,
  getValidSetIndices,
} from '@/lib/puzzleLoader';
import {
  getPuzzleState,
  saveInProgressState,
  saveCompletedState,
} from '@/lib/storage';
import { PUZZLE_BASE_DATE } from '@/config';
import { GAME_CONFIG } from '@/constants';
import type { SequentialPuzzle, Card, RoundOutcome } from '@/types';

// Trio-specific wrapper for ResultsModal
interface TrioResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  puzzleNumber?: number;
  roundOutcomes: RoundOutcome[];
  isArchive?: boolean;
}

function TrioResultsModal({
  isOpen,
  onClose,
  puzzleNumber,
  roundOutcomes,
  isArchive,
}: TrioResultsModalProps) {
  // Count trios found (found or found-with-hint)
  const triosFound = roundOutcomes.filter(o => o === 'found' || o === 'found-with-hint').length;

  // Check if perfect (all found without hints)
  const isPerfect = roundOutcomes.every(o => o === 'found');

  // Build 5-emoji line with square emojis
  const buildEmojiLine = () => {
    return roundOutcomes.map(outcome => {
      switch (outcome) {
        case 'found': return '🟩';
        case 'found-with-hint': return '🟨';
        case 'missed': return '🟥';
        default: return '⬜';
      }
    }).join('');
  };

  const emojiLine = buildEmojiLine();

  const shareUrl = isArchive && puzzleNumber
    ? `https://nerdcube.games/trio?puzzle=${puzzleNumber}`
    : 'https://nerdcube.games/trio';

  // Build share text with trophy if perfect
  const gameName = isPerfect ? 'Trio 🏆' : 'Trio';
  const puzzleId = puzzleNumber ? `#${puzzleNumber}` : '';
  const scoreText = `${triosFound}/${GAME_CONFIG.ROUND_COUNT} Trios`;
  const shareText = `${gameName} ${puzzleId}\n${scoreText}\n${emojiLine}\n\n${shareUrl}`;

  return (
    <ResultsModal
      isOpen={isOpen}
      onClose={onClose}
      gameId="trio"
      gameName="Trio"
      puzzleNumber={puzzleNumber}
      primaryStat={{
        value: `${triosFound}/${GAME_CONFIG.ROUND_COUNT}`,
        label: 'Trios'
      }}
      shareConfig={{ text: shareText }}
      messageType="success"
    >
      {/* Emoji summary - single line with 5 squares */}
      <div className="text-center mb-4 text-2xl tracking-wide">
        {emojiLine}
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
    restoreState,
    dispatchMissedRound,
    dispatchAdvanceAfterMiss,
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
  const revealTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Track if we've auto-shown the results modal for this game completion
  const hasAutoShownResultsRef = useRef(false);

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
          // Restore allTrios for completed state
          let allTrios: Card[][] = [];
          if (puzzleState.data.allTrioTuples && puzzleState.data.allTrioTuples.length > 0) {
            allTrios = puzzleState.data.allTrioTuples.map((trioTuples, trioIdx) =>
              trioTuples.map((tuple, cardIdx) =>
                createCardFromTuple(tuple, puzzle.visualMapping, `found-trio-${trioIdx}-${cardIdx}`, -1)
              )
            );
          }
          // Restore the state with found trios
          restoreState({
            roundOutcomes: puzzleState.data.roundOutcomes,
            hintUsedInRound: puzzleState.data.hintUsedInRound,
            allTrios,
            phase: 'finished',
          });
          hasAutoShownResultsRef.current = true; // Don't auto-show modal when viewing completed
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
    const hasProgress = state.allTrios.length > 0 || state.hintUsedInRound.some(h => h);
    if (state.phase === 'playing' && !debugMode && hasProgress) {
      // Sort cards by position before saving to ensure correct restoration
      const sortedCards = [...state.cards].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      const cardTuples = sortedCards.map(c => c.tuple);
      // Save last found set tuples for resume display
      const lastFoundSetTuples = state.lastFoundSet?.map(c => c.tuple);
      // Save all trio tuples
      const allTrioTuples = state.allTrios.map(trio => trio.map(c => c.tuple));
      saveInProgressState(
        activePuzzleNumber,
        state.currentRound,
        cardTuples,
        state.roundOutcomes,
        state.hintUsedInRound,
        allTrioTuples,
        state.selectedCardIds,
        activePuzzleId,
        lastFoundSetTuples
      );
    }
  }, [state.phase, state.currentRound, state.cards, state.selectedCardIds, state.roundOutcomes, state.hintUsedInRound, state.allTrios, state.lastFoundSet, activePuzzleNumber, activePuzzleId, debugMode]);

  // Handle game completion
  useEffect(() => {
    if (state.phase === 'finished' && state.allTrios.length === GAME_CONFIG.ROUND_COUNT) {
      if (!debugMode) {
        const allTrioTuples = state.allTrios.map(trio => trio.map(c => c.tuple));
        saveCompletedState(
          activePuzzleNumber,
          state.roundOutcomes,
          state.hintUsedInRound,
          allTrioTuples,
          activePuzzleId
        );
      }
    }
  }, [state.phase, state.roundOutcomes, state.hintUsedInRound, state.allTrios, activePuzzleNumber, activePuzzleId, debugMode]);

  // Show results modal when game finishes (only auto-show once)
  useEffect(() => {
    if (state.phase === 'finished' && !hasAutoShownResultsRef.current) {
      hasAutoShownResultsRef.current = true;
      const timer = setTimeout(() => setShowResultsModal(true), 300);
      return () => clearTimeout(timer);
    }
  }, [state.phase]);

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
    if (!activePuzzle) return;

    const result = submitSelection();

    if (result === 'invalid') {
      // Show shake animation briefly
      setShakingCardIds([...state.selectedCardIds]);
      setTimeout(() => {
        setShakingCardIds([]);
      }, 300);

      // Then trigger the missed round flow
      setTimeout(() => {
        // Get the correct trio for this round
        const validSetIndices = getValidSetIndices(activePuzzle, state.currentRound);
        const correctTrioCards = validSetIndices.map(pos =>
          state.cards.find(c => c.position === pos)!
        );
        const correctTrioCardIds = correctTrioCards.map(c => c.id);

        // Dispatch missed round
        dispatchMissedRound(correctTrioCards, correctTrioCardIds);

        // Start timer to advance after reveal
        revealTimerRef.current = setTimeout(() => {
          dispatchAdvanceAfterMiss();
        }, GAME_CONFIG.ANIMATION.REVEAL_CORRECT);
      }, 400);
    }
  }, [submitSelection, state.selectedCardIds, state.cards, state.currentRound, activePuzzle, dispatchMissedRound, dispatchAdvanceAfterMiss]);

  // Cleanup reveal timer on unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
      }
    };
  }, []);

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
    const savedState = getPuzzleState(activePuzzleNumber, activePuzzleId);

    if (!savedState || savedState.status !== 'in-progress' || !activePuzzle) {
      startGame();
      return;
    }

    const { data } = savedState;

    // Derive which position was hinted from the round's validSetIndices
    const roundData = activePuzzle.rounds[data.currentRound - 1];
    const hintedPosition = roundData && data.hintUsedInRound[data.currentRound - 1]
      ? roundData.validSetIndices[0]
      : null;

    // Reconstruct Card objects from saved tuples (tuples are saved in position order)
    const reconstructedCards: Card[] = [];
    const newHintedCardIds: string[] = [];

    data.currentCardTuples.forEach((tuple, position) => {
      const cardId = `card-restored-${data.currentRound}-${position}`;
      const card = createCardFromTuple(tuple, activePuzzle.visualMapping, cardId, position);
      reconstructedCards.push(card);

      if (hintedPosition === position) {
        newHintedCardIds.push(cardId);
      }
    });

    // Reconstruct lastFoundSet from saved tuples
    let lastFoundSet: Card[] | undefined;
    if (data.lastFoundSetTuples && data.lastFoundSetTuples.length === 3) {
      lastFoundSet = data.lastFoundSetTuples.map((tuple, idx) =>
        createCardFromTuple(tuple, activePuzzle.visualMapping, `last-found-${idx}`, -1)
      );
    }

    // Reconstruct allTrios from saved tuples
    let allTrios: Card[][] = [];
    if (data.allTrioTuples && data.allTrioTuples.length > 0) {
      allTrios = data.allTrioTuples.map((trioTuples, trioIdx) =>
        trioTuples.map((tuple, cardIdx) =>
          createCardFromTuple(tuple, activePuzzle.visualMapping, `found-trio-${trioIdx}-${cardIdx}`, -1)
        )
      );
    }

    restoreState({
      currentRound: data.currentRound,
      roundOutcomes: data.roundOutcomes,
      hintUsedInRound: data.hintUsedInRound,
      hintedCardIds: newHintedCardIds,
      cards: reconstructedCards,
      lastFoundSet,
      allTrios,
      phase: 'playing',
    });
  }, [activePuzzleNumber, activePuzzleId, activePuzzle, startGame, restoreState]);

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
      <>
        <LandingScreen
          gameId="trio"
          icon="https://nerdcube.games/icons/trio.png"
          name="Trio"
          description="Find the matching trio in each round"
          puzzleInfo={{ number: activePuzzleNumber, date: dateStr }}
          mode={landingMode}
          onPlay={handlePlay}
          onResume={handleResume}
          onSeeResults={handleSeeResults}
          onRules={() => setShowRulesModal(true)}
          archiveHref="/archive"
        />
        <HowToPlayModal
          isOpen={showRulesModal}
          onClose={() => setShowRulesModal(false)}
        />
      </>
    );
  }

  // Check if game is effectively finished
  const isFinished = state.phase === 'finished' ||
    (exitedLanding && landingMode === 'completed');

  const hasThreeSelected = state.selectedCardIds.length === 3;
  const roundIndex = state.currentRound - 1;
  const hintAvailable = !state.hintUsedInRound[roundIndex];

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
              {/* Round progress indicator - always visible */}
              <RoundProgress
                roundOutcomes={state.roundOutcomes}
                currentRound={isFinished ? GAME_CONFIG.ROUND_COUNT + 1 : state.currentRound}
              />
            </div>
          }
        />
      }
    >
      {/* Game board or finished view */}
      <div className="flex flex-col flex-shrink-0">
        {isFinished ? (
          /* Show all trios when finished */
          <AllFoundTrios allTrios={state.allTrios} />
        ) : (
          /* Show game board when playing */
          <>
            <Tableau
              cards={state.cards}
              selectedCardIds={state.selectedCardIds}
              removingCardIds={state.removingCardIds}
              addingCardIds={state.addingCardIds}
              shakingCardIds={shakingCardIds}
              hintedCardIds={state.hintedCardIds}
              correctTrioCardIds={state.correctTrioCardIds}
              onCardClick={handleCardClick}
            />

            {/* Reveal message during correct answer reveal */}
            {state.revealingCorrectTrio && (
              <div className="mt-4 text-center text-[var(--muted)]">
                <span className="text-lg">The correct trio...</span>
              </div>
            )}
          </>
        )}

        {/* Action buttons - directly below game board */}
        <div className="flex justify-center items-center gap-4 py-4">
          {!isFinished && !state.revealingCorrectTrio && (
            <>
              {/* Hint button */}
              <HintsIndicator
                hintAvailable={hintAvailable}
                hasThreeSelected={hasThreeSelected}
                onUseHint={handleUseHint}
              />

              {/* Submit button - always visible, disabled when < 3 cards */}
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!hasThreeSelected}
              >
                Submit
              </Button>
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

        {/* Last found trio - below buttons during play */}
        {!isFinished && state.lastFoundSet && !state.revealingCorrectTrio && (
          <div className="mt-2">
            <FoundSetDisplay cards={state.lastFoundSet} />
          </div>
        )}
      </div>
    </GameContainer>

    {/* Results Modal */}
    <TrioResultsModal
      isOpen={showResultsModal}
      onClose={() => setShowResultsModal(false)}
      puzzleNumber={activePuzzleNumber}
      roundOutcomes={state.roundOutcomes}
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
