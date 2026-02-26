'use client';

import { Modal } from '@grid-games/ui';
import { CardShape } from './CardShape';
import { GAME_CONFIG } from '@/constants';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Example card component for the modal
function ExampleCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-16 h-16 rounded-lg flex items-center justify-center p-2 ${className}`}>
      {children}
    </div>
  );
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How to Play Trio">
      <div className="space-y-5 text-[var(--foreground)]">
        <p>
          Find the matching trio in each of <strong>{GAME_CONFIG.ROUND_COUNT} rounds</strong>.
        </p>

        {/* The Rule */}
        <div className="space-y-2">
          <h3 className="font-semibold text-[var(--accent)]">The Rule</h3>
          <p className="text-sm">
            Each group of shapes has 4 attributes: <strong>shape</strong>, <strong>color</strong>, <strong>pattern</strong>, and <strong>number</strong>.
          </p>
          <p className="text-sm">
            In a valid Trio, each attribute must be either <strong>all the same</strong> or <strong>all different</strong> across the 3 groups of shapes.
          </p>
        </div>

        {/* Valid Trio Example */}
        <div className="rounded-lg p-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-green-400 text-lg">✓</span>
            <span className="text-sm font-medium text-green-400">Valid Trio</span>
          </div>
          <div className="flex justify-center gap-3 mb-3">
            <ExampleCard>
              <CardShape shape="circle" color="red" pattern="solid" count={1} size="sm" />
            </ExampleCard>
            <ExampleCard>
              <CardShape shape="triangle" color="blue" pattern="outline" count={2} size="sm" />
            </ExampleCard>
            <ExampleCard>
              <CardShape shape="square" color="gold" pattern="striped" count={3} size="sm" />
            </ExampleCard>
          </div>
        </div>

        {/* Invalid Trio Example */}
        <div className="rounded-lg p-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-red-400 text-lg">✗</span>
            <span className="text-sm font-medium text-red-400">Not a Trio</span>
          </div>
          <div className="flex justify-center gap-3 mb-3">
            <ExampleCard>
              <CardShape shape="circle" color="red" pattern="solid" count={1} size="sm" />
            </ExampleCard>
            <ExampleCard>
              <CardShape shape="circle" color="red" pattern="outline" count={2} size="sm" />
            </ExampleCard>
            <ExampleCard>
              <CardShape shape="circle" color="blue" pattern="striped" count={3} size="sm" />
            </ExampleCard>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default HowToPlayModal;
