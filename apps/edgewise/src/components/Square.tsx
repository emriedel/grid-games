'use client';

import { useState, useEffect, useRef } from 'react';
import { SquareState, Edge } from '@/types';
import { CENTER_FACING_EDGES } from '@/constants/gameConfig';

interface SquareProps {
  square: SquareState;
  squareIndex: number;
  onRotate: () => void;
  disabled?: boolean;
}

export function Square({ square, squareIndex, onRotate, disabled }: SquareProps) {
  // Track cumulative rotation to avoid backwards animation on wrap-around
  const [displayRotation, setDisplayRotation] = useState(square.rotation * 90);
  const prevRotationRef = useRef(square.rotation);

  // Track cumulative flip for each word to avoid backwards animation
  // Flips use -180° so they take the shorter path when combined with container rotation
  const [wordFlips, setWordFlips] = useState<[number, number, number, number]>(() => {
    // Calculate initial flips:
    // - LEFT (position 3) needs -180° base flip to read bottom-to-top
    // - Add -180° for each transition during rotation
    const countInitialFlips = (originalPos: number, rotation: number): number => {
      // Base flip for LEFT position to read bottom-to-top
      let flips = (originalPos === 3) ? 1 : 0;

      // Add flips from transitions during rotation
      for (let i = 0; i < rotation; i++) {
        const from = (originalPos + i) % 4;
        const to = (originalPos + i + 1) % 4;
        // Flip happens on RIGHT→BOTTOM (1→2) and BOTTOM→LEFT (2→3)
        if ((from === 1 && to === 2) || (from === 2 && to === 3)) {
          flips++;
        }
      }
      return flips * -180;  // Negative for shorter animation path
    };

    return [0, 1, 2, 3].map(pos => countInitialFlips(pos, square.rotation)) as [number, number, number, number];
  });

  useEffect(() => {
    const prevRotation = prevRotationRef.current;
    const newRotation = square.rotation;

    let diff = newRotation - prevRotation;
    if (diff === -3) diff = 1;
    if (diff === 3) diff = -1;

    setDisplayRotation(prev => prev + diff * 90);
    prevRotationRef.current = newRotation;

    // Update word flips based on transitions
    // Flips use -180° for shorter animation path
    // 1. RIGHT (1) → BOTTOM (2): -180°
    // 2. BOTTOM (2) → LEFT (3): -180°
    setWordFlips(prev => {
      return [0, 1, 2, 3].map(originalPos => {
        const prevVisualPos = (originalPos + prevRotation) % 4;
        const newVisualPos = (originalPos + newRotation) % 4;

        // Check if this word is transitioning RIGHT→BOTTOM or BOTTOM→LEFT
        if (prevVisualPos === 1 && newVisualPos === 2) {
          // RIGHT → BOTTOM: subtract 180 for shorter path
          return prev[originalPos] - 180;
        } else if (prevVisualPos === 2 && newVisualPos === 3) {
          // BOTTOM → LEFT: subtract 180 for shorter path
          return prev[originalPos] - 180;
        }
        return prev[originalPos];
      }) as [number, number, number, number];
    });
  }, [square.rotation]);

  // Visual center-facing positions for this square
  const centerFacingVisual = CENTER_FACING_EDGES[squareIndex as 0 | 1 | 2 | 3];

  const isCenterFacing = (originalEdge: Edge): boolean => {
    const visualPosition = (originalEdge + square.rotation) % 4;
    return (centerFacingVisual as readonly number[]).includes(visualPosition);
  };

  const getWordColor = (edge: Edge) =>
    isCenterFacing(edge) ? 'var(--muted)' : 'var(--foreground)';

  return (
    <button
      onClick={onRotate}
      disabled={disabled}
      className={`
        relative w-full h-full
        bg-[var(--tile-bg)] border-2 border-[var(--tile-border)]
        rounded-lg overflow-hidden
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--accent)] active:scale-95'}
        select-none
      `}
      style={{
        transform: `rotate(${displayRotation}deg)`,
        transition: 'transform 300ms ease-out',
      }}
    >
      {/* Top word (words[0]) - horizontal */}
      <div className="absolute top-1 left-0 right-0 flex justify-center">
        <span
          className="text-[11px] font-bold"
          style={{
            color: getWordColor(0),
            transform: `rotate(${wordFlips[0]}deg)`,
            transition: 'transform 300ms ease-out',
          }}
        >
          {square.words[0]}
        </span>
      </div>

      {/* Right word (words[1]) - vertical */}
      <div className="absolute right-1 top-0 bottom-0 flex items-center justify-center">
        <span
          className="text-[11px] font-bold"
          style={{
            color: getWordColor(1),
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: `rotate(${wordFlips[1]}deg)`,
            transition: 'transform 300ms ease-out',
          }}
        >
          {square.words[1]}
        </span>
      </div>

      {/* Bottom word (words[2]) - horizontal */}
      <div className="absolute bottom-1 left-0 right-0 flex justify-center">
        <span
          className="text-[11px] font-bold"
          style={{
            color: getWordColor(2),
            transform: `rotate(${wordFlips[2]}deg)`,
            transition: 'transform 300ms ease-out',
          }}
        >
          {square.words[2]}
        </span>
      </div>

      {/* Left word (words[3]) - vertical */}
      <div className="absolute left-1 top-0 bottom-0 flex items-center justify-center">
        <span
          className="text-[11px] font-bold"
          style={{
            color: getWordColor(3),
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: `rotate(${wordFlips[3]}deg)`,
            transition: 'transform 300ms ease-out',
          }}
        >
          {square.words[3]}
        </span>
      </div>
    </button>
  );
}
