'use client';

import { useState, useEffect, useRef } from 'react';
import { Modal } from '@grid-games/ui';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mini animated demo showing game mechanics
function MiniDemo() {
  const [step, setStep] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Animation sequence (3 moves demonstrating blocker, wall, and goal):
  // Step 0: Initial - Target at (0,3) top-right, Blocker at (2,3), Goal at (3,1)
  //         Wall: left edge of cell (1,1)
  // Step 1: Target moves DOWN → stopped by blocker, lands at (1,3)
  // Step 2: Target moves LEFT → stopped by wall at (1,1), lands at (1,1)
  // Step 3: Target moves DOWN → slides to edge at (3,1) = GOAL!
  // Then pause with success flash, reset

  const CELL_SIZE = 24;
  const PIECE_SIZE = CELL_SIZE * 0.6;
  const OFFSET = (CELL_SIZE - PIECE_SIZE) / 2;

  // Piece positions based on step
  const getTargetPosition = () => {
    switch (step) {
      case 0: return { row: 0, col: 3 };  // Top-right corner
      case 1: return { row: 1, col: 3 };  // Stopped by blocker
      case 2: return { row: 1, col: 1 };  // Stopped by wall
      case 3: return { row: 3, col: 1 };  // Goal!
      default: return { row: 0, col: 3 };
    }
  };

  const blockerPosition = { row: 2, col: 3 };  // Middle of right column
  const goalPosition = { row: 3, col: 1 };      // Bottom row
  const wallCell = { row: 1, col: 1 };          // Cell with left wall
  const targetPos = getTargetPosition();
  const isAtGoal = step === 3;

  useEffect(() => {
    const runAnimation = () => {
      if (step === 0) {
        // Wait, then move to step 1
        timeoutRef.current = setTimeout(() => {
          setIsTransitioning(true);
          setStep(1);
        }, 1200);
      } else if (step === 1) {
        // Wait for transition, then move to step 2
        timeoutRef.current = setTimeout(() => {
          setStep(2);
        }, 1000);
      } else if (step === 2) {
        // Wait for transition, then move to step 3
        timeoutRef.current = setTimeout(() => {
          setStep(3);
        }, 1000);
      } else if (step === 3) {
        // At goal - pause with success, then reset
        timeoutRef.current = setTimeout(() => {
          setIsTransitioning(false);
          setStep(0);
        }, 1800);
      }
    };

    runAnimation();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [step]);

  return (
    <div className="flex justify-center">
      <div
        className="relative bg-[var(--background)] rounded"
        style={{ width: CELL_SIZE * 4, height: CELL_SIZE * 4 }}
      >
        {/* 4x4 grid cells with edge borders simulating board edge */}
        {Array.from({ length: 16 }).map((_, i) => {
          const row = Math.floor(i / 4);
          const col = i % 4;
          const isGoal = row === goalPosition.row && col === goalPosition.col;
          const hasLeftWall = row === wallCell.row && col === wallCell.col;

          // Edge borders (simulating board edge)
          const isTopEdge = row === 0;
          const isBottomEdge = row === 3;
          const isLeftEdge = col === 0;
          const isRightEdge = col === 3;

          return (
            <div
              key={i}
              className={`absolute border border-[var(--cell-border)] ${isGoal ? 'bg-[var(--goal-bg)]' : 'bg-[var(--cell-bg)]'}`}
              style={{
                width: CELL_SIZE,
                height: CELL_SIZE,
                top: row * CELL_SIZE,
                left: col * CELL_SIZE,
                borderTopWidth: isTopEdge ? 2 : 1,
                borderTopColor: isTopEdge ? 'var(--wall-color)' : undefined,
                borderBottomWidth: isBottomEdge ? 2 : 1,
                borderBottomColor: isBottomEdge ? 'var(--wall-color)' : undefined,
                borderLeftWidth: isLeftEdge || hasLeftWall ? 2 : 1,
                borderLeftColor: isLeftEdge || hasLeftWall ? 'var(--wall-color)' : undefined,
                borderRightWidth: isRightEdge ? 2 : 1,
                borderRightColor: isRightEdge ? 'var(--wall-color)' : undefined,
              }}
            >
              {/* Goal star */}
              {isGoal && (
                <svg
                  className="absolute inset-0 m-auto text-[var(--accent)] opacity-60"
                  style={{ width: CELL_SIZE * 0.6, height: CELL_SIZE * 0.6 }}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
                </svg>
              )}
            </div>
          );
        })}

        {/* Blocker piece (blue) */}
        <div
          className="absolute rounded-sm"
          style={{
            width: PIECE_SIZE,
            height: PIECE_SIZE,
            top: blockerPosition.row * CELL_SIZE + OFFSET,
            left: blockerPosition.col * CELL_SIZE + OFFSET,
            background: 'radial-gradient(circle at 30% 30%, #60a5fa, #3b82f6 60%)',
          }}
        />

        {/* Target piece (amber) with star */}
        <div
          className="absolute rounded-sm flex items-center justify-center"
          style={{
            width: PIECE_SIZE,
            height: PIECE_SIZE,
            top: targetPos.row * CELL_SIZE + OFFSET,
            left: targetPos.col * CELL_SIZE + OFFSET,
            background: 'radial-gradient(circle at 30% 30%, #fbbf24, #f59e0b 60%)',
            transition: isTransitioning ? 'top 300ms ease-out, left 300ms ease-out' : 'none',
            boxShadow: isAtGoal ? '0 0 8px rgba(34, 197, 94, 0.8)' : 'none',
          }}
        >
          <svg
            style={{ width: PIECE_SIZE * 0.5, height: PIECE_SIZE * 0.5 }}
            viewBox="0 0 24 24"
            fill="rgba(0, 0, 0, 0.5)"
          >
            <path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6-6.3 4.6 2.3-7-6-4.6h7.6z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function TargetPieceIcon() {
  return (
    <span className="inline-block w-4 h-4 bg-[var(--accent)] rounded align-middle mx-0.5" />
  );
}

function BlockerPieceIcon() {
  return (
    <span className="inline-block w-4 h-4 bg-blue-500 rounded align-middle mx-0.5" />
  );
}

function GoalIcon() {
  return (
    <svg className="inline-block w-4 h-4 align-middle mx-0.5" viewBox="0 0 24 24" fill="var(--accent)">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How to Play Carom">
      <div className="space-y-4 text-[var(--foreground)]">
        <MiniDemo />

        <p className="text-[var(--muted)]">
          Guide the <TargetPieceIcon /> <span className="text-[var(--accent)] font-semibold">target</span> to
          the <GoalIcon /> <span className="text-[var(--accent)]">goal</span> in as few moves as possible.
        </p>

        <p className="text-[var(--muted)]">
          Pieces slide until blocked by a wall or another piece.
        </p>

        <p className="text-[var(--muted)]">
          Use <BlockerPieceIcon /> blockers to create stopping points.
        </p>
      </div>
    </Modal>
  );
}
