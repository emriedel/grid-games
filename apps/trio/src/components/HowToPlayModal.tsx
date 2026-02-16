'use client';

import { Modal } from '@grid-games/ui';
import { CardShape } from './CardShape';
import { GAME_CONFIG } from '@/constants';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How to Play">
      <div className="space-y-4 text-[var(--foreground)]">
        <p>
          Find the matching trio in each of <strong>{GAME_CONFIG.ROUND_COUNT} rounds</strong>.
        </p>

        <div className="space-y-2">
          <h3 className="font-semibold text-[var(--accent)]">What makes a valid trio?</h3>
          <p className="text-sm">
            For each attribute (shape, color, pattern, count), the 3 cards must be either{' '}
            <strong>ALL SAME</strong> or <strong>ALL DIFFERENT</strong>.
          </p>
        </div>

        {/* Example valid trio */}
        <div className="bg-neutral-800 rounded-lg p-3">
          <p className="text-sm mb-2 text-[var(--muted)]">Example: All different shapes, colors, patterns, counts</p>
          <div className="flex justify-center gap-3">
            <div className="w-14 h-14 bg-[var(--card-bg)] rounded-lg flex items-center justify-center p-2">
              <CardShape shape="circle" color="red" pattern="solid" count={1} size="sm" />
            </div>
            <div className="w-14 h-14 bg-[var(--card-bg)] rounded-lg flex items-center justify-center p-2">
              <CardShape shape="triangle" color="green" pattern="outline" count={2} size="sm" />
            </div>
            <div className="w-14 h-14 bg-[var(--card-bg)] rounded-lg flex items-center justify-center p-2">
              <CardShape shape="square" color="purple" pattern="striped" count={3} size="sm" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-[var(--accent)]">How to play</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Tap 3 cards to select them</li>
            <li>Press <strong>Submit</strong> to check your trio</li>
            <li>Valid trios are removed; 3 new cards appear</li>
            <li>Find the trio in all {GAME_CONFIG.ROUND_COUNT} rounds to win</li>
          </ol>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-[var(--accent)]">Game over</h3>
          <p className="text-sm">
            You have <strong>{GAME_CONFIG.MAX_INCORRECT_GUESSES} attempts</strong> - {GAME_CONFIG.MAX_INCORRECT_GUESSES} wrong guesses and it&apos;s game over!
          </p>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold text-[var(--accent)]">Hints</h3>
          <p className="text-sm">
            Stuck? Use a hint (💡) to reveal one card from the valid trio. You have {GAME_CONFIG.MAX_HINTS} hints per puzzle.
          </p>
        </div>
      </div>
    </Modal>
  );
}

export default HowToPlayModal;
