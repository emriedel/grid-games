'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Piece, Puzzle, Move, Direction } from '@/types';
import { simulateSlide, applyMove } from '@/lib/gameLogic';

const PAUSE_BETWEEN_MOVES = 150;
const SLIDE_ANIMATION_DURATION = 200;
const TOTAL_STEP_TIME = SLIDE_ANIMATION_DURATION + PAUSE_BETWEEN_MOVES;

export interface UseReplayReturn {
  /** Current step: 0 = initial position, N = after move N */
  currentStep: number;
  /** Total number of steps (moves) in the replay */
  totalSteps: number;
  /** Whether auto-play is active */
  isPlaying: boolean;
  /** Whether we're at the end position */
  isAtEnd: boolean;
  /** Whether we're at the start position */
  isAtStart: boolean;
  /** Piece positions at the current step */
  pieces: Piece[];
  /** Whether currently animating a transition */
  isAnimating: boolean;

  /** Start or resume auto-play */
  play: () => void;
  /** Pause auto-play */
  pause: () => void;
  /** Step forward one move */
  stepForward: () => void;
  /** Step backward one move */
  stepBackward: () => void;
  /** Jump to the start (step 0) */
  goToStart: () => void;
  /** Jump to the end (final step) */
  goToEnd: () => void;
}

/**
 * Calculate piece positions after applying moves up to a given step
 */
function getPiecesAtStep(
  puzzle: Puzzle,
  moveHistory: Move[],
  step: number
): Piece[] {
  // Start with initial piece positions
  let pieces = puzzle.pieces.map((p) => ({ ...p, position: { ...p.position } }));

  // Apply moves up to the given step
  for (let i = 0; i < step && i < moveHistory.length; i++) {
    const move = moveHistory[i];
    pieces = applyMove(pieces, move.pieceId, move.to);
  }

  return pieces;
}

/**
 * Hook to manage replay state for a completed puzzle
 */
export function useReplay(
  puzzle: Puzzle | null,
  moveHistory: Move[]
): UseReplayReturn {
  const [currentStep, setCurrentStep] = useState(moveHistory.length);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const prevMoveHistoryLengthRef = useRef(moveHistory.length);

  const totalSteps = moveHistory.length;
  const isAtEnd = currentStep >= totalSteps;
  const isAtStart = currentStep === 0;

  // Sync currentStep to end when moveHistory changes (e.g., game finishes)
  useEffect(() => {
    const prevLength = prevMoveHistoryLengthRef.current;
    const newLength = moveHistory.length;

    // If moveHistory went from empty to populated, or changed significantly,
    // jump to the end (solved state)
    if (newLength > 0 && (prevLength === 0 || newLength !== prevLength)) {
      setCurrentStep(newLength);
    }

    prevMoveHistoryLengthRef.current = newLength;
  }, [moveHistory.length]);

  // Calculate pieces at current step
  const pieces = useMemo(() => {
    if (!puzzle) return [];
    return getPiecesAtStep(puzzle, moveHistory, currentStep);
  }, [puzzle, moveHistory, currentStep]);

  // Stop playback when reaching the end
  useEffect(() => {
    if (isAtEnd && isPlaying) {
      setIsPlaying(false);
    }
  }, [isAtEnd, isPlaying]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  // Handle auto-play
  useEffect(() => {
    if (isPlaying && !isAtEnd) {
      playIntervalRef.current = setInterval(() => {
        setIsAnimating(true);
        setCurrentStep((prev) => {
          const next = prev + 1;
          if (next >= totalSteps) {
            setIsPlaying(false);
          }
          return Math.min(next, totalSteps);
        });
        // Clear animating flag after animation completes
        setTimeout(() => setIsAnimating(false), SLIDE_ANIMATION_DURATION);
      }, TOTAL_STEP_TIME);

      return () => {
        if (playIntervalRef.current) {
          clearInterval(playIntervalRef.current);
        }
      };
    }
  }, [isPlaying, isAtEnd, totalSteps]);

  const play = useCallback(() => {
    if (isAtEnd) {
      // If at end, restart from beginning
      setCurrentStep(0);
      // Small delay before starting playback
      setTimeout(() => setIsPlaying(true), 50);
    } else {
      setIsPlaying(true);
    }
  }, [isAtEnd]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
  }, []);

  const stepForward = useCallback(() => {
    if (currentStep < totalSteps) {
      setIsAnimating(true);
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
      setTimeout(() => setIsAnimating(false), SLIDE_ANIMATION_DURATION);
    }
  }, [currentStep, totalSteps]);

  const stepBackward = useCallback(() => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setCurrentStep((prev) => Math.max(prev - 1, 0));
      setTimeout(() => setIsAnimating(false), SLIDE_ANIMATION_DURATION);
    }
  }, [currentStep]);

  const goToStart = useCallback(() => {
    pause();
    setIsAnimating(true);
    setCurrentStep(0);
    setTimeout(() => setIsAnimating(false), SLIDE_ANIMATION_DURATION);
  }, [pause]);

  const goToEnd = useCallback(() => {
    pause();
    setIsAnimating(true);
    setCurrentStep(totalSteps);
    setTimeout(() => setIsAnimating(false), SLIDE_ANIMATION_DURATION);
  }, [pause, totalSteps]);

  return {
    currentStep,
    totalSteps,
    isPlaying,
    isAtEnd,
    isAtStart,
    pieces,
    isAnimating,
    play,
    pause,
    stepForward,
    stepBackward,
    goToStart,
    goToEnd,
  };
}

