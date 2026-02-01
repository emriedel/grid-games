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
import { LandingScreen, NavBar, GameContainer, Button, DebugPanel, DebugButton } from '@grid-games/ui';
import { GameBoard } from './GameBoard';
import { LetterRack } from './LetterRack';
import { WordList } from './WordList';
import { ShareModal } from './ShareModal';
import { HowToPlayModal } from './HowToPlayModal';
import { DragOverlayTile } from './Tile';
import { useSearchParams } from 'next/navigation';
import { generateDailyPuzzle, generateRandomPuzzle } from '@/lib/puzzleGenerator';
import { loadDictionary } from '@/lib/dictionary';
import { validatePlacement, applyPlacement } from '@/lib/gameLogic';
import { dabbleConfig } from '@/config';
import { MAX_TURNS } from '@/constants/gameConfig';
import type { DailyPuzzle, GameBoard as GameBoardType, PlacedTile, Word, DragData } from '@/types';

type GameState = 'landing' | 'playing' | 'finished';

export function Game() {
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === 'true';

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
      const dailyPuzzle = generateDailyPuzzle();
      setPuzzle(dailyPuzzle);
      setBoard(dailyPuzzle.board);
      setRackLetters(dailyPuzzle.letters);
      setIsLoading(false);
    }
    init();
  }, []);

  // Log puzzle archetype in debug mode
  useEffect(() => {
    if (debugMode && puzzle?.archetype) {
      console.log(`[Dabble Debug] Board archetype: ${puzzle.archetype}`);
    }
  }, [debugMode, puzzle]);

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

    // Check if game should end
    if (newTurnCount >= MAX_TURNS) {
      setGameState('finished');
      setShowShareModal(true);
    }

    setError(null);
  }, [board, placedTiles, submittedWords.length, lockedRackIndices, usedRackIndices, turnCount]);

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
    if (submittedWords.length === 0) {
      setError('Submit at least one word first');
      return;
    }
    setGameState('finished');
    setShowShareModal(true);
  }, [submittedWords.length]);

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

  // Get puzzle info for display
  const puzzleInfo = dabbleConfig.getPuzzleInfo();

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
          onPlay={handlePlay}
          onRules={() => setShowRulesModal(true)}
          homeUrl="/"
        />
        <HowToPlayModal
          isOpen={showRulesModal}
          onClose={() => setShowRulesModal(false)}
        />
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
            title={dabbleConfig.name}
            gameId={dabbleConfig.id}
            onRulesClick={() => setShowRulesModal(true)}
            rightContent={
              <div className="flex items-center gap-5">
                {gameState === 'finished' ? (
                  <div className="text-xs text-[var(--success)]"></div>
                ) : (
                  <div className="text-s text-[var(--muted)]">Turn: {turnCount + 1}/{MAX_TURNS}</div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-s text-[var(--muted)]">Score:</span>
                  <span className="text-2xl font-bold text-[var(--accent)]">{totalScore}</span>
                </div>
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
          <WordList words={submittedWords} />

          {/* Finish button - only show when playing and have words */}
          {gameState === 'playing' && submittedWords.length > 0 && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleFinish}
              className="max-w-xs !bg-violet-500 hover:!bg-violet-600"
            >
              Finish & Share
            </Button>
          )}

          {/* View Results button - show when finished and modal is closed */}
          {gameState === 'finished' && !showShareModal && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setShowShareModal(true)}
              className="max-w-xs !bg-violet-500 hover:!bg-violet-600"
            >
              View Results
            </Button>
          )}
        </div>
      </GameContainer>

      {/* Modals */}
      <ShareModal
        isOpen={showShareModal}
        date={puzzle.date}
        words={submittedWords}
        totalScore={totalScore}
        lettersUsed={lockedRackIndices.size}
        onClose={() => setShowShareModal(false)}
      />
      <HowToPlayModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDragLetter && <DragOverlayTile letter={activeDragLetter} />}
      </DragOverlay>
    </DndContext>
  );
}
