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
}

// Droppable cell wrapper (also draggable if it has a placed tile)
interface DroppableCellProps {
  cell: Cell;
  placedTile: PlacedTile | undefined;
  isSelected: boolean;
  isDragging: boolean;
  onCellClick: () => void;
}

function DroppableCell({ cell, placedTile, isSelected, isDragging, onCellClick }: DroppableCellProps) {
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

  return (
    <div
      ref={setRefs}
      {...(canDrag ? { ...listeners, ...attributes } : {})}
      className={canDrag ? 'touch-none' : ''}
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
}: GameBoardProps) {
  // Create a map of placed tiles for quick lookup
  const placedMap = new Map(
    placedTiles.map((t) => [`${t.row},${t.col}`, t])
  );

  return (
    <div
      className="grid gap-1 p-2 bg-neutral-800 rounded-lg w-full"
      style={{
        gridTemplateColumns: `repeat(${board.size}, 1fr)`,
        maxWidth: '400px',
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
            onCellClick={() => onCellClick(cell.row, cell.col)}
          />
        );
      })}
    </div>
  );
}