/**
 * Version of useReplay that accepts decoded move commands instead of full Move objects.
 * Used for the replay page where we only have pieceId + direction from URL.
 */
export function useReplayFromMoves(
  puzzle: Puzzle | null,
  moves: { pieceId: string; direction: Direction }[]
): UseReplayReturn {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalSteps = moves.length;
  const isAtEnd = currentStep >= totalSteps;
  const isAtStart = currentStep === 0;

  // Calculate pieces at current step by simulating each move
  const pieces = useMemo(() => {
    if (!puzzle) return [];

    let currentPieces = puzzle.pieces.map((p) => ({
      ...p,
      position: { ...p.position },
    }));

    for (let i = 0; i < currentStep && i < moves.length; i++) {
      const move = moves[i];
      const endPos = simulateSlide(
        puzzle.board,
        currentPieces,
        move.pieceId,
        move.direction
      );
      currentPieces = applyMove(currentPieces, move.pieceId, endPos);
    }

    return currentPieces;
  }, [puzzle, moves, currentStep]);

  // Stop playback when reaching the end
  useEffect(() => {
    if (isAtEnd && isPlaying) {
      setIsPlaying(false);
    }
  }, [isAtEnd, isPlaying]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  // Handle auto-play
  useEffect(() => {
    if (isPlaying && !isAtEnd) {
      playIntervalRef.current = setInterval(() => {
        setIsAnimating(true);
        setCurrentStep((prev) => {
          const next = prev + 1;
          if (next >= totalSteps) {
            setIsPlaying(false);
          }
          return Math.min(next, totalSteps);
        });
        setTimeout(() => setIsAnimating(false), SLIDE_ANIMATION_DURATION);
      }, TOTAL_STEP_TIME);

      return () => {
        if (playIntervalRef.current) {
          clearInterval(playIntervalRef.current);
        }
      };
    }
  }, [isPlaying, isAtEnd, totalSteps]);

  const play = useCallback(() => {
    if (isAtEnd) {
      setCurrentStep(0);
      setTimeout(() => setIsPlaying(true), 50);
    } else {
      setIsPlaying(true);
    }
  }, [isAtEnd]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
  }, []);

  const stepForward = useCallback(() => {
    if (currentStep < totalSteps) {
      setIsAnimating(true);
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
      setTimeout(() => setIsAnimating(false), SLIDE_ANIMATION_DURATION);
    }
  }, [currentStep, totalSteps]);

  const stepBackward = useCallback(() => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setCurrentStep((prev) => Math.max(prev - 1, 0));
      setTimeout(() => setIsAnimating(false), SLIDE_ANIMATION_DURATION);
    }
  }, [currentStep]);

  const goToStart = useCallback(() => {
    pause();
    setIsAnimating(true);
    setCurrentStep(0);
    setTimeout(() => setIsAnimating(false), SLIDE_ANIMATION_DURATION);
  }, [pause]);

  const goToEnd = useCallback(() => {
    pause();
    setIsAnimating(true);
    setCurrentStep(totalSteps);
    setTimeout(() => setIsAnimating(false), SLIDE_ANIMATION_DURATION);
  }, [pause, totalSteps]);

  return {
    currentStep,
    totalSteps,
    isPlaying,
    isAtEnd,
    isAtStart,
    pieces,
    isAnimating,
    play,
    pause,
    stepForward,
    stepBackward,
    goToStart,
    goToEnd,
  };
}
