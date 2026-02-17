'use client';

import type { PentominoId, Rotation } from '@/types';
import { PiecePreview } from './PiecePreview';

interface PieceTrayProps {
  availablePieces: PentominoId[];
  selectedPieceId: PentominoId | null;
  selectedRotation: Rotation;
  onPieceSelect: (pentominoId: PentominoId) => void;
}

export function PieceTray({
  availablePieces,
  selectedPieceId,
  selectedRotation,
  onPieceSelect,
}: PieceTrayProps) {
  if (availablePieces.length === 0) {
    return (
      <div className="text-center text-[var(--muted)] py-4">
        All pieces placed!
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex flex-wrap justify-center gap-2 p-2">
        {availablePieces.map((pentominoId) => (
          <PiecePreview
            key={pentominoId}
            pentominoId={pentominoId}
            rotation={selectedPieceId === pentominoId ? selectedRotation : 0}
            isSelected={selectedPieceId === pentominoId}
            size="medium"
            onClick={() => onPieceSelect(pentominoId)}
          />
        ))}
      </div>
      {selectedPieceId && (
        <p className="text-center text-sm text-[var(--muted)] mt-2">
          Tap piece again to rotate, tap board to place
        </p>
      )}
    </div>
  );
}
