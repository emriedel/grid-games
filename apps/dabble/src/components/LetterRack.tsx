'use client';

import { useDroppable } from '@dnd-kit/core';
import { DraggableRackTile } from './Tile';

interface LetterRackProps {
  letters: string[];
  usedIndices: Set<number>;     // Currently placed on board (not yet submitted)
  lockedIndices: Set<number>;   // Permanently used (submitted)
  selectedIndex: number | null;
  onLetterClick: (index: number) => void;
  isDraggingBoardTile?: boolean; // Only enable drop zone when dragging from board
  disabled?: boolean;            // Gray out and disable when game is finished
}

export function LetterRack({
  letters,
  usedIndices,
  lockedIndices,
  selectedIndex,
  onLetterClick,
  isDraggingBoardTile = false,
  disabled = false,
}: LetterRackProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'rack-drop-zone',
    disabled: !isDraggingBoardTile, // Only accept drops when dragging from board
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-wrap gap-1.5 justify-center p-3 bg-neutral-800 rounded-lg max-w-full transition-opacity ${
        isOver && isDraggingBoardTile ? 'ring-2 ring-neutral-500' : ''
      } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      {letters.map((letter, index) => (
        <DraggableRackTile
          key={index}
          letter={letter}
          index={index}
          isSelected={selectedIndex === index}
          isUsed={usedIndices.has(index)}
          isLocked={lockedIndices.has(index)}
          onClick={() => onLetterClick(index)}
        />
      ))}
    </div>
  );
}
