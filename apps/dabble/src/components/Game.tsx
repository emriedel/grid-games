'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { LandingScreen, NavBar, GameContainer, Button, ResultsModal, Modal, useBugReporter, useToast } from '@grid-games/ui';
import { buildShareText, formatDisplayDate, getDateForPuzzleNumber, getPuzzleNumber, isValidPuzzleNumber, trackGameStart, trackGameComplete, useTopScores, submitScore as submitTopScore, type TopScore } from '@grid-games/shared';
import { GameBoard } from './GameBoard';
import { LetterRack } from './LetterRack';
import { WordList } from './WordList';
import { HowToPlayModal } from './HowToPlayModal';
import { getLetterUsageBonus, STAR_THRESHOLDS } from '@/constants/gameConfig';
import { DragOverlayTile } from './Tile';
import { useSearchParams, useRouter } from 'next/navigation';
import { fetchDailyPuzzle, getPuzzleFromPool } from '@/lib/puzzleLoader';
import { loadDictionary } from '@/lib/dictionary';
import { validatePlacement, applyPlacement } from '@/lib/gameLogic';
import {
  getPuzzleState,
  savePuzzleState,
  clearPuzzleState,
  getTodayPuzzleNumber,
} from '@/lib/storage';
import { dabbleConfig, PUZZLE_BASE_DATE } from '@/config';
import { MAX_TURNS, PUZZLE_LETTER_COUNT } from '@/constants/gameConfig';
import type { DailyPuzzle, GameBoard as GameBoardType, PlacedTile, Word, DragData, StarThresholds } from '@/types';

type GameState = 'landing' | 'playing' | 'finished';

// Calculate star thresholds at runtime from heuristicMax and config percentages
function getStarThresholdValues(thresholds?: StarThresholds): { star1: number; star2: number; star3: number } | null {
  if (!thresholds) return null;
  const { heuristicMax } = thresholds;
  return {
    star1: Math.round(heuristicMax * STAR_THRESHOLDS.star1Percent),
    star2: Math.round(heuristicMax * STAR_THRESHOLDS.star2Percent),
    star3: Math.round(heuristicMax * STAR_THRESHOLDS.star3Percent),
  };
}

// Calculate star count based on score and thresholds
function calculateStars(score: number, thresholds?: StarThresholds): number {
  const values = getStarThresholdValues(thresholds);
  if (!values) return 0;
  if (score >= values.star3) return 3;
  if (score >= values.star2) return 2;
  if (score >= values.star1) return 1;
  return 0;
}

// Format star display string (e.g., "★★☆" for 2 stars)
function formatStars(stars: number, maxStars: number = 3): string {
  return '★'.repeat(stars) + '☆'.repeat(maxStars - stars);
}

// Validate placed tiles are consistent with current puzzle
// Detects corrupted state from midnight rollover
function validatePlacedTiles(
  placedTiles: PlacedTile[],
  board: GameBoardType,
  rackLetters: string[]
): boolean {
  for (const tile of placedTiles) {
    // Bounds check
    if (tile.row < 0 || tile.row >= board.size ||
        tile.col < 0 || tile.col >= board.size) {
      return false;
    }
    // Rack index validation - must exist and match letter
    if (tile.rackIndex !== undefined) {
      if (tile.rackIndex < 0 || tile.rackIndex >= rackLetters.length) {
        return false;
      }
      if (rackLetters[tile.rackIndex] !== tile.letter) {
        return false;
      }
    }
  }
  return true;
}

// Dabble-specific wrapper for ResultsModal
interface DabbleResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  puzzleNumber?: number;
  totalScore: number;
  lettersUsed: number;
  thresholds?: StarThresholds;
  isArchive?: boolean;
  isTopScore?: boolean;
  topScoreRank?: number | null;
}

function DabbleResultsModal({
  isOpen,
  onClose,
  puzzleNumber,
  totalScore,
  lettersUsed,
  thresholds,
  isArchive,
  isTopScore,
  topScoreRank,
}: DabbleResultsModalProps) {
  const letterBonus = getLetterUsageBonus(lettersUsed);
  const finalScore = totalScore + letterBonus;
  const stars = calculateStars(finalScore, thresholds);

  const emojiGrid = thresholds ? formatStars(stars) : '';
  const rankEmojis = ['🥇', '🥈', '🥉'];

  // Add medal to share text if user has a top score
  const medalEmoji = isTopScore && topScoreRank && topScoreRank <= 3 ? rankEmojis[topScoreRank - 1] : '';
  const scoreText = medalEmoji ? `${finalScore} ${medalEmoji}` : String(finalScore);

  const shareUrl = isArchive && puzzleNumber
    ? `https://nerdcube.games/dabble?puzzle=${puzzleNumber}`
    : 'https://nerdcube.games/dabble';

  const shareText = buildShareText({
    gameId: 'dabble',
    gameName: 'Dabble',
    puzzleId: puzzleNumber ? `#${puzzleNumber}` : '',
    score: scoreText,
    emojiGrid,
    shareUrl,
  });

  // Determine message type based on star count
  const messageType = stars === 0 ? 'failure' : 'success';

  return (
    <ResultsModal
      isOpen={isOpen}
      onClose={onClose}
      gameId="dabble"
      gameName="Dabble"
      puzzleNumber={puzzleNumber}
      primaryStat={{ value: finalScore, label: 'points' }}
      shareConfig={{ text: shareText }}
      messageType={messageType}
    >
      {/* Stars display - shown first */}
      {thresholds && (
        <div className="text-center mb-4">
          <span className="text-3xl text-[var(--foreground)]">{formatStars(stars)}</span>
        </div>
      )}
      {/* Top Score badge - shown below stars */}
      {isTopScore && topScoreRank && topScoreRank <= 3 && (
        <div className="text-center mb-4">
          <span className="text-2xl">{rankEmojis[topScoreRank - 1]}</span>
          <span className="ml-2 text-lg font-bold text-[var(--accent)]">Top Score!</span>
        </div>
      )}
    </ResultsModal>
  );
}

