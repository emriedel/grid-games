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
  handleOutsideClick: () => void;
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
  const pathRef = useRef<Position[]>([]);
  // Track if actual drag movement occurred (moved to a different tile)
  const hasDragMovedRef = useRef(false);
  // Track the starting position of a pointer interaction
  const dragStartPosRef = useRef<Position | null>(null);
  // Track if a drag just completed (to suppress click after drag)
  const justCompletedDragRef = useRef(false);

  // Keep pathRef in sync
  const updatePath = useCallback((newPath: Position[]) => {
    pathRef.current = newPath;
    setPath(newPath);
    onPathChange(newPath);
  }, [onPathChange]);

  const clearPath = useCallback(() => {
    updatePath([]);
    setIsDragging(false);
    hasDragMovedRef.current = false;
    dragStartPosRef.current = null;
  }, [updatePath]);

  const handlePointerDown = useCallback((pos: Position, e: React.PointerEvent) => {
    if (disabled) return;

    // Capture pointer for drag tracking
    (e.target as Element).setPointerCapture(e.pointerId);

    setIsDragging(true);
    hasDragMovedRef.current = false;
    justCompletedDragRef.current = false;
    // Store the starting position for drag detection
    dragStartPosRef.current = pos;
    pathRef.current = [pos];
  }, [disabled]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || disabled) return;

    // Get element under pointer
    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element) return;

    const pos = getTilePosition(element);
    if (!pos) return;

    const currentPath = pathRef.current;

    // If this is the first move and we haven't committed the path yet
    if (!hasDragMovedRef.current && currentPath.length === 1) {
      const startPos = currentPath[0];
      // Check if we moved to a different tile
      if (pos.row !== startPos.row || pos.col !== startPos.col) {
        // Now we know it's a real drag - commit the starting position and add this one
        hasDragMovedRef.current = true;
        if (areAdjacent(startPos, pos)) {
          updatePath([startPos, pos]);
        }
      }
      return;
    }

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

    // Only submit if actual dragging occurred (moved to different tiles)
    if (hasDragMovedRef.current) {
      const finalPath = pathRef.current;
      if (finalPath.length > 0) {
        onPathComplete(finalPath);
        updatePath([]);
      }
      // Mark that a drag just completed so we can suppress the subsequent click event
      justCompletedDragRef.current = true;
    }
    // If no drag movement, it was a tap - let handleTileClick handle it

    hasDragMovedRef.current = false;
    dragStartPosRef.current = null;
  }, [isDragging, onPathComplete, updatePath]);

  // Handle clicking outside tiles to clear the path
  const handleOutsideClick = useCallback(() => {
    if (disabled) return;

    if (pathRef.current.length > 0) {
      updatePath([]);
    }
  }, [disabled, updatePath]);

  // Tap-to-select mode
  const handleTileClick = useCallback((pos: Position) => {
    if (disabled) return;

    // If a drag just completed, suppress this click event
    // (click fires after pointerUp on the starting tile)
    if (justCompletedDragRef.current) {
      justCompletedDragRef.current = false;
      return;
    }

    // Use the actual visual path state, not the ref (which might have been set by pointerDown)
    const currentPath = path;

    // If tapping the last tile in the path, submit the word
    if (currentPath.length > 0) {
      const lastPos = currentPath[currentPath.length - 1];
      if (pos.row === lastPos.row && pos.col === lastPos.col) {
        onPathComplete(currentPath);
        updatePath([]);
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

    // Check if adjacent to last tile
    if (currentPath.length > 0) {
      const lastPos = currentPath[currentPath.length - 1];
      if (!areAdjacent(lastPos, pos)) {
        // Not adjacent - start new path
        updatePath([pos]);
        return;
      }
      // Adjacent - add to path
      updatePath([...currentPath, pos]);
    } else {
      // Start new path
      updatePath([pos]);
    }
  }, [disabled, path, onPathComplete, updatePath]);

  return {
    path,
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleTileClick,
    handleOutsideClick,
    clearPath,
  };
}
