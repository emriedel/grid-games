'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Board as BoardType, Piece as PieceType, Direction } from '@/types';
import { Cell } from './Cell';
import { Piece } from './Piece';
import { DirectionalArrow } from './DirectionalArrow';
import { BOARD_SIZE } from '@/constants/gameConfig';
import { getValidDirections } from '@/lib/gameLogic';

interface BoardProps {
  board: BoardType;
  pieces: PieceType[];
  selectedPieceId: string | null;
  onPieceSelect: (pieceId: string) => void;
  onDeselect: () => void;
  onMove: (direction: Direction) => void;
  disabled?: boolean;
}

export function Board({
  board,
  pieces,
  selectedPieceId,
  onPieceSelect,
  onDeselect,
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

  // Get valid directions for selected piece
  const validDirections = useMemo(() => {
    if (!selectedPieceId || disabled) return [];
    return getValidDirections(board, pieces, selectedPieceId);
  }, [board, pieces, selectedPieceId, disabled]);

  // Get selected piece position
  const selectedPiece = useMemo(() => {
    if (!selectedPieceId) return null;
    return pieces.find((p) => p.id === selectedPieceId) || null;
  }, [pieces, selectedPieceId]);

  // Handle click on empty board area to deselect
  const handleBoardClick = useCallback(() => {
    if (!disabled && selectedPieceId) {
      onDeselect();
    }
  }, [disabled, selectedPieceId, onDeselect]);

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-square bg-[var(--background)] rounded-lg overflow-hidden border-[3px] border-[var(--wall-color)]"
      style={{ touchAction: 'none' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleBoardClick}
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
          const isObstacle = board.obstacles?.some(
            (o) => o.row === row && o.col === col
          ) ?? false;

          return (
            <Cell
              key={`${row}-${col}`}
              row={row}
              col={col}
              walls={board.walls[row][col]}
              isGoal={isGoal}
              isObstacle={isObstacle}
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

      {/* Directional arrows for selected piece */}
      {cellSize > 0 && selectedPiece && !disabled &&
        validDirections.map((direction) => (
          <DirectionalArrow
            key={direction}
            direction={direction}
            onClick={() => onMove(direction)}
            cellSize={cellSize}
            piecePosition={selectedPiece.position}
          />
        ))}
    </div>
  );
}
