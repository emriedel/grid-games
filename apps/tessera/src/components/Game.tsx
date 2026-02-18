'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  DndContext,
  useSensors,
  useSensor,
  PointerSensor,
  TouchSensor,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  LandingScreen,
  NavBar,
  GameContainer,
  ResultsModal,
  Button,
} from '@grid-games/ui';
import { useGameState } from '@/hooks/useGameState';
import { Board } from './Board';
import { PieceTray } from './PieceTray';
import { HowToPlayModal } from './HowToPlayModal';
import {
  loadPuzzleByNumber,
  getTodayPuzzleNumber,
  generateFallbackPuzzle,
  loadPoolPuzzleById,
} from '@/lib/puzzleLoader';
import {
  getSavedState,
  saveInProgressState,
  saveCompletedState,
  hasCompletedPuzzle,
} from '@/lib/storage';
import { canPlacePiece } from '@/lib/gameLogic';
import { getAnchorCell } from '@/constants/pentominoes';
import type { Position, PentominoId, DragData, Rotation, PlacedPiece } from '@/types';

export function Game() {
  const searchParams = useSearchParams();
  const debugMode = searchParams.get('debug') === 'true';
  const puzzleParam = searchParams.get('puzzle');
  const poolIdParam = searchParams.get('poolId');

  // Loading and UI state
  const [isLoading, setIsLoading] = useState(true);
  const [landingMode, setLandingMode] = useState<'fresh' | 'in-progress' | 'completed'>('fresh');
  const [exitedLanding, setExitedLanding] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [puzzleNumber, setPuzzleNumber] = useState<number>(1);
  const [puzzleId, setPuzzleId] = useState<string | undefined>();

  // Drag and drop state
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [dragOverCell, setDragOverCell] = useState<Position | null>(null);
  // Store original placement when dragging from board (for cancel restoration)
  const [dragOriginalPlacement, setDragOriginalPlacement] = useState<PlacedPiece | null>(null);

  // Error feedback state - briefly shows error on bank piece
  const [errorPieceId, setErrorPieceId] = useState<PentominoId | null>(null);

  // Game state
  const {
    state,
    loadPuzzle,
    startGame,
    selectPiece,
    deselectPiece,
    rotatePiece,
    tryPlacePiece,
    removePieceFromBoard,
    clearAll,
    restoreState,
  } = useGameState();

  // Set up drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    })
  );

  // Determine if this is an archive puzzle
  const isArchiveMode = puzzleParam !== null;
  const targetPuzzleNumber = puzzleParam ? parseInt(puzzleParam, 10) : getTodayPuzzleNumber();

  // Initialize game
  useEffect(() => {
    async function init() {
      let puzzle;
      let num = targetPuzzleNumber;

      // Debug mode with poolId - load from pool
      if (debugMode && poolIdParam) {
        puzzle = await loadPoolPuzzleById(poolIdParam);
        if (puzzle) {
          num = 0; // Pool puzzles don't have a number
        }
      }

      // Normal loading
      if (!puzzle) {
        setPuzzleNumber(num);
        puzzle = await loadPuzzleByNumber(num);

        // Fallback to generated puzzle
        if (!puzzle) {
          puzzle = generateFallbackPuzzle(num);
        }
      }

      setPuzzleNumber(num);
      setPuzzleId(puzzle.id);
      loadPuzzle(puzzle);

      // Debug output
      if (debugMode) {
        console.log('[Tessera Debug] Puzzle #', num);
        console.log('[Tessera Debug] Shape:', puzzle.shapeName);
        console.log('[Tessera Debug] Pieces:', puzzle.pentominoIds.join(', '));
        if (poolIdParam) {
          console.log('[Tessera Debug] Pool ID:', poolIdParam);
        }
      }

      // Check saved state (skip in debug mode)
      if (!debugMode) {
        const savedState = getSavedState(num, puzzle.id);

        if (savedState?.status === 'completed') {
          if (isArchiveMode) {
            // For archive, go straight to board view
            setExitedLanding(true);
            restoreState({ placedPieces: savedState.data.placedPieces });
          } else {
            setLandingMode('completed');
          }
        } else if (savedState?.status === 'in-progress') {
          setLandingMode('in-progress');
        }
      }

      setIsLoading(false);
    }

    init();
  }, [debugMode, targetPuzzleNumber, isArchiveMode, poolIdParam, loadPuzzle, restoreState]);

  // Save state during gameplay
  useEffect(() => {
    if (state.phase === 'playing' && !debugMode && state.puzzle) {
      saveInProgressState(puzzleNumber, state, puzzleId);
    }
  }, [state, puzzleNumber, puzzleId, debugMode]);

  // Handle completion
  useEffect(() => {
    if (state.phase === 'finished' && state.won) {
      if (!debugMode && state.puzzle) {
        saveCompletedState(puzzleNumber, state, puzzleId);
      }
      setShowResults(true);
    }
  }, [state.phase, state.won, debugMode, puzzleNumber, puzzleId, state]);

  // Handlers
  const handlePlay = useCallback(() => {
    startGame();
  }, [startGame]);

  const handleResume = useCallback(() => {
    const savedState = getSavedState(puzzleNumber, puzzleId);
    if (savedState?.data.placedPieces) {
      restoreState({ placedPieces: savedState.data.placedPieces });
    }
    startGame();
  }, [puzzleNumber, puzzleId, restoreState, startGame]);

  const handleSeeResults = useCallback(() => {
    const savedState = getSavedState(puzzleNumber, puzzleId);
    if (savedState?.data.placedPieces) {
      restoreState({ placedPieces: savedState.data.placedPieces });
    }
    setExitedLanding(true);
  }, [puzzleNumber, puzzleId, restoreState]);

  const handleCellClick = useCallback((position: Position) => {
    if (state.selectedPieceId) {
      tryPlacePiece(position);
    }
  }, [state.selectedPieceId, tryPlacePiece]);

  // Handler for invalid placement attempts - show error feedback on bank piece
  const handleInvalidPlacement = useCallback(() => {
    if (state.selectedPieceId) {
      setErrorPieceId(state.selectedPieceId);
      // Clear error after brief animation
      setTimeout(() => setErrorPieceId(null), 400);
    }
  }, [state.selectedPieceId]);

  const handlePieceClick = useCallback((pentominoId: PentominoId) => {
    // If clicking on a placed piece on the board, remove it
    const isPlaced = state.placedPieces.some((p) => p.pentominoId === pentominoId);
    if (isPlaced) {
      removePieceFromBoard(pentominoId);
    }
  }, [state.placedPieces, removePieceFromBoard]);

  // Handler for tapping placed pieces in the bank (remove from board)
  const handlePieceRemove = useCallback((pentominoId: PentominoId) => {
    removePieceFromBoard(pentominoId);
  }, [removePieceFromBoard]);

  // Build rotation map from placed pieces (for syncing bank icon rotation)
  const pieceRotations = useMemo(() => {
    const map = new Map<PentominoId, Rotation>();
    for (const piece of state.placedPieces) {
      map.set(piece.pentominoId, piece.rotation);
    }
    return map;
  }, [state.placedPieces]);

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData;
    if (data?.type === 'piece') {
      setActiveDrag(data);
      // Deselect any currently selected piece when starting a drag
      deselectPiece();
    } else if (data?.type === 'board-piece') {
      // Dragging from board - store original placement and remove from board
      const placement = state.placedPieces.find((p) => p.pentominoId === data.pentominoId);
      if (placement) {
        setDragOriginalPlacement(placement);
        removePieceFromBoard(data.pentominoId);
        // Set active drag with the piece data
        setActiveDrag({ type: 'piece', pentominoId: data.pentominoId, rotation: data.rotation });
      }
    }
  }, [deselectPiece, state.placedPieces, removePieceFromBoard]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (over?.data.current) {
      const { row, col } = over.data.current as { row: number; col: number };
      setDragOverCell({ row, col });
    } else {
      setDragOverCell(null);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { over } = event;

    if (activeDrag && over?.data.current && state.board) {
      const { row, col } = over.data.current as { row: number; col: number };

      // Calculate anchor position based on the designated anchor cell
      const anchorOffset = getAnchorCell(activeDrag.pentominoId, activeDrag.rotation);
      const anchor: Position = {
        row: row - anchorOffset.row,
        col: col - anchorOffset.col,
      };

      // Check if placement is valid and place the piece
      if (canPlacePiece(state.board, activeDrag.pentominoId, anchor, activeDrag.rotation)) {
        // Select the piece with its rotation, then place it
        selectPiece(activeDrag.pentominoId);
        // We need to apply the rotation from the drag
        tryPlacePiece(anchor);
      }
      // If placement failed but dropped on board, piece stays in bank
    }
    // If dropped off board (no over target), piece stays in bank
    // (piece was already removed from board when drag started)

    // Reset drag state
    setActiveDrag(null);
    setDragOverCell(null);
    setDragOriginalPlacement(null);
  }, [activeDrag, state.board, selectPiece, tryPlacePiece]);

  const handleDragCancel = useCallback(() => {
    // If dragging from board and cancelled, restore original
    if (dragOriginalPlacement) {
      selectPiece(dragOriginalPlacement.pentominoId);
      tryPlacePiece(dragOriginalPlacement.position);
    }
    setActiveDrag(null);
    setDragOverCell(null);
    setDragOriginalPlacement(null);
  }, [dragOriginalPlacement, selectPiece, tryPlacePiece]);

  // Build share text
  const shareText = `Tessera #${puzzleNumber}
Completed!

https://nerdcube.games/tessera`;

  // Loading state
  if (isLoading || !state.puzzle || !state.board) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-900">
        <div className="text-white text-lg">Loading puzzle...</div>
      </div>
    );
  }

  // Determine if we should show landing
  const showLanding = !exitedLanding && state.phase === 'landing' && !isArchiveMode;

  // Landing screen
  if (showLanding) {
    return (
      <LandingScreen
        gameId="tessera"
        name="Tessera"
        description="Fill the target shape using pentomino pieces"
        puzzleInfo={{ number: puzzleNumber, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
        mode={landingMode}
        onPlay={handlePlay}
        onResume={handleResume}
        onSeeResults={handleSeeResults}
        archiveHref="/archive"
      />
    );
  }

  // Determine display state
  const isFinished = state.phase === 'finished' || (exitedLanding && hasCompletedPuzzle(puzzleNumber, puzzleId));

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <GameContainer
        navBar={
          <NavBar
            title={`Tessera #${puzzleNumber}`}
            gameId="tessera"
            onRulesClick={() => setShowHowToPlay(true)}
          />
        }
      >
        <div className="flex flex-col items-center gap-4 p-4">
          {/* Board */}
          <Board
            board={state.board}
            selectedPieceId={state.selectedPieceId}
            selectedRotation={state.selectedRotation}
            activeDrag={activeDrag}
            dragOverCell={dragOverCell}
            placedPieces={state.placedPieces}
            onCellClick={handleCellClick}
            onPieceClick={handlePieceClick}
            onInvalidPlacement={handleInvalidPlacement}
          />

          {/* Piece tray (only when playing) */}
          {!isFinished && (
            <PieceTray
              allPieces={state.puzzle.pentominoIds}
              placedPieceIds={new Set(state.placedPieces.map((p) => p.pentominoId))}
              selectedPieceId={state.selectedPieceId}
              selectedRotation={state.selectedRotation}
              pieceRotations={pieceRotations}
              errorPieceId={errorPieceId}
              onPieceSelect={selectPiece}
              onPieceRemove={handlePieceRemove}
            />
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {!isFinished && state.placedPieces.length > 0 && (
              <Button variant="secondary" onClick={clearAll}>
                Clear All
              </Button>
            )}
            {isFinished && (
              <Button variant="primary" onClick={() => setShowResults(true)}>
                See Results
              </Button>
            )}
          </div>
        </div>

        {/* How to Play Modal */}
        <HowToPlayModal
          isOpen={showHowToPlay}
          onClose={() => setShowHowToPlay(false)}
        />

        {/* Results Modal */}
        <ResultsModal
          isOpen={showResults}
          onClose={() => setShowResults(false)}
          gameId="tessera"
          gameName="Tessera"
          puzzleNumber={puzzleNumber}
          primaryStat={{ value: 'Complete', label: state.puzzle.shapeName }}
          shareConfig={{ text: shareText }}
          messageType="success"
        />
      </GameContainer>

    </DndContext>
  );
}
