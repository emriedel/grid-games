'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  TouchSensor,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type DragMoveEvent,
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
import { DragOverlayPiece } from './DragOverlayPiece';
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
  clearPuzzleState,
} from '@/lib/storage';
import { findAnchorForClickedCell, findNearestValidPlacement } from '@/lib/gameLogic';
import { inlayConfig } from '@/config';
import type { Position, PentominoId, DragData, Rotation, PlacedPiece, Puzzle } from '@/types';
import { getPentominoCells } from '@/constants/pentominoes';

/**
 * Print a visual ASCII representation of the puzzle solution for debugging.
 * Shows the full board with piece letters and mini previews of each piece at its rotation.
 */
function printDebugSolution(puzzle: Puzzle): void {
  if (!puzzle.solution || puzzle.solution.length === 0) return;

  const shape = puzzle.shape;
  const rows = shape.length;
  const cols = shape[0].length;

  // Create a grid filled with the solution
  const grid: string[][] = shape.map((row) =>
    row.map((cell) => (cell ? '.' : ' '))
  );

  // Place each piece on the grid
  for (const placed of puzzle.solution) {
    const cells = getPentominoCells(placed.pentominoId, placed.rotation);
    for (const cell of cells) {
      const r = placed.position.row + cell.row;
      const c = placed.position.col + cell.col;
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        grid[r][c] = placed.pentominoId;
      }
    }
  }

  // Build column header (indices)
  const colHeader = '    ' + Array.from({ length: cols }, (_, i) => i.toString().padStart(2, ' ')).join('');

  // Print the solution board
  console.log('[Inlay Debug] Solution Board:');
  console.log(colHeader);
  console.log('   +' + '--'.repeat(cols) + '+');
  for (let r = 0; r < rows; r++) {
    const rowStr = grid[r].map((c) => (c === ' ' ? '  ' : ` ${c}`)).join('');
    console.log(`${r.toString().padStart(2, ' ')} |${rowStr} |`);
  }
  console.log('   +' + '--'.repeat(cols) + '+');

  // Print each piece with its placement info and mini preview
  console.log('\n[Inlay Debug] Piece Placements:');
  for (const placed of puzzle.solution) {
    const cells = getPentominoCells(placed.pentominoId, placed.rotation);

    // Find bounds of this piece
    const maxR = Math.max(...cells.map((c) => c.row));
    const maxC = Math.max(...cells.map((c) => c.col));

    // Build mini grid for this piece
    const mini: string[][] = Array.from({ length: maxR + 1 }, () =>
      Array.from({ length: maxC + 1 }, () => '.')
    );
    for (const cell of cells) {
      mini[cell.row][cell.col] = '#';
    }

    // Print piece info and mini preview
    console.log(`  ${placed.pentominoId}: anchor=(${placed.position.row},${placed.position.col}) rot=${placed.rotation}`);
    for (const row of mini) {
      console.log('     ' + row.join(' '));
    }
  }
}

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

  // Track rotations of pieces returned to the bank
  const [bankRotations, setBankRotations] = useState<Map<PentominoId, Rotation>>(new Map());

  // Board cell size for DragOverlay
  const [boardCellSize, setBoardCellSize] = useState(40);

  // Board ref for calculating drag overlay position
  const boardRef = useRef<HTMLDivElement>(null);

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
        console.log('[Inlay Debug] Puzzle #', num);
        console.log('[Inlay Debug] Shape:', puzzle.shapeName);
        console.log('[Inlay Debug] Pieces:', puzzle.pentominoIds.join(', '));
        if (poolIdParam) {
          console.log('[Inlay Debug] Pool ID:', poolIdParam);
        }
        if (puzzle.solution) {
          printDebugSolution(puzzle);
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
          // Only show in-progress if there are actually pieces placed
          if (savedState.data.placedPieces.length > 0) {
            if (isArchiveMode) {
              // For archive, restore state and start playing
              restoreState({ placedPieces: savedState.data.placedPieces });
              startGame();
            } else {
              setLandingMode('in-progress');
            }
          } else if (isArchiveMode) {
            // Fresh archive puzzle with empty in-progress state
            startGame();
          }
        } else if (isArchiveMode) {
          // Fresh archive puzzle - start immediately
          startGame();
        }
      }

      setIsLoading(false);
    }

    init();
  }, [debugMode, targetPuzzleNumber, isArchiveMode, poolIdParam, loadPuzzle, restoreState, startGame]);

  // Save state during gameplay - only if pieces have been placed
  useEffect(() => {
    if (state.phase === 'playing' && !debugMode && state.puzzle) {
      if (state.placedPieces.length > 0) {
        // Use state.puzzle.id to ensure we always have the correct puzzle ID
        saveInProgressState(puzzleNumber, state, state.puzzle.id);
      } else {
        // Clear in-progress state when no pieces are placed (e.g., after Clear All)
        clearPuzzleState(puzzleNumber, state.puzzle.id);
      }
    }
  }, [state, puzzleNumber, debugMode]);

  // Handle completion
  useEffect(() => {
    if (state.phase === 'finished' && state.won) {
      if (!debugMode && state.puzzle) {
        // Use state.puzzle.id to ensure we always have the correct puzzle ID
        saveCompletedState(puzzleNumber, state, state.puzzle.id);
      }
      // Only auto-show results if we just completed the puzzle (not viewing a completed puzzle)
      if (!exitedLanding) {
        setShowResults(true);
      }
    }
  }, [state.phase, state.won, debugMode, puzzleNumber, state, exitedLanding]);

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
    const placement = state.placedPieces.find((p) => p.pentominoId === pentominoId);
    if (placement) {
      // Store rotation before removing so piece returns to bank with same orientation
      setBankRotations((prev) => new Map(prev).set(pentominoId, placement.rotation));
      removePieceFromBoard(pentominoId);
      // Note: Don't call deselectPiece() here - REMOVE_PIECE already selects the
      // removed piece with its rotation preserved, allowing immediate re-rotation
    }
  }, [state.placedPieces, removePieceFromBoard]);

  // Handler for tapping placed pieces in the bank (remove from board)
  const handlePieceRemove = useCallback((pentominoId: PentominoId) => {
    const placement = state.placedPieces.find((p) => p.pentominoId === pentominoId);
    if (placement) {
      // Store rotation before removing so piece returns to bank with same orientation
      setBankRotations((prev) => new Map(prev).set(pentominoId, placement.rotation));
    }
    removePieceFromBoard(pentominoId);
  }, [state.placedPieces, removePieceFromBoard]);

  // Build rotation map from bank rotations and placed pieces
  // Bank rotations are used for pieces returned to tray, placed pieces override them
  const pieceRotations = useMemo(() => {
    const map = new Map<PentominoId, Rotation>(bankRotations);
    for (const piece of state.placedPieces) {
      map.set(piece.pentominoId, piece.rotation);
    }
    return map;
  }, [state.placedPieces, bankRotations]);

  // Calculate if current drag position is valid
  // Uses sticky tolerance to match the actual drop behavior
  const isDragValid = useMemo(() => {
    if (!activeDrag || !dragOverCell || !state.board) return false;

    // If we have a grabOffset, use sticky tolerance to find valid placement
    if (activeDrag.grabOffset) {
      const exactAnchor = {
        row: dragOverCell.row - activeDrag.grabOffset.row,
        col: dragOverCell.col - activeDrag.grabOffset.col,
      };
      return findNearestValidPlacement(state.board, activeDrag.pentominoId, exactAnchor, activeDrag.rotation, 1) !== null;
    }

    // Fallback: check if any valid placement exists
    const anchor = findAnchorForClickedCell(state.board, activeDrag.pentominoId, dragOverCell, activeDrag.rotation);
    return anchor !== null;
  }, [activeDrag, dragOverCell, state.board]);

  // Calculate pixel offset for DragOverlay to align with board preview
  const dragOverlayOffset = useMemo(() => {
    if (!activeDrag?.grabOffset) return { x: 0, y: 0 };
    const gap = 2; // Must match DragOverlayPiece gap
    return {
      x: -(activeDrag.grabOffset.col * (boardCellSize + gap)),
      y: -(activeDrag.grabOffset.row * (boardCellSize + gap)),
    };
  }, [activeDrag?.grabOffset, boardCellSize]);

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData;
    if (data?.type === 'piece') {
      setActiveDrag(data);
      // DON'T deselect - keep the piece selected to preserve rotation state in tray
    } else if (data?.type === 'board-piece') {
      // Dragging from board - store original placement and remove from board
      const placement = state.placedPieces.find((p) => p.pentominoId === data.pentominoId);
      if (placement) {
        setDragOriginalPlacement(placement);
        removePieceFromBoard(data.pentominoId);
        // Set active drag with the piece data, preserving grab offset
        setActiveDrag({ type: 'piece', pentominoId: data.pentominoId, rotation: data.rotation, grabOffset: data.grabOffset });
      }
    }
  }, [state.placedPieces, removePieceFromBoard]);

  // Calculate dragOverCell from pointer position
  // The grabbed cell of the overlay is always at the pointer (because dragOverlayOffset shifts it there)
  // So we use the pointer position to calculate which board cell the grabbed cell is over
  const handleDragMove = useCallback((event: DragMoveEvent) => {
    if (!boardRef.current) return;

    // Get initial pointer position from the activator event
    const activatorEvent = event.activatorEvent as PointerEvent | MouseEvent | TouchEvent;
    let initialX: number;
    let initialY: number;

    if ('touches' in activatorEvent && activatorEvent.touches.length > 0) {
      initialX = activatorEvent.touches[0].clientX;
      initialY = activatorEvent.touches[0].clientY;
    } else if ('clientX' in activatorEvent) {
      initialX = activatorEvent.clientX;
      initialY = activatorEvent.clientY;
    } else {
      return;
    }

    // Current pointer position = initial + delta
    const pointerX = initialX + event.delta.x;
    const pointerY = initialY + event.delta.y;

    // The grabbed cell of the overlay is at the pointer position
    // (because dragOverlayOffset shifts the overlay so grabbed cell aligns with cursor)

    // Convert pointer to board cell coordinates
    const boardRect = boardRef.current.getBoundingClientRect();
    const gap = 2;
    const cellStride = boardCellSize + gap;
    const computedStyle = window.getComputedStyle(boardRef.current);
    const boardPadding = parseFloat(computedStyle.paddingLeft) || 4;

    const col = Math.floor((pointerX - boardRect.left - boardPadding) / cellStride);
    const row = Math.floor((pointerY - boardRect.top - boardPadding) / cellStride);

    setDragOverCell({ row, col });
  }, [boardCellSize]);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // dragOverCell is now calculated in handleDragMove
    // This handler is kept for potential future use
  }, []);

  const handleDragEnd = useCallback((_event: DragEndEvent) => {
    // Use dragOverCell which is calculated from overlay position (not collision detection)
    // This ensures the drop position matches where the preview was shown

    if (activeDrag && dragOverCell && state.board) {
      let anchor: Position | null = null;

      // If we have a grabOffset, calculate exact anchor and use sticky tolerance
      if (activeDrag.grabOffset) {
        const exactAnchor = {
          row: dragOverCell.row - activeDrag.grabOffset.row,
          col: dragOverCell.col - activeDrag.grabOffset.col,
        };
        // Use tolerance to find nearest valid placement (snaps to valid positions)
        anchor = findNearestValidPlacement(state.board, activeDrag.pentominoId, exactAnchor, activeDrag.rotation, 1);
      } else {
        // Fallback: find any valid anchor
        anchor = findAnchorForClickedCell(state.board, activeDrag.pentominoId, dragOverCell, activeDrag.rotation);
      }

      // Check if placement is valid and place the piece
      if (anchor) {
        // Only select if not already selected (REMOVE_PIECE already selects when dragging from board)
        // Calling selectPiece on an already-selected piece would rotate it
        if (state.selectedPieceId !== activeDrag.pentominoId) {
          selectPiece(activeDrag.pentominoId);
        }
        // Pass rotation explicitly from activeDrag
        tryPlacePiece(anchor, activeDrag.rotation);
        // Deselect after successful placement
        deselectPiece();
      }
      // If placement failed, piece stays in bank with rotation preserved (still selected)
    }
    // If dropped off board (no over target), piece stays in bank with rotation preserved

    // Reset drag state
    setActiveDrag(null);
    setDragOverCell(null);
    setDragOriginalPlacement(null);
  }, [activeDrag, dragOverCell, state.board, state.selectedPieceId, selectPiece, tryPlacePiece, deselectPiece]);

  const handleDragCancel = useCallback(() => {
    // If dragging from board and cancelled, restore original placement with rotation
    if (dragOriginalPlacement) {
      selectPiece(dragOriginalPlacement.pentominoId);
      // Pass rotation explicitly when restoring original placement
      tryPlacePiece(dragOriginalPlacement.position, dragOriginalPlacement.rotation);
    }
    setActiveDrag(null);
    setDragOverCell(null);
    setDragOriginalPlacement(null);
  }, [dragOriginalPlacement, selectPiece, tryPlacePiece]);

  // Build share text
  const shareText = `Inlay #${puzzleNumber} ✅

https://nerdcube.games/inlay`;

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
      <>
        <LandingScreen
          gameId="inlay"
          name="Inlay"
          icon={inlayConfig.icon}
          description="Fill the target shape using pentomino pieces"
          puzzleInfo={{ number: puzzleNumber, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }}
          mode={landingMode}
          onPlay={handlePlay}
          onResume={handleResume}
          onSeeResults={handleSeeResults}
          onRules={() => setShowHowToPlay(true)}
          archiveHref="/archive"
        />
        <HowToPlayModal
          isOpen={showHowToPlay}
          onClose={() => setShowHowToPlay(false)}
        />
      </>
    );
  }

  // Determine display state
  const isFinished = state.phase === 'finished' || (exitedLanding && hasCompletedPuzzle(puzzleNumber, puzzleId));

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <GameContainer
        navBar={
          <NavBar
            title={`Inlay #${puzzleNumber}`}
            gameId="inlay"
            onRulesClick={() => setShowHowToPlay(true)}
          />
        }
        maxWidth="full"
      >
        <div className="flex flex-col items-center gap-4 py-4 px-2 sm:px-4 w-full max-w-md mx-auto">
          {/* Board */}
          <Board
            ref={boardRef}
            board={state.board}
            selectedPieceId={state.selectedPieceId}
            selectedRotation={state.selectedRotation}
            activeDrag={activeDrag}
            dragOverCell={dragOverCell}
            placedPieces={state.placedPieces}
            onCellClick={handleCellClick}
            onPieceClick={handlePieceClick}
            onInvalidPlacement={handleInvalidPlacement}
            onCellSizeChange={setBoardCellSize}
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
          gameId="inlay"
          gameName="Inlay"
          puzzleNumber={puzzleNumber}
          primaryStat={{ value: '✅', label: '' }}
          shareConfig={{ text: shareText }}
          messageType="success"
        />
      </GameContainer>

      {/* Drag Overlay - shows piece at cursor during drag */}
      <DragOverlay dropAnimation={null}>
        {activeDrag && (
          <div style={{ transform: `translate(${dragOverlayOffset.x}px, ${dragOverlayOffset.y}px)` }}>
            <DragOverlayPiece
              pentominoId={activeDrag.pentominoId}
              rotation={activeDrag.rotation}
              cellSize={boardCellSize}
              isValid={isDragValid}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
