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
import { LandingScreen, NavBar, GameContainer, Button } from '@grid-games/ui';
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
import { getPerTurnTileBonus, getLetterUsageBonus } from '@/constants/gameConfig';
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
  const [totalScore, setTotalScore] = useState(0);
  const [totalBonuses, setTotalBonuses] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [activeDragLetter, setActiveDragLetter] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

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

    // Calculate bonuses
    const tilesPlacedThisTurn = placedTiles.length;
    const tileBonus = getPerTurnTileBonus(tilesPlacedThisTurn);

    const previousLettersUsed = lockedRackIndices.size;
    const newLettersUsed = newLockedIndices.size;
    // Only award the difference in letter usage bonus (not cumulative)
    const previousLetterBonus = getLetterUsageBonus(previousLettersUsed);
    const newLetterBonus = getLetterUsageBonus(newLettersUsed);
    const letterBonusDelta = newLetterBonus - previousLetterBonus;

    const totalBonus = tileBonus + letterBonusDelta;

    setSubmittedWords((prev) => [...prev, ...result.words]);
    setTotalScore((prev) => prev + result.totalScore + totalBonus);
    setTotalBonuses((prev) => prev + totalBonus);
    setPlacedTiles([]);
    setUsedRackIndices(new Set());

    // Show feedback message
    const bonusMessages: string[] = [];
    if (tileBonus > 0) {
      bonusMessages.push(`+${tileBonus} tile bonus`);
    }
    if (letterBonusDelta > 0) {
      bonusMessages.push(`+${letterBonusDelta} letter bonus`);
    }

    if (bonusMessages.length > 0) {
      setError(bonusMessages.join(', ') + '!');
    } else {
      setError(null);
    }
  }, [board, placedTiles, submittedWords.length, lockedRackIndices, usedRackIndices, rackLetters.length]);

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
    setTotalScore(0);
    setTotalBonuses(0);
    setError(null);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData;
    if (data?.type === 'rack-tile' || data?.type === 'board-tile') {
      setActiveDragLetter(data.letter);
      setActiveDragId(event.active.id as string);
      setSelectedRackIndex(null);
    }
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragLetter(null);
    setActiveDragId(null);

    const { active, over } = event;
    if (!board) return;

    const dragData = active.data.current as DragData;
    if (!dragData) return;

    if (over) {
      const overId = over.id as string;
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
        />
        <HowToPlayModal
          isOpen={showRulesModal}
          onClose={() => setShowRulesModal(false)}
        />
      </>
    );
  }

  const availableLetterCount = rackLetters.length - lockedRackIndices.size - usedRackIndices.size;

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
            homeUrl={dabbleConfig.homeUrl}
            onRulesClick={() => setShowRulesModal(true)}
            rightContent={
              <div className="text-right">
                <div className="text-xl font-bold text-[var(--accent)]">{totalScore}</div>
                <div className="text-xs text-[var(--muted)]">Score</div>
              </div>
            }
          />
        }
      >
        {/* Debug button */}
        {debugMode && (
          <button
            onClick={handleNewPuzzle}
            className="mb-2 px-3 py-1 text-xs font-medium rounded bg-purple-600 hover:bg-purple-500 transition-colors"
          >
            New Puzzle
          </button>
        )}

        {/* Main game area */}
        <div className="flex flex-col items-center gap-4 w-full py-2">
          {/* Game Board */}
          <GameBoard
            board={board}
            placedTiles={placedTiles}
            selectedCell={selectedCell}
            activeDragId={activeDragId}
            onCellClick={handleCellClick}
          />

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
          />

          {/* Action buttons */}
          <div className="flex gap-3 w-full max-w-xs">
            <Button
              variant="secondary"
              fullWidth
              onClick={handleClear}
              disabled={placedTiles.length === 0}
            >
              Clear
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleSubmit}
              disabled={placedTiles.length === 0}
              className="!bg-[var(--success)] hover:!bg-[var(--success)]/80"
            >
              Submit Word
            </Button>
          </div>

          {/* Status info */}
          <div className="flex gap-4 text-sm text-[var(--muted)]">
            <span>{submittedWords.length} words</span>
            <span>{availableLetterCount} letters left</span>
          </div>

          {/* Word list */}
          <WordList words={submittedWords} />

          {/* Finish button */}
          {submittedWords.length > 0 && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleFinish}
              className="max-w-xs"
            >
              Finish & Share
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
        totalBonuses={totalBonuses}
        allLettersUsed={lockedRackIndices.size === rackLetters.length}
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
