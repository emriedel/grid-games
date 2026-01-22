'use client';

import { DraggableRackTile } from './Tile';

interface LetterRackProps {
  letters: string[];
  usedIndices: Set<number>;     // Currently placed on board (not yet submitted)
  lockedIndices: Set<number>;   // Permanently used (submitted)
  selectedIndex: number | null;
  onLetterClick: (index: number) => void;
}

export function LetterRack({
  letters,
  usedIndices,
  lockedIndices,
  selectedIndex,
  onLetterClick,
}: LetterRackProps) {
  return (
    <div className="flex flex-wrap gap-1.5 justify-center p-3 bg-neutral-800 rounded-lg max-w-full">
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
