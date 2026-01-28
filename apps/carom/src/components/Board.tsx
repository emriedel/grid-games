'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Board as BoardType, Piece as PieceType, Direction } from '@/types';
import { Cell } from './Cell';
import { Piece } from './Piece';
import { BOARD_SIZE } from '@/constants/gameConfig';

interface BoardProps {
  board: BoardType;
  pieces: PieceType[];
  selectedPieceId: string | null;
  onPieceSelect: (pieceId: string) => void;
  onMove: (direction: Direction) => void;
  disabled?: boolean;
}

export function Board({
  board,
  pieces,
  selectedPieceId,
  onPieceSelect,
  onMove,
  disabled = false,
}: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(0);

  // Calculate cell size based on container
  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        setCellSize(containerWidth / BOARD_SIZE);
      }
    }

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Handle swipe gestures
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || !selectedPieceId) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, [disabled, selectedPieceId]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (disabled || !selectedPieceId || !touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const minSwipeDistance = 30;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < minSwipeDistance && absDy < minSwipeDistance) {
      return; // Not a swipe
    }

    if (absDx > absDy) {
      // Horizontal swipe
      onMove(dx > 0 ? 'right' : 'left');
    } else {
      // Vertical swipe
      onMove(dy > 0 ? 'down' : 'up');
    }
  }, [disabled, selectedPieceId, onMove]);

  // Handle keyboard input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (disabled || !selectedPieceId) return;

      const keyMap: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      };

      const direction = keyMap[e.key];
      if (direction) {
        e.preventDefault();
        onMove(direction);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, selectedPieceId, onMove]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-sm mx-auto aspect-square bg-[var(--background)] rounded-lg overflow-hidden border-2 border-[var(--border)]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Grid cells */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
          gridTemplateRows: `repeat(${BOARD_SIZE}, 1fr)`,
        }}
      >
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, index) => {
          const row = Math.floor(index / BOARD_SIZE);
          const col = index % BOARD_SIZE;
          const isGoal = board.goal.row === row && board.goal.col === col;

          return (
            <Cell
              key={`${row}-${col}`}
              row={row}
              col={col}
              walls={board.walls[row][col]}
              isGoal={isGoal}
            />
          );
        })}
      </div>

      {/* Pieces (absolute positioned) */}
      {cellSize > 0 &&
        pieces.map((piece) => (
          <Piece
            key={piece.id}
            piece={piece}
            isSelected={piece.id === selectedPieceId}
            onClick={() => !disabled && onPieceSelect(piece.id)}
            cellSize={cellSize}
          />
        ))}
    </div>
  );
}
