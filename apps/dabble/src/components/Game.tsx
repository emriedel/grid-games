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
import { GameBoard } from './GameBoard';
import { LetterRack } from './LetterRack';
import { WordList } from './WordList';
import { ShareModal } from './ShareModal';
import { DragOverlayTile } from './Tile';
import { useSearchParams } from 'next/navigation';
import { generateDailyPuzzle, generateRandomPuzzle } from '@/lib/puzzleGenerator';
import { loadDictionary } from '@/lib/dictionary';
import { validatePlacement, applyPlacement } from '@/lib/gameLogic';
import type { DailyPuzzle, GameBoard as GameBoardType, PlacedTile, Word, DragData } from '@/types';

// Bonus for using all letters in the puzzle
const ALL_LETTERS_BONUS = 50;

export function Game() {
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === 'true';

  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [board, setBoard] = useState<GameBoardType | null>(null);
  const [rackLetters, setRackLetters] = useState<string[]>([]);
  const [placedTiles, setPlacedTiles] = useState<PlacedTile[]>([]);
  const [usedRackIndices, setUsedRackIndices] = useState<Set<number>>(new Set()); // Currently placed (not yet submitted)
  const [lockedRackIndices, setLockedRackIndices] = useState<Set<number>>(new Set()); // Permanently used (submitted)
  const [selectedRackIndex, setSelectedRackIndex] = useState<number | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [submittedWords, setSubmittedWords] = useState<Word[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [activeDragLetter, setActiveDragLetter] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Configure drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // 8px before drag starts
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,    // Hold 150ms before drag (allows normal taps)
        tolerance: 5,  // 5px movement tolerance during delay
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
    // Can't select if already used (placed or locked)
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

    // If cell is locked (has a submitted letter), do nothing
    if (cell.isLocked && cell.letter) return;

    // Check if there's already a placed tile here
    const existingTileIndex = placedTiles.findIndex(
      (t) => t.row === row && t.col === col
    );

    if (existingTileIndex !== -1) {
      // Remove the placed tile and return letter to rack
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

    // If we have a selected letter, place it
    if (selectedRackIndex !== null) {
      const letter = rackLetters[selectedRackIndex];

      setPlacedTiles((prev) => [...prev, { row, col, letter, rackIndex: selectedRackIndex }]);
      setUsedRackIndices((prev) => new Set([...prev, selectedRackIndex]));
      setSelectedRackIndex(null);
      setSelectedCell(null);
      setError(null);
    } else {
      // Select the cell (for future keyboard input maybe)
      setSelectedCell({ row, col });
    }
  }, [board, placedTiles, selectedRackIndex, rackLetters, usedRackIndices]);

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

    // Apply the placement to the board
    const newBoard = applyPlacement(board, placedTiles);
    setBoard(newBoard);

    // Lock the used rack indices (permanently consume those letters)
    const newLockedIndices = new Set([...lockedRackIndices, ...usedRackIndices]);
    setLockedRackIndices(newLockedIndices);

    // Check if all letters are now used
    const allLettersUsed = newLockedIndices.size === rackLetters.length;
    const bonus = allLettersUsed ? ALL_LETTERS_BONUS : 0;

    // Update game state
    setSubmittedWords((prev) => [...prev, ...result.words]);
    setTotalScore((prev) => prev + result.totalScore + bonus);
    setPlacedTiles([]);
    setUsedRackIndices(new Set());
    setError(allLettersUsed ? null : null);

    // Show bonus message briefly
    if (allLettersUsed) {
      setError(`All letters used! +${ALL_LETTERS_BONUS} bonus!`);
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
    setError(null);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData;
    if (data?.type === 'rack-tile' || data?.type === 'board-tile') {
      setActiveDragLetter(data.letter);
      setActiveDragId(event.active.id as string);
      setSelectedRackIndex(null); // Clear tap selection when dragging
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

    // Handle dropping on a board cell
    if (over) {
      const overId = over.id as string;
      if (overId.startsWith('cell-')) {
        const [, rowStr, colStr] = overId.split('-');
        const row = parseInt(rowStr, 10);
        const col = parseInt(colStr, 10);

        const cell = board.cells[row][col];
        if (!cell.isPlayable || cell.isLocked || cell.letter) return;

        // Check if there's already a placed tile here
        const existingTile = placedTiles.find((t) => t.row === row && t.col === col);
        if (existingTile) return;

        if (dragData.type === 'rack-tile') {
          // Place from rack to board
          const { letter, rackIndex } = dragData;
          setPlacedTiles((prev) => [...prev, { row, col, letter, rackIndex }]);
          setUsedRackIndices((prev) => new Set([...prev, rackIndex]));
          setError(null);
        } else if (dragData.type === 'board-tile') {
          // Move from one board cell to another
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

  if (isLoading || !board || !puzzle) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900">
        <div className="text-white text-lg">Loading puzzle...</div>
      </div>
    );
  }

  const availableLetterCount = rackLetters.length - lockedRackIndices.size - usedRackIndices.size;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col min-h-screen bg-neutral-900 text-white">
        <div className="flex flex-col flex-1 w-full max-w-md mx-auto">
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 bg-neutral-800">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-tight">Dabble</h1>
              {debugMode && (
                <button
                  onClick={handleNewPuzzle}
                  className="px-2 py-1 text-xs font-medium rounded bg-purple-600 hover:bg-purple-500 transition-colors"
                >
                  New Puzzle
                </button>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-400">{totalScore}</div>
              <div className="text-xs text-neutral-400">Score</div>
            </div>
          </header>

          {/* Main game area */}
          <main className="flex-1 flex flex-col items-center justify-center gap-4 p-2 overflow-hidden">
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
              <div className="text-red-400 text-sm font-medium px-4 py-2 bg-red-900/30 rounded">
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
              <button
                onClick={handleClear}
                disabled={placedTiles.length === 0}
                className="flex-1 py-2 px-4 rounded-lg font-semibold text-sm
                  bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleSubmit}
                disabled={placedTiles.length === 0}
                className="flex-1 py-2 px-4 rounded-lg font-semibold text-sm
                  bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors"
              >
                Submit Word
              </button>
            </div>

            {/* Status info */}
            <div className="flex gap-4 text-sm text-neutral-400">
              <span>{submittedWords.length} words</span>
              <span>{availableLetterCount} letters left</span>
            </div>
          </main>

          {/* Footer with word list and finish button */}
          <footer className="px-4 pb-4 pt-2">
            <WordList words={submittedWords} />
            {submittedWords.length > 0 && (
              <button
                onClick={handleFinish}
                className="w-full mt-3 py-3 px-4 rounded-lg font-bold text-base
                  bg-amber-500 text-neutral-900 hover:bg-amber-400
                  transition-colors"
              >
                Finish & Share
              </button>
            )}
          </footer>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <ShareModal
            date={puzzle.date}
            words={submittedWords}
            totalScore={totalScore}
            allLettersUsed={lockedRackIndices.size === rackLetters.length}
            allLettersBonus={ALL_LETTERS_BONUS}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>

      {/* Drag Overlay - shows tile being dragged */}
      <DragOverlay dropAnimation={null}>
        {activeDragLetter && <DragOverlayTile letter={activeDragLetter} />}
      </DragOverlay>
    </DndContext>
  );
}
