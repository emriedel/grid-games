'use client';

import { useState, useEffect, useRef } from 'react';
import { SquareState, Edge } from '@/types';
import { CENTER_FACING_EDGES } from '@/constants/gameConfig';

interface SquareProps {
  square: SquareState;
  squareIndex: number;
  onRotate: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

// Get the word that appears at a visual position after rotation
function getWordAtVisualPosition(square: SquareState, visualPosition: Edge, rotationOverride?: number): string {
  const rotation = rotationOverride ?? square.rotation;
  const originalIndex = ((visualPosition - rotation + 4) % 4) as Edge;
  return square.words[originalIndex];
}

export function Square({ square, squareIndex, onRotate, disabled, style }: SquareProps) {
  // Track square identity to detect individual rotation vs group rotation
  const squareId = square.words.join('-');
  const prevSquareIdRef = useRef(squareId);
  const prevRotationRef = useRef(square.rotation);

  // Animation state for individual rotation
  const [animationRotation, setAnimationRotation] = useState(0);
  const [displayRotation, setDisplayRotation] = useState(square.rotation);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const isSameSquare = prevSquareIdRef.current === squareId;
    const prevRotation = prevRotationRef.current;
    const newRotation = square.rotation;

    if (isSameSquare && prevRotation !== newRotation) {
      // Individual rotation - animate
      setIsAnimating(true);
      setAnimationRotation(90); // Rotate 90 degrees

      // After animation, update display and reset
      const timer = setTimeout(() => {
        setAnimationRotation(0);
        setDisplayRotation(newRotation);
        setIsAnimating(false);
      }, 300);

      prevRotationRef.current = newRotation;
      return () => clearTimeout(timer);
    } else if (!isSameSquare) {
      // Different square arrived (group rotation) - update instantly
      setAnimationRotation(0);
      setDisplayRotation(newRotation);
      setIsAnimating(false);
    }

    prevSquareIdRef.current = squareId;
    prevRotationRef.current = newRotation;
  }, [square.rotation, squareId]);

  // Visual center-facing positions for this square
  const centerFacingVisual = CENTER_FACING_EDGES[squareIndex as 0 | 1 | 2 | 3];

  const isCenterFacing = (visualPosition: Edge): boolean => {
    return (centerFacingVisual as readonly number[]).includes(visualPosition);
  };

  const getWordStyle = (visualPosition: Edge): React.CSSProperties => ({
    color: isCenterFacing(visualPosition) ? 'var(--muted)' : 'var(--foreground)',
    opacity: isCenterFacing(visualPosition) ? 0.4 : 1,
    fontSize: isCenterFacing(visualPosition) ? '11px' : '13px',
  });

  // Use displayRotation for word calculation (delays update during animation)
  const topWord = getWordAtVisualPosition(square, 0, displayRotation);
  const rightWord = getWordAtVisualPosition(square, 1, displayRotation);
  const bottomWord = getWordAtVisualPosition(square, 2, displayRotation);
  const leftWord = getWordAtVisualPosition(square, 3, displayRotation);

  // Combine position style with rotation animation
  const combinedStyle: React.CSSProperties = {
    ...style,
    transform: `${style?.transform || ''} rotate(${animationRotation}deg)`.trim(),
    transition: isAnimating
      ? 'transform 300ms ease-out, left 300ms ease-out, top 300ms ease-out'
      : (style?.transition || 'none'),
  };

  return (
    <button
      onClick={() => {
        if (!isAnimating) onRotate();
      }}
      disabled={disabled}
      className={`
        bg-[var(--tile-bg)] border-2 border-[var(--tile-border)]
        rounded-lg overflow-hidden
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-[var(--accent)] active:scale-95'}
        select-none
      `}
      style={combinedStyle}
    >
      {/* Top word - horizontal */}
      <div className="absolute top-1 left-0 right-0 flex justify-center">
        <span className="font-bold" style={getWordStyle(0)}>
          {topWord}
        </span>
      </div>

      {/* Right word - vertical, reading top-to-bottom */}
      <div className="absolute right-1 top-0 bottom-0 flex items-center justify-center">
        <span
          className="font-bold"
          style={{
            ...getWordStyle(1),
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
          }}
        >
          {rightWord}
        </span>
      </div>

      {/* Bottom word - horizontal */}
      <div className="absolute bottom-1 left-0 right-0 flex justify-center">
        <span className="font-bold" style={getWordStyle(2)}>
          {bottomWord}
        </span>
      </div>

      {/* Left word - vertical, reading bottom-to-top */}
      <div className="absolute left-1 top-0 bottom-0 flex items-center justify-center">
        <span
          className="font-bold"
          style={{
            ...getWordStyle(3),
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
          }}
        >
          {leftWord}
        </span>
      </div>
    </button>
  );
}
