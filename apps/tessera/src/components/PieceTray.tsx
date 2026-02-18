'use client';

import type { PentominoId, Rotation } from '@/types';
import { PiecePreview } from './PiecePreview';

interface PieceTrayProps {
  allPieces: PentominoId[];
  placedPieceIds: Set<PentominoId>;
  selectedPieceId: PentominoId | null;
  selectedRotation: Rotation;
  onPieceSelect: (pentominoId: PentominoId) => void;
}

export function PieceTray({
  allPieces,
  placedPieceIds,
  selectedPieceId,
  selectedRotation,
  onPieceSelect,
}: PieceTrayProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex flex-wrap justify-center gap-2 p-2">
        {allPieces.map((pentominoId) => {
          const isPlaced = placedPieceIds.has(pentominoId);
          return (
            <PiecePreview
              key={pentominoId}
              pentominoId={pentominoId}
              rotation={selectedPieceId === pentominoId ? selectedRotation : 0}
              isSelected={selectedPieceId === pentominoId}
              isPlaced={isPlaced}
              draggable={!isPlaced}
              size="large"
              onClick={isPlaced ? undefined : () => onPieceSelect(pentominoId)}
            />
          );
        })}
      </div>
      {selectedPieceId && (
        <p className="text-center text-sm text-[var(--muted)] mt-2">
          Tap piece again to rotate, tap board to place
        </p>
      )}
    </div>
  );
}
