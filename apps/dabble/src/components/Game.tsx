'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { LandingScreen, NavBar, GameContainer, Button, DebugPanel, DebugButton, ResultsModal, Modal } from '@grid-games/ui';
import { buildShareText, formatDisplayDate, getDateForPuzzleNumber, getPuzzleNumber } from '@grid-games/shared';
import { GameBoard } from './GameBoard';
import { LetterRack } from './LetterRack';
import { WordList } from './WordList';
import { HowToPlayModal } from './HowToPlayModal';
import { getLetterUsageBonus, STAR_THRESHOLDS } from '@/constants/gameConfig';
import { DragOverlayTile } from './Tile';
import { useSearchParams } from 'next/navigation';
import { generateDailyPuzzle, generateRandomPuzzle, fetchDailyPuzzle } from '@/lib/puzzleGenerator';
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

// Dabble-specific wrapper for ResultsModal
interface DabbleResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  puzzleNumber?: number;
  totalScore: number;
  lettersUsed: number;
  thresholds?: StarThresholds;
}

function DabbleResultsModal({
  isOpen,
  onClose,
  date,
  puzzleNumber,
  totalScore,
  lettersUsed,
  thresholds,
}: DabbleResultsModalProps) {
  const displayDate = formatDisplayDate(date);
  const letterBonus = getLetterUsageBonus(lettersUsed);
  const finalScore = totalScore + letterBonus;
  const stars = calculateStars(finalScore, thresholds);

  const starsDisplay = thresholds ? ` ${formatStars(stars)}` : '';
  const emojiGrid = thresholds ? formatStars(stars) : '';

  const shareText = buildShareText({
    gameId: 'dabble',
    gameName: 'Dabble',
    puzzleId: puzzleNumber ? `#${puzzleNumber}` : displayDate,
    score: finalScore,
    emojiGrid,
    shareUrl: 'https://nerdcube.games/dabble',
  });

  return (
    <ResultsModal
      isOpen={isOpen}
      onClose={onClose}
      gameId="dabble"
      gameName="Dabble"
      date={displayDate}
      puzzleNumber={puzzleNumber}
      primaryStat={{ value: finalScore, label: 'points' }}
      shareConfig={{ text: shareText }}
    >
      {/* Stars display */}
      {thresholds && (
        <div className="text-center mb-4">
          <span className="text-3xl text-[var(--foreground)]">{formatStars(stars)}</span>
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
}

function ScoreThresholdsModal({ isOpen, onClose, thresholds }: ScoreThresholdsModalProps) {
  const thresholdValues = getStarThresholdValues(thresholds);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Star Thresholds">
      {thresholdValues && (
        <div className="flex justify-center gap-8">
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
    </Modal>
  );
}


export function Game() {
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === 'true';
  const puzzleParam = searchParams.get('puzzle');

  // Determine if this is archive mode
  const archivePuzzleNumber = puzzleParam ? parseInt(puzzleParam, 10) : null;
  const isArchiveMode = archivePuzzleNumber !== null && !isNaN(archivePuzzleNumber) && archivePuzzleNumber >= 1;
  const todayPuzzleNumber = getTodayPuzzleNumber();

  // Get the puzzle number to use (archive or today)
  const activePuzzleNumber = isArchiveMode ? archivePuzzleNumber : todayPuzzleNumber;

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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [activeDragLetter, setActiveDragLetter] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isDraggingBoardTile, setIsDraggingBoardTile] = useState(false);
  const [scorePopup, setScorePopup] = useState<{ score: number; key: number } | null>(null);
  const [landingMode, setLandingMode] = useState<'fresh' | 'in-progress' | 'completed'>('fresh');
  const [showThresholdsModal, setShowThresholdsModal] = useState(false);

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

  // Initialize game
  useEffect(() => {
    async function init() {
      await loadDictionary();

      // Fetch puzzle for the active puzzle number (uses pre-generated with thresholds if available)
      // For archive mode, we need to get the date string for that puzzle number
      const puzzleDateString = isArchiveMode
        ? getDateForPuzzleNumber(PUZZLE_BASE_DATE, activePuzzleNumber)
        : undefined; // undefined = today
      const dailyPuzzle = await fetchDailyPuzzle(puzzleDateString);
      setPuzzle(dailyPuzzle);
      setRackLetters(dailyPuzzle.letters);

      // Check for saved state (skip in debug mode)
      if (!debugMode) {
        // Check puzzle state using unified storage
        const puzzleState = getPuzzleState(activePuzzleNumber);

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
        } else if (puzzleState?.status === 'in-progress') {
          // Puzzle is in-progress
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
        } else {
          // Fresh puzzle
          setBoard(dailyPuzzle.board);
          if (isArchiveMode) {
            // Archive: go directly to playing (skip landing)
            setGameState('playing');
          }
          // Today: stay on landing (fresh)
        }
      } else {
        setBoard(dailyPuzzle.board);
      }

      setIsLoading(false);
    }
    init();
  }, [debugMode, isArchiveMode, activePuzzleNumber]);

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
      });
    }
  }, [gameState, board, rackLetters, placedTiles, usedRackIndices, lockedRackIndices, submittedWords, turnCount, totalScore, debugMode, activePuzzleNumber]);

  // Handle rack letter selection
  const handleRackClick = useCallback((index: number) => {
    if (usedRackIndices.has(index) || lockedRackIndices.has(index)) return;

    if (selectedRackIndex === index) {
      setSelectedRackIndex(null);
    } else {
      setSelectedRackIndex(index);
    }
    setError(null);
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
      setError(null);
      return;
    }

    if (selectedRackIndex !== null) {
      const letter = rackLetters[selectedRackIndex];

      setPlacedTiles((prev) => [...prev, { row, col, letter, rackIndex: selectedRackIndex }]);
      setUsedRackIndices((prev) => new Set([...prev, selectedRackIndex]));
      setSelectedRackIndex(null);
      setSelectedCell(null);
      setError(null);
    } else {
      setSelectedCell({ row, col });
    }
  }, [board, placedTiles, selectedRackIndex, rackLetters]);

  // Submit current placement
  const handleSubmit = useCallback(() => {
    if (!board || placedTiles.length === 0) {
      setError('Place some tiles first');
      return;
    }

    const isFirstWord = submittedWords.length === 0;
    const result = validatePlacement(board, placedTiles, isFirstWord);

    if (!result.valid) {
      setError(result.error || 'Invalid placement');
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
      setGameState('finished');
      setShowShareModal(true);
      // Save completion state with full board and thresholds
      savePuzzleState(activePuzzleNumber, {
        puzzleNumber: activePuzzleNumber,
        status: 'completed',
        data: {
          board: newBoard,
          rackLetters: [],
          submittedWords: [...submittedWords, ...result.words],
          lockedRackIndices: Array.from(newLockedIndices),
          totalScore: totalScore + turnScore,
          thresholds: puzzle?.thresholds,
        },
      });
    }

    setError(null);
  }, [board, placedTiles, submittedWords.length, lockedRackIndices, usedRackIndices, turnCount, puzzle, totalScore, activePuzzleNumber]);

  // Clear current placement
  const handleClear = useCallback(() => {
    setPlacedTiles([]);
    setUsedRackIndices(new Set());
    setSelectedRackIndex(null);
    setSelectedCell(null);
    setError(null);
  }, []);

  // Finish game and show share modal
  const handleFinish = useCallback(() => {
    if (submittedWords.length === 0 || !board) {
      setError('Submit at least one word first');
      return;
    }
    setGameState('finished');
    setShowShareModal(true);
    // Save completion state with full board and thresholds
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
      },
    });
  }, [submittedWords, puzzle, totalScore, lockedRackIndices, board, activePuzzleNumber]);

  // Generate a new random puzzle (debug mode only)
  const handleNewPuzzle = useCallback(() => {
    const newPuzzle = generateRandomPuzzle();
    setPuzzle(newPuzzle);
    setBoard(newPuzzle.board);
    setRackLetters(newPuzzle.letters);
    setPlacedTiles([]);
    setUsedRackIndices(new Set());
    setLockedRackIndices(new Set());
    setSelectedRackIndex(null);
    setSelectedCell(null);
    setSubmittedWords([]);
    setTurnCount(0);
    setTotalScore(0);
    setError(null);
    setGameState('playing');
  }, []);

  // Replay the same puzzle (clear state and start fresh)
  const handleReplay = useCallback(() => {
    if (!puzzle) return;

    // Clear saved state for this puzzle
    clearPuzzleState(activePuzzleNumber);

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
    setError(null);
    setShowShareModal(false);
    setGameState('playing');
  }, [puzzle, activePuzzleNumber]);

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
        setError(null);
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
          setError(null);
        } else if (dragData.type === 'board-tile') {
          const { letter, rackIndex, row: fromRow, col: fromCol } = dragData;
          setPlacedTiles((prev) =>
            prev
              .filter((t) => !(t.row === fromRow && t.col === fromCol))
              .concat({ row, col, letter, rackIndex })
          );
          setError(null);
        }
      }
    }
  }, [board, placedTiles]);

  // Start playing
  const handlePlay = useCallback(() => {
    setGameState('playing');
  }, []);

  // Handle resume (in-progress)
  const handleResume = useCallback(() => {
    setGameState('playing');
  }, []);

  // Handle see results (completed)
  const handleSeeResults = useCallback(() => {
    setShowShareModal(false);
    setGameState('finished');
  }, []);

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
            date={puzzle.date}
            puzzleNumber={puzzleInfo.number}
            totalScore={totalScore}
            lettersUsed={lockedRackIndices.size}
            thresholds={puzzle.thresholds}
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
        {/* Debug Panel */}
        {debugMode && (
          <DebugPanel>
            <DebugButton onClick={handleNewPuzzle} />
          </DebugPanel>
        )}

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

          {/* Error message */}
          {error && (
            <div className={`text-sm font-medium px-4 py-2 rounded ${
              error.includes('bonus')
                ? 'text-[var(--success)] bg-[var(--success)]/20'
                : 'text-[var(--danger)] bg-[var(--danger)]/20'
            }`}>
              {error}
            </div>
          )}

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
        date={puzzle.date}
        puzzleNumber={puzzleInfo.number}
        totalScore={totalScore}
        lettersUsed={lockedRackIndices.size}
        thresholds={puzzle.thresholds}
      />
      <HowToPlayModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
      <ScoreThresholdsModal
        isOpen={showThresholdsModal}
        onClose={() => setShowThresholdsModal(false)}
        thresholds={puzzle.thresholds}
      />

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragLetter && <DragOverlayTile letter={activeDragLetter} />}
      </DragOverlay>
    </DndContext>
  );
}
