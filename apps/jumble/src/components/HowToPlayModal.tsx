'use client';

import { Modal } from '@grid-games/ui';

// Mini-grid example showing "JUMBLE" being spelled
// Grid layout: J U E
//              M B L
// Path: J(0,0) → U(0,1) → M(1,0) → B(1,1) → L(1,2) → E(0,2)
function ExampleGrid() {
  const tiles = [
    { letter: 'J', row: 0, col: 0, order: 1 },
    { letter: 'U', row: 0, col: 1, order: 2 },
    { letter: 'E', row: 0, col: 2, order: 6 },
    { letter: 'M', row: 1, col: 0, order: 3 },
    { letter: 'B', row: 1, col: 1, order: 4 },
    { letter: 'L', row: 1, col: 2, order: 5 },
  ];

  // Path connections: J→U→M→B→L→E
  // Each tile center is at (col * 44 + 20, row * 44 + 20) for 40px tiles with 4px gap
  const tileSize = 40;
  const gap = 4;
  const cellSize = tileSize + gap;
  const center = tileSize / 2;

  const pathOrder = [0, 1, 3, 4, 5, 2]; // indices in tiles array for J→U→M→B→L→E
  const lines = [];
  for (let i = 0; i < pathOrder.length - 1; i++) {
    const from = tiles[pathOrder[i]];
    const to = tiles[pathOrder[i + 1]];
    lines.push({
      x1: from.col * cellSize + center,
      y1: from.row * cellSize + center,
      x2: to.col * cellSize + center,
      y2: to.row * cellSize + center,
    });
  }

  const svgWidth = 3 * cellSize - gap;
  const svgHeight = 2 * cellSize - gap;

  return (
    <div className="relative inline-block">
      <div className="grid grid-cols-3 gap-1">
        {tiles.map((tile) => (
          <div
            key={`${tile.row}-${tile.col}`}
            className="relative w-10 h-10 rounded-md flex items-center justify-center font-bold text-lg border-2 bg-[var(--tile-bg-selected)] border-[var(--accent)]"
          >
            {tile.letter}
            <span className="absolute top-0.5 right-1 text-[10px] font-normal text-[var(--accent)]">
              {tile.order}
            </span>
          </div>
        ))}
      </div>
      <svg
        className="absolute inset-0 pointer-events-none"
        width={svgWidth}
        height={svgHeight}
        style={{ overflow: 'visible' }}
      >
        {lines.map((line, i) => (
          <line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="var(--accent)"
            strokeWidth={3}
            strokeLinecap="round"
            opacity={0.6}
          />
        ))}
      </svg>
    </div>
  );
}

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How To Play Jumble" size="md">
      <div className="space-y-4 text-sm">
        <p className="text-[var(--muted)]">
          Find words by connecting adjacent tiles (including diagonals). Each tile can only be used once per word.
        </p>

        <div className="flex justify-center">
          <ExampleGrid />
        </div>

        <section>
          <h3 className="font-bold text-[var(--accent)] mb-1">Controls</h3>
          <p className="text-[var(--muted)]">
            Drag across tiles, or tap to select and double-tap to submit.
          </p>
        </section>

        <section>
          <h3 className="font-bold text-[var(--accent)] mb-1">Word Scoring</h3>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="flex justify-between px-2 py-1 bg-[var(--tile-bg)] rounded text-[var(--muted)]">
              <span>3 letters</span>
              <span className="font-bold text-[var(--foreground)]">1 pt</span>
            </div>
            <div className="flex justify-between px-2 py-1 bg-[var(--tile-bg)] rounded text-[var(--muted)]">
              <span>4 letters</span>
              <span className="font-bold text-[var(--foreground)]">2 pts</span>
            </div>
            <div className="flex justify-between px-2 py-1 bg-[var(--tile-bg)] rounded text-[var(--muted)]">
              <span>5 letters</span>
              <span className="font-bold text-[var(--foreground)]">4 pts</span>
            </div>
            <div className="flex justify-between px-2 py-1 bg-[var(--tile-bg)] rounded text-[var(--muted)]">
              <span>6+ letters</span>
              <span className="font-bold text-[var(--foreground)]">8 pts</span>
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-bold text-[var(--accent)] mb-1">Stars</h3>
          <p className="text-[var(--muted)]">
            Earn up to 3 stars based on your score. Thresholds vary slightly by puzzle.
          </p>
          <p className="text-[var(--muted)] mt-2 text-xs italic">
            Tap the score during gameplay to see this puzzle&apos;s thresholds.
          </p>
        </section>
      </div>
    </Modal>
  );
}
