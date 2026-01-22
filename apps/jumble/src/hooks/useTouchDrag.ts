'use client';

import { useCallback, useRef, useState } from 'react';
import { Position } from '@/types';
import { areAdjacent, isInPath } from '@/lib/wordValidator';

interface UseTouchDragProps {
  onPathChange: (path: Position[]) => void;
  onPathComplete: (path: Position[]) => void;
  getTilePosition: (element: Element) => Position | null;
  disabled?: boolean;
}

interface UseTouchDragReturn {
  path: Position[];
  isDragging: boolean;
  handlePointerDown: (pos: Position, e: React.PointerEvent) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: () => void;
  handleTileClick: (pos: Position) => void;
  clearPath: () => void;
}

export function useTouchDrag({
  onPathChange,
  onPathComplete,
  getTilePosition,
  disabled = false,
}: UseTouchDragProps): UseTouchDragReturn {
  const [path, setPath] = useState<Position[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const lastTapRef = useRef<{ pos: Position; time: number } | null>(null);
  const pathRef = useRef<Position[]>([]);

  // Keep pathRef in sync
  const updatePath = useCallback((newPath: Position[]) => {
    pathRef.current = newPath;
    setPath(newPath);
    onPathChange(newPath);
  }, [onPathChange]);

  const clearPath = useCallback(() => {
    updatePath([]);
    setIsDragging(false);
    lastTapRef.current = null;
  }, [updatePath]);

  const handlePointerDown = useCallback((pos: Position, e: React.PointerEvent) => {
    if (disabled) return;

    // Capture pointer for drag tracking
    (e.target as Element).setPointerCapture(e.pointerId);

    setIsDragging(true);
    updatePath([pos]);
  }, [disabled, updatePath]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || disabled) return;

    // Get element under pointer
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element) return;

    const pos = getTilePosition(element);
    if (!pos) return;

    const currentPath = pathRef.current;

    // Check if we're backtracking (going to second-to-last tile)
    if (currentPath.length >= 2) {
      const secondToLast = currentPath[currentPath.length - 2];
      if (pos.row === secondToLast.row && pos.col === secondToLast.col) {
        // Remove last tile (backtrack)
        updatePath(currentPath.slice(0, -1));
        return;
      }
    }

    // Check if already in path
    if (isInPath(currentPath, pos)) return;

    // Check if adjacent to last tile
    if (currentPath.length > 0) {
      const lastPos = currentPath[currentPath.length - 1];
      if (!areAdjacent(lastPos, pos)) return;
    }

    // Add to path
    updatePath([...currentPath, pos]);
  }, [isDragging, disabled, getTilePosition, updatePath]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    const finalPath = pathRef.current;

    if (finalPath.length > 0) {
      onPathComplete(finalPath);
      updatePath([]);
    }
  }, [isDragging, onPathComplete, updatePath]);

  // Tap-to-select mode
  const handleTileClick = useCallback((pos: Position) => {
    if (disabled || isDragging) return;

    const now = Date.now();
    const currentPath = pathRef.current;

    // Check for double-tap to submit
    if (lastTapRef.current) {
      const { pos: lastPos, time: lastTime } = lastTapRef.current;
      if (
        pos.row === lastPos.row &&
        pos.col === lastPos.col &&
        now - lastTime < 300
      ) {
        // Double-tap on same tile - submit
        if (currentPath.length > 0) {
          onPathComplete(currentPath);
          updatePath([]);
        }
        lastTapRef.current = null;
        return;
      }
    }

    lastTapRef.current = { pos, time: now };

    // Check if tapping current tile again (toggle off last tile)
    if (currentPath.length > 0) {
      const lastPos = currentPath[currentPath.length - 1];
      if (pos.row === lastPos.row && pos.col === lastPos.col) {
        // Tap on last tile - wait for potential double-tap
        return;
      }
    }

    // Check if already in path - if so, truncate to that position
    const existingIndex = currentPath.findIndex(
      (p) => p.row === pos.row && p.col === pos.col
    );
    if (existingIndex !== -1) {
      updatePath(currentPath.slice(0, existingIndex + 1));
      return;
    }

    // Check if adjacent to last tile (or first tile)
    if (currentPath.length > 0) {
      const lastPos = currentPath[currentPath.length - 1];
      if (!areAdjacent(lastPos, pos)) {
        // Not adjacent - start new path
        updatePath([pos]);
        return;
      }
    }

    // Add to path
    updatePath([...currentPath, pos]);
  }, [disabled, isDragging, onPathComplete, updatePath]);

  return {
    path,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTileClick,
    clearPath,
  };
}