// Score thresholds modal component
interface ScoreThresholdsModalProps {
  isOpen: boolean;
  onClose: () => void;
  thresholds?: StarThresholds;
  topScores: TopScore[];
  isLoadingTopScores: boolean;
}

function ScoreThresholdsModal({ isOpen, onClose, thresholds, topScores, isLoadingTopScores }: ScoreThresholdsModalProps) {
  const thresholdValues = getStarThresholdValues(thresholds);
  const rankEmojis = ['🥇', '🥈', '🥉'];
  const hasTopScores = !isLoadingTopScores && topScores.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Scoring Info">
      {thresholdValues && (
        <div className={`flex justify-center gap-8 ${hasTopScores ? 'mb-6' : ''}`}>
          <div className="text-center">
            <div className="text-2xl">★</div>
            <div className="text-lg text-[var(--accent)]">{thresholdValues.star1}+</div>
          </div>
          <div className="text-center">
            <div className="text-2xl">★★</div>
            <div className="text-lg text-[var(--accent)]">{thresholdValues.star2}+</div>
          </div>
          <div className="text-center">
            <div className="text-2xl">★★★</div>
            <div className="text-lg text-[var(--accent)]">{thresholdValues.star3}+</div>
          </div>
        </div>
      )}
      {/* Top Scores section - only show when there are scores */}
      {hasTopScores && (
        <div className="border-t border-[var(--border)] pt-4 mt-4">
          <h3 className="text-sm text-[var(--muted)] text-center mb-3">Top Scores</h3>
          <div className="flex justify-center gap-6">
            {topScores.map((ts, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="text-2xl">{rankEmojis[i]}</span>
                <span className="text-xl font-bold">{ts.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}


export function Game() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resetParam = searchParams.get('reset') === 'true';

  // Handle ?reset=true - clear only today's puzzle state and redirect to clean URL
  useEffect(() => {
    if (resetParam && typeof window !== 'undefined') {
      const todayNum = getTodayPuzzleNumber();
      // Only clear keys for today's puzzle number (preserves archive history)
      Object.keys(localStorage)
        .filter(k => k.startsWith(`dabble-${todayNum}-`))
        .forEach(k => localStorage.removeItem(k));
      router.replace('/');
    }
  }, [resetParam, router]);

  const debugMode = searchParams.get('debug') === 'true';
  const puzzleParam = searchParams.get('puzzle');
  const poolIdParam = searchParams.get('poolId');

  // Determine if this is archive mode or pool mode
  const archivePuzzleNumber = puzzleParam ? parseInt(puzzleParam, 10) : null;
  const isArchiveMode = archivePuzzleNumber !== null && !isNaN(archivePuzzleNumber) && archivePuzzleNumber >= 1;
  const isPoolMode = debugMode && poolIdParam !== null;
  const todayPuzzleNumber = getTodayPuzzleNumber();

  // Get the puzzle number to use (archive or today)
  const activePuzzleNumber = isArchiveMode ? archivePuzzleNumber : todayPuzzleNumber;

  const bugReporter = useBugReporter();
  const toast = useToast();

  // Block access to future puzzles (unless in debug mode)
  useEffect(() => {
    if (isArchiveMode && !debugMode && archivePuzzleNumber !== null) {
      if (!isValidPuzzleNumber(PUZZLE_BASE_DATE, archivePuzzleNumber)) {
        router.replace('/');
      }
    }
  }, [isArchiveMode, debugMode, archivePuzzleNumber, router]);

  const [gameState, setGameState] = useState<GameState>('landing');
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [board, setBoard] = useState<GameBoardType | null>(null);
  const [rackLetters, setRackLetters] = useState<string[]>([]);
  const [placedTiles, setPlacedTiles] = useState<PlacedTile[]>([]);
  const [usedRackIndices, setUsedRackIndices] = useState<Set<number>>(new Set());
  const [lockedRackIndices, setLockedRackIndices] = useState<Set<number>>(new Set());
  const [selectedRackIndex, setSelectedRackIndex] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [submittedWords, setSubmittedWords] = useState<Word[]>([]);
  const [turnCount, setTurnCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [activeDragLetter, setActiveDragLetter] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isDraggingBoardTile, setIsDraggingBoardTile] = useState(false);
  const [scorePopup, setScorePopup] = useState<{ score: number; key: number } | null>(null);
  const [landingMode, setLandingMode] = useState<'fresh' | 'in-progress' | 'completed' | 'unavailable'>('fresh');
  const [showThresholdsModal, setShowThresholdsModal] = useState(false);
  const [activePuzzleId, setActivePuzzleId] = useState<string | undefined>(undefined);
  const [pendingResultsModal, setPendingResultsModal] = useState(false);
  const [isTopScore, setIsTopScore] = useState(false);
  const [topScoreRank, setTopScoreRank] = useState<number | null>(null);
  const [scoreSubmissionComplete, setScoreSubmissionComplete] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationPhase, setCelebrationPhase] = useState<'pulse' | 'tiles' | 'hold' | null>(null);

  // Fetch top scores for the current puzzle
  const { topScores, isLoading: isLoadingTopScores, refetch: refetchTopScores } = useTopScores('dabble', activePuzzleId);

  // Compute current rank based on latest top scores
  // This re-checks rank when user returns to view results (medal only shows if still top 3)
  const userFinalScore = totalScore + getLetterUsageBonus(lockedRackIndices.size);
  const currentTopScoreRank = topScores.length > 0
    ? (() => {
        const rankIndex = topScores.findIndex(ts => ts.score === userFinalScore);
        return rankIndex !== -1 ? rankIndex + 1 : null;
      })()
    : topScoreRank; // Fall back to submission-time rank if topScores not loaded yet
  const isCurrentlyTopScore = currentTopScoreRank !== null && currentTopScoreRank <= 3;

  // Ref to track mounted state for timeout cleanup
  const resultsModalTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to prevent duplicate backfill submissions in React Strict Mode
  const backfillAttemptedRef = useRef(false);
  // Ref for score submission status (so polling can read latest value)
  const scoreSubmissionCompleteRef = useRef(false);

  // Configure drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  // Reset drag state when tab becomes visible (fixes stale drag state after tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setActiveDragLetter(null);
        setActiveDragId(null);
        setIsDraggingBoardTile(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Initialize game
  useEffect(() => {
    async function init() {
      await loadDictionary();

      let dailyPuzzle: DailyPuzzle | null = null;

      // Pool mode: load from pool by ID (debug only)
      if (isPoolMode && poolIdParam) {
        const poolPuzzle = await getPuzzleFromPool(poolIdParam);
        if (poolPuzzle) {
          dailyPuzzle = poolPuzzle;
        } else {
          console.error('Pool puzzle not found:', poolIdParam);
          // Fall back to daily puzzle
          dailyPuzzle = await fetchDailyPuzzle();
        }
      } else {
        // Fetch puzzle for the active puzzle number (uses pre-generated with thresholds if available)
        // For archive mode, we need to get the date string for that puzzle number
        const puzzleDateString = isArchiveMode
          ? getDateForPuzzleNumber(PUZZLE_BASE_DATE, activePuzzleNumber)
          : undefined; // undefined = today
        dailyPuzzle = await fetchDailyPuzzle(puzzleDateString);
      }

      // Handle no puzzle available (like Carom)
      if (!dailyPuzzle) {
        setLandingMode('unavailable');
        setIsLoading(false);
        return;
      }

      setPuzzle(dailyPuzzle);
      setRackLetters(dailyPuzzle.letters);
      setActivePuzzleId(dailyPuzzle.puzzleId);

      // Check for saved state (skip in debug mode)
      if (!debugMode) {
        // Check puzzle state using unified storage
        const puzzleState = getPuzzleState(activePuzzleNumber, dailyPuzzle.puzzleId);

        if (puzzleState?.status === 'completed') {
          // Puzzle is completed
          if (isArchiveMode) {
            // Archive: go directly to finished state (skip landing)
            setBoard(puzzleState.data.board);
            setSubmittedWords(puzzleState.data.submittedWords);
            setLockedRackIndices(new Set(puzzleState.data.lockedRackIndices));
            setTotalScore(puzzleState.data.totalScore);
            setGameState('finished');
          } else {
            // Today: show landing with 'completed' mode
            setLandingMode('completed');
            setBoard(puzzleState.data.board);
            setSubmittedWords(puzzleState.data.submittedWords);
            setLockedRackIndices(new Set(puzzleState.data.lockedRackIndices));
            setTotalScore(puzzleState.data.totalScore);
          }

          // Backfill: Submit score to server if not already done (silent)
          // Use ref to prevent duplicate submissions in React Strict Mode
          if (!puzzleState.data.scoreSubmitted && dailyPuzzle.puzzleId && !backfillAttemptedRef.current) {
            backfillAttemptedRef.current = true;
            const lettersUsed = puzzleState.data.lockedRackIndices?.length ?? 0;
            const letterBonus = getLetterUsageBonus(lettersUsed);
            const finalScore = puzzleState.data.totalScore + letterBonus;

            submitTopScore('dabble', dailyPuzzle.puzzleId, activePuzzleNumber, finalScore)
              .then(() => {
                // Mark as submitted to prevent duplicate submissions
                savePuzzleState(activePuzzleNumber, {
                  ...puzzleState,
                  data: { ...puzzleState.data, scoreSubmitted: true },
                }, dailyPuzzle.puzzleId);
                // Refresh top scores after backfill
                refetchTopScores();
              })
              .catch((error) => {
                console.warn('Failed to backfill score:', error);
              });
          }
        } else if (puzzleState?.status === 'in-progress') {
          // Validate saved state matches current puzzle (detects midnight rollover corruption)
          const placedTilesValid = validatePlacedTiles(
            puzzleState.data.placedTiles ?? [],
            dailyPuzzle.board,
            dailyPuzzle.letters
          );

          if (!placedTilesValid) {
            // Corrupted state - clear and start fresh
            console.warn('[Dabble] Corrupted in-progress state detected, resetting');
            clearPuzzleState(activePuzzleNumber, dailyPuzzle.puzzleId);
            setBoard(dailyPuzzle.board);
            setPlacedTiles([]);
            setUsedRackIndices(new Set());
            setLockedRackIndices(new Set());
            setSubmittedWords([]);
            setTurnCount(0);
            setTotalScore(0);
            if (isArchiveMode) {
              setGameState('playing');
            }
          } else {
            // Valid state - restore as normal
            if (isArchiveMode) {
              // Archive: restore and go directly to playing (skip landing)
              setBoard(puzzleState.data.board);
              setPlacedTiles(puzzleState.data.placedTiles ?? []);
              setUsedRackIndices(new Set(puzzleState.data.usedRackIndices ?? []));
              setLockedRackIndices(new Set(puzzleState.data.lockedRackIndices));
              setSubmittedWords(puzzleState.data.submittedWords);
              setTurnCount(puzzleState.data.turnCount ?? 0);
              setTotalScore(puzzleState.data.totalScore);
              setGameState('playing');
            } else {
              // Today: show landing with 'in-progress' mode
              setLandingMode('in-progress');
              setBoard(puzzleState.data.board);
              setPlacedTiles(puzzleState.data.placedTiles ?? []);
              setUsedRackIndices(new Set(puzzleState.data.usedRackIndices ?? []));
              setLockedRackIndices(new Set(puzzleState.data.lockedRackIndices));
              setSubmittedWords(puzzleState.data.submittedWords);
              setTurnCount(puzzleState.data.turnCount ?? 0);
              setTotalScore(puzzleState.data.totalScore);
            }
          }
        } else {
          // Fresh puzzle - Reset ALL state to prevent corruption
          setBoard(dailyPuzzle.board);
          setPlacedTiles([]);
          setUsedRackIndices(new Set());
          setLockedRackIndices(new Set());
          setSubmittedWords([]);
          setTurnCount(0);
          setTotalScore(0);
          if (isArchiveMode) {
            // Archive: go directly to playing (skip landing)
            setGameState('playing');
          }
          // Today: stay on landing (fresh)
        }
      } else {
        setBoard(dailyPuzzle.board);
        if (isPoolMode) {
          // Pool mode: start game immediately
          setGameState('playing');
        }
      }

      setIsLoading(false);
    }
    init();
  }, [debugMode, isArchiveMode, isPoolMode, poolIdParam, activePuzzleNumber]);

  // Log puzzle info in debug mode
  useEffect(() => {
    if (debugMode && puzzle) {
      console.log(`[Dabble Debug] Board archetype: ${puzzle.archetype}`);
      if (puzzle.thresholds) {
        const thresholdValues = getStarThresholdValues(puzzle.thresholds);
        console.log(`[Dabble Debug] Thresholds:`, {
          heuristicMax: puzzle.thresholds.heuristicMax,
          ...(thresholdValues || {}),
        });
      } else {
        console.log(`[Dabble Debug] No thresholds (client-generated puzzle)`);
      }
    }
  }, [debugMode, puzzle]);

  // Keep ref in sync with state for closure access
  useEffect(() => {
    scoreSubmissionCompleteRef.current = scoreSubmissionComplete;
  }, [scoreSubmissionComplete]);

  // Handle delayed results modal with celebration animation
  // Multi-phase: pulse (0-1800ms) -> tiles -> hold -> modal
  // Dynamic timing based on tile count to keep animation feeling balanced
  // Wait for both: minimum delay (for animation) AND score submission (for medal)
  useEffect(() => {
    if (pendingResultsModal) {
      setShowCelebration(true);
      setCelebrationPhase('pulse');
      let cancelled = false;

      // Calculate dynamic timing based on locked tile count
      const tileCount = lockedRackIndices.size || 1;
      // Stagger: more tiles = faster stagger, fewer tiles = slower stagger
      const staggerMs = Math.max(18, Math.round(180 / tileCount));
      // Hold delay: scale with tile count, cap at 450ms
      const holdDelayMs = Math.min(450, 300 + tileCount * 10);
      // Calculate when tiles finish: stagger * (count-1) + animation duration (300ms)
      const tilesAnimationMs = (tileCount - 1) * staggerMs + 300;

      // Phase 1: Board pulse (0-1800ms) - 1.8s slow glow in/out
      const pulseEndMs = 1800;
      // Phase 2: Tiles settle (starts at 1800ms)
      const tilesEndMs = pulseEndMs + tilesAnimationMs;
      // Phase 3: Hold, then open modal
      const modalOpenMs = tilesEndMs + holdDelayMs;

      const tilesTimer = setTimeout(() => {
        if (!cancelled) setCelebrationPhase('tiles');
      }, pulseEndMs);

      const holdTimer = setTimeout(() => {
        if (!cancelled) setCelebrationPhase('hold');
      }, tilesEndMs);

      // Open modal after hold phase
      const modalDelay = new Promise<void>(resolve => {
        resultsModalTimerRef.current = setTimeout(resolve, modalOpenMs);
      });

      const scoreWait = new Promise<void>(resolve => {
        if (scoreSubmissionCompleteRef.current) {
          resolve();
          return;
        }
        // Poll for completion (with 2s timeout)
        const checkInterval = setInterval(() => {
          if (scoreSubmissionCompleteRef.current || cancelled) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50);
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 2000);
      });

      Promise.all([modalDelay, scoreWait]).then(() => {
        if (!cancelled) {
          setShowCelebration(false);
          setCelebrationPhase(null);
          setShowShareModal(true);
          setPendingResultsModal(false);
        }
      });

      return () => {
        cancelled = true;
        clearTimeout(tilesTimer);
        clearTimeout(holdTimer);
        if (resultsModalTimerRef.current) {
          clearTimeout(resultsModalTimerRef.current);
          resultsModalTimerRef.current = null;
        }
      };
    }
  }, [pendingResultsModal, lockedRackIndices.size]);

  // Save in-progress state when playing (only if meaningful progress made)
  useEffect(() => {
    const hasMeaningfulProgress = placedTiles.length > 0 || submittedWords.length > 0;
    if (gameState === 'playing' && board && !debugMode && hasMeaningfulProgress) {
      savePuzzleState(activePuzzleNumber, {
        puzzleNumber: activePuzzleNumber,
        status: 'in-progress',
        data: {
          board,
          rackLetters,
          submittedWords,
          lockedRackIndices: Array.from(lockedRackIndices),
          totalScore,
          placedTiles,
          usedRackIndices: Array.from(usedRackIndices),
          turnCount,
        },
      }, activePuzzleId);
    }
  }, [gameState, board, rackLetters, placedTiles, usedRackIndices, lockedRackIndices, submittedWords, turnCount, totalScore, debugMode, activePuzzleNumber, activePuzzleId]);

  // Handle rack letter selection
  const handleRackClick = useCallback((index: number) => {
    if (usedRackIndices.has(index) || lockedRackIndices.has(index)) return;

    if (selectedRackIndex === index) {
      setSelectedRackIndex(null);
    } else {
      setSelectedRackIndex(index);
    }
  }, [selectedRackIndex, usedRackIndices, lockedRackIndices]);

  // Handle board cell click
  const handleCellClick = useCallback((row: number, col: number) => {
    if (!board) return;

    const cell = board.cells[row][col];
    if (!cell.isPlayable) return;

    if (cell.isLocked && cell.letter) return;

    const existingTileIndex = placedTiles.findIndex(
      (t) => t.row === row && t.col === col
    );

    if (existingTileIndex !== -1) {
      const tile = placedTiles[existingTileIndex];

      setPlacedTiles((prev) => prev.filter((_, i) => i !== existingTileIndex));
      if (tile.rackIndex !== undefined) {
        setUsedRackIndices((prev) => {
          const next = new Set(prev);
          next.delete(tile.rackIndex!);
          return next;
        });
      }

      setSelectedCell(null);
      return;
    }

    if (selectedRackIndex !== null) {
      const letter = rackLetters[selectedRackIndex];

      setPlacedTiles((prev) => [...prev, { row, col, letter, rackIndex: selectedRackIndex }]);
      setUsedRackIndices((prev) => new Set([...prev, selectedRackIndex]));
      setSelectedRackIndex(null);
      setSelectedCell(null);
    } else {
      setSelectedCell({ row, col });
    }
  }, [board, placedTiles, selectedRackIndex, rackLetters]);

  // Submit current placement
  const handleSubmit = useCallback(() => {
    if (!board || placedTiles.length === 0) {
      toast.show('Place some tiles first', 'error');
      return;
    }

    const isFirstWord = submittedWords.length === 0;
    const result = validatePlacement(board, placedTiles, isFirstWord);

    if (!result.valid) {
      toast.show(result.error || 'Invalid placement', 'error');
      return;
    }

    const newBoard = applyPlacement(board, placedTiles);
    setBoard(newBoard);

    const newLockedIndices = new Set([...lockedRackIndices, ...usedRackIndices]);
    setLockedRackIndices(newLockedIndices);

    // Word score only (letter bonus deferred to end of game)
    const turnScore = result.totalScore;

    // Show score popup animation
    setScorePopup({ score: turnScore, key: Date.now() });

    setSubmittedWords((prev) => [...prev, ...result.words]);
    setTotalScore((prev) => prev + turnScore);
    setPlacedTiles([]);
    setUsedRackIndices(new Set());

    // Increment turn counter
    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);

    // Check if game should end (out of turns OR all tiles used)
    if (newTurnCount >= MAX_TURNS || newLockedIndices.size === PUZZLE_LETTER_COUNT) {
      setGameState('finished');  // Immediate - prevents further moves

      const finalScore = totalScore + turnScore;
      const letterBonus = getLetterUsageBonus(newLockedIndices.size);
      const finalScoreWithBonus = finalScore + letterBonus;
      const stars = calculateStars(finalScoreWithBonus, puzzle?.thresholds);

      // Track game completion
      trackGameComplete({
        game: 'dabble',
        puzzleNumber: activePuzzleNumber,
        puzzleId: activePuzzleId,
        isArchive: isArchiveMode,
        score: finalScoreWithBonus,
        stars,
        lettersUsed: newLockedIndices.size,
        letterBonus,
      });

      // Save completion state with full board and thresholds (immediately, before delay)
      // Note: scoreSubmitted is set to true because we submit below
      savePuzzleState(activePuzzleNumber, {
        puzzleNumber: activePuzzleNumber,
        status: 'completed',
        data: {
          board: newBoard,
          rackLetters: [],
          submittedWords: [...submittedWords, ...result.words],
          lockedRackIndices: Array.from(newLockedIndices),
          totalScore: finalScore,
          thresholds: puzzle?.thresholds,
          scoreSubmitted: true,
        },
      }, activePuzzleId);

      // Submit score to leaderboard (silent fail - don't interrupt game completion)
      if (!debugMode && activePuzzleId) {
        submitTopScore(
          'dabble',
          activePuzzleId,
          activePuzzleNumber,
          finalScoreWithBonus
        )
          .then((scoreResult) => {
            setIsTopScore(scoreResult.isTopScore);
            setTopScoreRank(scoreResult.rank);
            refetchTopScores();
          })
          .catch((error) => {
            console.warn('Failed to submit score:', error);
          })
          .finally(() => {
            setScoreSubmissionComplete(true);
          });
      } else {
        // No score submission (debug mode or no puzzleId), mark complete immediately
        setScoreSubmissionComplete(true);
      }

      // Trigger delayed results modal via state (proper cleanup in useEffect)
      setPendingResultsModal(true);
    }
  }, [board, placedTiles, submittedWords, lockedRackIndices, usedRackIndices, turnCount, puzzle, totalScore, activePuzzleNumber, activePuzzleId, debugMode, refetchTopScores, toast]);

  // Clear current placement
  const handleClear = useCallback(() => {
    setPlacedTiles([]);
    setUsedRackIndices(new Set());
    setSelectedRackIndex(null);
    setSelectedCell(null);
  }, []);

  // Finish game and show share modal
  const handleFinish = useCallback(() => {
    if (submittedWords.length === 0 || !board) {
      toast.show('Submit at least one word first', 'error');
      return;
    }
    setGameState('finished');

    const letterBonus = getLetterUsageBonus(lockedRackIndices.size);
    const finalScoreWithBonus = totalScore + letterBonus;
    const stars = calculateStars(finalScoreWithBonus, puzzle?.thresholds);

    // Track game completion
    trackGameComplete({
      game: 'dabble',
      puzzleNumber: activePuzzleNumber,
      puzzleId: activePuzzleId,
      isArchive: isArchiveMode,
      score: finalScoreWithBonus,
      stars,
      lettersUsed: lockedRackIndices.size,
      letterBonus,
    });

    // Save completion state with full board and thresholds
    // Note: scoreSubmitted is set to true because we submit below
    savePuzzleState(activePuzzleNumber, {
      puzzleNumber: activePuzzleNumber,
      status: 'completed',
      data: {
        board,
        rackLetters: [],
        submittedWords,
        lockedRackIndices: Array.from(lockedRackIndices),
        totalScore,
        thresholds: puzzle?.thresholds,
        scoreSubmitted: true,
      },
    }, activePuzzleId);

    // Submit score to leaderboard (silent fail - don't interrupt game completion)
    if (!debugMode && activePuzzleId) {
      submitTopScore(
        'dabble',
        activePuzzleId,
        activePuzzleNumber,
        finalScoreWithBonus
      )
        .then((scoreResult) => {
          setIsTopScore(scoreResult.isTopScore);
          setTopScoreRank(scoreResult.rank);
          refetchTopScores();
        })
        .catch((error) => {
          console.warn('Failed to submit score:', error);
        })
        .finally(() => {
          setScoreSubmissionComplete(true);
        });
    } else {
      // No score submission (debug mode or no puzzleId), mark complete immediately
      setScoreSubmissionComplete(true);
    }

    // Trigger delayed results modal via state (proper cleanup in useEffect)
    setPendingResultsModal(true);
  }, [submittedWords, puzzle, totalScore, lockedRackIndices, board, activePuzzleNumber, activePuzzleId, isArchiveMode, debugMode, refetchTopScores, toast]);

  // Replay the same puzzle (clear state and start fresh)
  const handleReplay = useCallback(() => {
    if (!puzzle) return;

    // Clear saved state for this puzzle
    clearPuzzleState(activePuzzleNumber, activePuzzleId);

    // Reset to initial puzzle state
    setBoard(puzzle.board);
    setRackLetters(puzzle.letters);
    setPlacedTiles([]);
    setUsedRackIndices(new Set());
    setLockedRackIndices(new Set());
    setSelectedRackIndex(null);
    setSelectedCell(null);
    setSubmittedWords([]);
    setTurnCount(0);
    setTotalScore(0);
    setShowShareModal(false);
    setScoreSubmissionComplete(false);
    setIsTopScore(false);
    setTopScoreRank(null);
    setGameState('playing');
  }, [puzzle, activePuzzleNumber, activePuzzleId]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData;
    if (data?.type === 'rack-tile' || data?.type === 'board-tile') {
      setActiveDragLetter(data.letter);
      setActiveDragId(event.active.id as string);
      setIsDraggingBoardTile(data.type === 'board-tile');
      setSelectedRackIndex(null);
    }
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragLetter(null);
    setActiveDragId(null);
    setIsDraggingBoardTile(false);

    const { active, over } = event;
    if (!board) return;

    const dragData = active.data.current as DragData;
    if (!dragData) return;

    if (over) {
      const overId = over.id as string;

      // Handle drops back to rack
      if (overId === 'rack-drop-zone' && dragData.type === 'board-tile') {
        const { row: fromRow, col: fromCol, rackIndex } = dragData;
        setPlacedTiles((prev) =>
          prev.filter((t) => !(t.row === fromRow && t.col === fromCol))
        );
        setUsedRackIndices((prev) => {
          const next = new Set(prev);
          next.delete(rackIndex);
          return next;
        });
        return;
      }

      if (overId.startsWith('cell-')) {
        const [, rowStr, colStr] = overId.split('-');
        const row = parseInt(rowStr, 10);
        const col = parseInt(colStr, 10);

        const cell = board.cells[row][col];
        if (!cell.isPlayable || cell.isLocked || cell.letter) return;

        const existingTile = placedTiles.find((t) => t.row === row && t.col === col);
        if (existingTile) return;

        if (dragData.type === 'rack-tile') {
          const { letter, rackIndex } = dragData;
          setPlacedTiles((prev) => [...prev, { row, col, letter, rackIndex }]);
          setUsedRackIndices((prev) => new Set([...prev, rackIndex]));
        } else if (dragData.type === 'board-tile') {
          const { letter, rackIndex, row: fromRow, col: fromCol } = dragData;
          setPlacedTiles((prev) =>
            prev
              .filter((t) => !(t.row === fromRow && t.col === fromCol))
              .concat({ row, col, letter, rackIndex })
          );
        }
      }
    }
  }, [board, placedTiles]);

  // Start playing
  const handlePlay = useCallback(() => {
    trackGameStart({
      game: 'dabble',
      puzzleNumber: activePuzzleNumber,
      puzzleId: activePuzzleId,
      isArchive: isArchiveMode,
      isResume: false,
    });
    setGameState('playing');
  }, [activePuzzleNumber, activePuzzleId, isArchiveMode]);

  // Handle resume (in-progress)
  const handleResume = useCallback(() => {
    trackGameStart({
      game: 'dabble',
      puzzleNumber: activePuzzleNumber,
      puzzleId: activePuzzleId,
      isArchive: isArchiveMode,
      isResume: true,
    });
    setGameState('playing');
  }, [activePuzzleNumber, activePuzzleId, isArchiveMode]);

  // Handle see results (completed)
  const handleSeeResults = useCallback(() => {
    setShowShareModal(false);
    setGameState('finished');
  }, []);

  // Debug: Press 'c' to replay celebration animation when finished
  useEffect(() => {
    if (!debugMode || gameState !== 'finished') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'c' && !showShareModal && !pendingResultsModal) {
        setScoreSubmissionComplete(true); // Skip score wait
        setPendingResultsModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [debugMode, gameState, showShareModal, pendingResultsModal]);

  // Get puzzle info for display (use activePuzzleNumber for archive mode)
  const puzzleInfo = isArchiveMode
    ? {
        number: activePuzzleNumber,
        date: formatDisplayDate(getDateForPuzzleNumber(PUZZLE_BASE_DATE, activePuzzleNumber)),
      }
    : dabbleConfig.getPuzzleInfo();

  // Loading state
  if (isLoading || !board || !puzzle) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="text-[var(--foreground)] text-lg">Loading puzzle...</div>
      </div>
    );
  }

  // Landing screen
  if (gameState === 'landing') {
    return (
      <>
        <LandingScreen
          icon={dabbleConfig.icon}
          name={dabbleConfig.name}
          description={dabbleConfig.description}
          puzzleInfo={puzzleInfo}
          mode={landingMode}
          onPlay={handlePlay}
          onResume={handleResume}
          onSeeResults={handleSeeResults}
          onRules={() => setShowRulesModal(true)}
          archiveHref="/archive"
          gameId="dabble"
          onReportBug={bugReporter.open}
        />
        <HowToPlayModal
          isOpen={showRulesModal}
          onClose={() => setShowRulesModal(false)}
        />
        {/* Results modal accessible from landing when completed */}
        {landingMode === 'completed' && puzzle && (
          <DabbleResultsModal
            isOpen={showShareModal}
            onClose={() => setShowShareModal(false)}
            puzzleNumber={puzzleInfo.number}
            totalScore={totalScore}
            lettersUsed={lockedRackIndices.size}
            thresholds={puzzle.thresholds}
            isArchive={isArchiveMode}
            isTopScore={isCurrentlyTopScore}
            topScoreRank={currentTopScoreRank}
          />
        )}
      </>
    );
  }

  // Playing/finished state
  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <GameContainer
        maxWidth="md"
        navBar={
          <NavBar
            title={`${dabbleConfig.name} #${puzzleInfo.number}`}
            gameId={dabbleConfig.id}
            onRulesClick={() => setShowRulesModal(true)}
            onReportBug={bugReporter.open}
            rightContent={
              <div className="flex items-center gap-4 pr-1">
                {gameState === 'finished' ? (
                  <div className="text-xl">
                    {formatStars(calculateStars(totalScore + getLetterUsageBonus(lockedRackIndices.size), puzzle.thresholds))}
                  </div>
                ) : (
                  <div className="text-[var(--muted)]">
                    <span className="opacity-60">Turn:</span> <span className="text-lg">{turnCount + 1}/{MAX_TURNS}</span>
                  </div>
                )}
                <button
                  onClick={() => setShowThresholdsModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--tile-bg)] hover:bg-[var(--tile-bg-selected)] transition-colors cursor-pointer"
                >
                  <span className="text-2xl font-bold text-[var(--accent)]">
                    {gameState === 'finished' ? totalScore + getLetterUsageBonus(lockedRackIndices.size) : totalScore}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-[var(--muted)]"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </button>
              </div>
            }
          />
        }
      >
        {/* Main game area */}
        <div className="flex flex-col items-center gap-4 w-full py-2">
          {/* Game Board with score popup */}
          <div className="relative w-full max-w-[400px]">
            <GameBoard
              board={board}
              placedTiles={placedTiles}
              selectedCell={selectedCell}
              activeDragId={activeDragId}
              onCellClick={handleCellClick}
              disabled={gameState === 'finished'}
              showCelebration={showCelebration}
              celebrationPhase={celebrationPhase}
              lockedTileCount={lockedRackIndices.size}
            />
            {scorePopup && (
              <div
                key={scorePopup.key}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-rose-500 pointer-events-none"
                style={{ animation: 'scorePopup 1.2s ease-out forwards' }}
                onAnimationEnd={() => setScorePopup(null)}
              >
                +{scorePopup.score}
              </div>
            )}
          </div>

          {/* Letter Rack */}
          <LetterRack
            letters={rackLetters}
            usedIndices={usedRackIndices}
            lockedIndices={lockedRackIndices}
            selectedIndex={selectedRackIndex}
            onLetterClick={handleRackClick}
            isDraggingBoardTile={isDraggingBoardTile}
            disabled={gameState === 'finished'}
          />

          {/* Action buttons - only show when playing */}
          {gameState === 'playing' && (
            <div className="flex gap-2 w-full max-w-xs items-center">
              {/* Clear button - small icon */}
              <button
                onClick={handleClear}
                disabled={placedTiles.length === 0}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-neutral-700 hover:bg-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Clear placed tiles"
              >
                <svg className="w-5 h-5 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {/* Submit button - takes remaining width */}
              <Button
                variant="primary"
                fullWidth
                onClick={handleSubmit}
                disabled={placedTiles.length === 0 || turnCount >= MAX_TURNS}
              >
                Submit Word
              </Button>
            </div>
          )}

          {/* Word list */}
          <WordList
            words={submittedWords}
            letterBonus={gameState === 'finished' ? getLetterUsageBonus(lockedRackIndices.size) : undefined}
            lettersUsed={lockedRackIndices.size}
            totalLetters={PUZZLE_LETTER_COUNT}
          />

          {/* Finish button - only show when playing and have words */}
          {gameState === 'playing' && submittedWords.length > 0 && (
            <Button
              variant="primary"
              fullWidth
              onClick={handleFinish}
              className="max-w-xs !bg-violet-500 hover:!bg-violet-600"
            >
              Finish
            </Button>
          )}

          {/* See Results and Play Again buttons - show when finished and modal is closed */}
          {gameState === 'finished' && !showShareModal && (
            <div className="flex gap-2 w-full max-w-xs">
              <Button
                variant="primary"
                fullWidth
                onClick={() => setShowShareModal(true)}
              >
                See Results
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={handleReplay}
              >
                Play Again
              </Button>
            </div>
          )}
        </div>
      </GameContainer>

      {/* Modals */}
      <DabbleResultsModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        puzzleNumber={puzzleInfo.number}
        totalScore={totalScore}
        lettersUsed={lockedRackIndices.size}
        thresholds={puzzle.thresholds}
        isArchive={isArchiveMode}
        isTopScore={isCurrentlyTopScore}
        topScoreRank={currentTopScoreRank}
      />
      <HowToPlayModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
      <ScoreThresholdsModal
        isOpen={showThresholdsModal}
        onClose={() => setShowThresholdsModal(false)}
        thresholds={puzzle.thresholds}
        topScores={topScores}
        isLoadingTopScores={isLoadingTopScores}
      />

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragLetter && <DragOverlayTile letter={activeDragLetter} />}
      </DragOverlay>

    </DndContext>
  );
}
