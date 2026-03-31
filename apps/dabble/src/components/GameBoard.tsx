'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Tile } from './Tile';
import type { GameBoard as GameBoardType, PlacedTile, Cell, DragData } from '@/types';

interface GameBoardProps {
  board: GameBoardType;
  placedTiles: PlacedTile[];
  selectedCell: { row: number; col: number } | null;
  activeDragId: string | null; // Track which tile is being dragged
  onCellClick: (row: number, col: number) => void;
  disabled?: boolean;
  showCelebration?: boolean;
  celebrationPhase?: 'pulse' | 'tiles' | 'hold' | null;
  lockedTileCount?: number; // Number of locked tiles for dynamic animation timing
}

// Droppable cell wrapper (also draggable if it has a placed tile)
interface DroppableCellProps {
  cell: Cell;
  placedTile: PlacedTile | undefined;
  isSelected: boolean;
  isDragging: boolean;
  onCellClick: () => void;
  showCelebration?: boolean;
  celebrationPhase?: 'pulse' | 'tiles' | 'hold' | null;
  lockedTileIndex: number | null; // Index among locked tiles only (for staggered animation)
  staggerMs: number; // Dynamic stagger timing based on tile count
}

function DroppableCell({ cell, placedTile, isSelected, isDragging, onCellClick, showCelebration, celebrationPhase, lockedTileIndex, staggerMs }: DroppableCellProps) {
  const hasPlacedTile = !!placedTile;
  const hasLockedLetter = cell.isLocked && cell.letter;
  const hasLetter = hasPlacedTile || cell.letter;
  const canDrop = cell.isPlayable && !cell.isLocked && !hasLetter;
  const canDrag = hasPlacedTile && !cell.isLocked;

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `cell-${cell.row}-${cell.col}`,
    data: {
      row: cell.row,
      col: cell.col,
    },
    disabled: !canDrop,
  });

  const { setNodeRef: setDragRef, attributes, listeners } = useDraggable({
    id: `board-tile-${cell.row}-${cell.col}`,
    data: {
      type: 'board-tile',
      letter: placedTile?.letter,
      row: cell.row,
      col: cell.col,
      rackIndex: placedTile?.rackIndex,
    } as DragData,
    disabled: !canDrag,
  });

  // Combine refs
  const setRefs = (node: HTMLDivElement | null) => {
    setDropRef(node);
    if (canDrag) {
      setDragRef(node);
    }
  };

  // Animation style for celebration (locked tiles settle into place one by one)
  // Only animate tiles when celebration phase is 'tiles'
  const animationStyle = showCelebration && hasLockedLetter && celebrationPhase === 'tiles' && lockedTileIndex !== null
    ? {
        animation: 'tileSettle 0.3s ease-out',
        animationDelay: `${lockedTileIndex * staggerMs}ms`,
      }
    : undefined;

  return (
    <div
      ref={setRefs}
      data-row={cell.row}
      data-col={cell.col}
      {...(canDrag ? { ...listeners, ...attributes } : {})}
      className={canDrag ? 'touch-none' : ''}
      style={animationStyle}
    >
      <Tile
        letter={isDragging ? undefined : (placedTile?.letter || cell.letter)}
        bonus={cell.bonus}
        isPlayable={cell.isPlayable}
        isSelected={isSelected}
        isPlaced={hasPlacedTile && !isDragging}
        isLocked={cell.isLocked}
        isDropTarget={isOver && canDrop}
        onClick={onCellClick}
      />
    </div>
  );
}

export function GameBoard({
  board,
  placedTiles,
  selectedCell,
  activeDragId,
  onCellClick,
  disabled = false,
  showCelebration = false,
  celebrationPhase = null,
  lockedTileCount = 0,
}: GameBoardProps) {
  // Create a map of placed tiles for quick lookup
  const placedMap = new Map(
    placedTiles.map((t) => [`${t.row},${t.col}`, t])
  );

  // Create a map of locked tile indices for staggered animation
  // Only locked tiles get an index (0, 1, 2, ...) based on grid order
  const lockedTileIndexMap = new Map<string, number>();
  let lockedIndex = 0;
  for (const cell of board.cells.flat()) {
    if (cell.isLocked && cell.letter) {
      lockedTileIndexMap.set(`${cell.row},${cell.col}`, lockedIndex++);
    }
  }

  // Calculate dynamic stagger - fewer tiles = longer stagger to maintain ~500ms total
  // Formula: 180 / tileCount, clamped to min 18ms (for many tiles)
  const staggerMs = lockedTileCount > 0 ? Math.max(18, Math.round(180 / lockedTileCount)) : 18;

  // Board glow animation - single slow pulse at start of celebration
  const boardGlowStyle = celebrationPhase === 'pulse'
    ? { animation: 'boardGlowPulse 1.8s ease-in-out forwards' }
    : undefined;

  return (
    <div
      className="grid gap-1 p-2 bg-neutral-800 rounded-lg w-full"
      style={{
        gridTemplateColumns: `repeat(${board.size}, 1fr)`,
        maxWidth: '400px',
        ...boardGlowStyle,
      }}
    >
      {board.cells.flat().map((cell) => {
        const key = `${cell.row},${cell.col}`;
        const placedTile = placedMap.get(key);
        const isSelected =
          selectedCell?.row === cell.row && selectedCell?.col === cell.col;
        const isDragging = activeDragId === `board-tile-${cell.row}-${cell.col}`;

        return (
          <DroppableCell
            key={key}
            cell={cell}
            placedTile={placedTile}
            isSelected={isSelected}
            isDragging={isDragging}
            onCellClick={() => !disabled && onCellClick(cell.row, cell.col)}
            showCelebration={showCelebration}
            celebrationPhase={celebrationPhase}
            lockedTileIndex={lockedTileIndexMap.get(key) ?? null}
            staggerMs={staggerMs}
          />
        );
      })}
    </div>
  );
}
