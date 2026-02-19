'use client';

import type { PentominoId, Rotation } from '@/types';
import { PiecePreview } from './PiecePreview';

interface PieceTrayProps {
  allPieces: PentominoId[];
  placedPieceIds: Set<PentominoId>;
  selectedPieceId: PentominoId | null;
  selectedRotation: Rotation;
  pieceRotations: Map<PentominoId, Rotation>;
  errorPieceId: PentominoId | null;
  onPieceSelect: (pentominoId: PentominoId) => void;
  onPieceRemove: (pentominoId: PentominoId) => void;
}

export function PieceTray({
  allPieces,
  placedPieceIds,
  selectedPieceId,
  selectedRotation,
  pieceRotations,
  errorPieceId,
  onPieceSelect,
  onPieceRemove,
}: PieceTrayProps) {
  return (
    <div className="w-full">
      <div className="flex flex-wrap justify-center gap-2 p-2">
        {allPieces.map((pentominoId) => {
          const isPlaced = placedPieceIds.has(pentominoId);
          // Use stored rotation for placed pieces, or selectedRotation for selected piece
          const rotation = selectedPieceId === pentominoId
            ? selectedRotation
            : pieceRotations.get(pentominoId) ?? 0;
          return (
            <PiecePreview
              key={pentominoId}
              pentominoId={pentominoId}
              rotation={rotation}
              isSelected={selectedPieceId === pentominoId}
              isPlaced={isPlaced}
              isError={errorPieceId === pentominoId}
              draggable={!isPlaced}
              size="large"
              onClick={isPlaced ? () => onPieceRemove(pentominoId) : () => onPieceSelect(pentominoId)}
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
