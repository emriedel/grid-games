'use client';

import React, { useCallback, useRef } from 'react';
import { Board, Position } from '@/types';
import { BOARD_SIZE } from '@/constants/gameConfig';
import { useTouchDrag } from '@/hooks/useTouchDrag';
import Tile from './Tile';

interface BoggleGridProps {
  board: Board;
  onPathChange: (path: Position[]) => void;
  onPathComplete: (path: Position[]) => void;
  disabled?: boolean;
}

export default function BoggleGrid({
  board,
  onPathChange,
  onPathComplete,
  disabled = false,
}: BoggleGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  // Get tile position from DOM element
  const getTilePosition = useCallback((element: Element): Position | null => {
    const tile = element.closest('[data-row]');
    if (!tile) return null;

    const row = parseInt(tile.getAttribute('data-row') || '', 10);
    const col = parseInt(tile.getAttribute('data-col') || '', 10);

    if (isNaN(row) || isNaN(col)) return null;
    return { row, col };
  }, []);

  const {
    path,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTileClick,
  } = useTouchDrag({
    onPathChange,
    onPathComplete,
    getTilePosition,
    disabled,
  });

  // Check if a position is in the current path
  const getSelectionIndex = useCallback((pos: Position): number | null => {
    const index = path.findIndex((p) => p.row === pos.row && p.col === pos.col);
    return index !== -1 ? index : null;
  }, [path]);

  const isSelected = useCallback((pos: Position): boolean => {
    return path.some((p) => p.row === pos.row && p.col === pos.col);
  }, [path]);

  const isLastSelected = useCallback((pos: Position): boolean => {
    if (path.length === 0) return false;
    const last = path[path.length - 1];
    return last.row === pos.row && last.col === pos.col;
  }, [path]);

  // Calculate line positions for path visualization
  const getPathLines = useCallback(() => {
    if (path.length < 2) return null;

    const lines: React.ReactElement[] = [];
    const tileSize = 100 / BOARD_SIZE; // percentage
    const centerOffset = tileSize / 2;

    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];

      const x1 = from.col * tileSize + centerOffset;
      const y1 = from.row * tileSize + centerOffset;
      const x2 = to.col * tileSize + centerOffset;
      const y2 = to.row * tileSize + centerOffset;

      lines.push(
        <line
          key={`${i}`}
          x1={`${x1}%`}
          y1={`${y1}%`}
          x2={`${x2}%`}
          y2={`${y2}%`}
          className="path-line"
        />
      );
    }

    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        style={{ overflow: 'visible' }}
      >
        {lines}
      </svg>
    );
  }, [path]);

  if (board.length === 0) {
    return <div className="w-full aspect-square bg-[var(--tile-bg)] rounded-lg animate-pulse" />;
  }

  return (
    <div
      ref={gridRef}
      className="relative w-full max-w-[320px] mx-auto touch-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {getPathLines()}
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
        }}
      >
        {board.map((row, rowIndex) =>
          row.map((letter, colIndex) => {
            const pos = { row: rowIndex, col: colIndex };
            return (
              <Tile
                key={`${rowIndex}-${colIndex}`}
                letter={letter}
                position={pos}
                isSelected={isSelected(pos)}
                isLastSelected={isLastSelected(pos)}
                selectionIndex={getSelectionIndex(pos)}
                onPointerDown={handlePointerDown}
                onClick={handleTileClick}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
