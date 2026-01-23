'use client';

import { useMemo } from 'react';
import { Modal, Button } from '@grid-games/ui';
import { GameStats } from '@/types';
import { getStats } from '@/lib/storage';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StatsModal({ isOpen, onClose }: StatsModalProps) {
  const stats: GameStats | null = useMemo(() => {
    if (!isOpen) return null;
    return getStats();
  }, [isOpen]);

  if (!stats) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Statistics">
        <div className="text-center text-[var(--muted)]">
          No stats available yet. Play a game first!
        </div>
        <div className="mt-6">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  const avgScore = stats.gamesPlayed > 0
    ? Math.round(stats.totalScore / stats.gamesPlayed)
    : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Statistics">
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatBox label="Played" value={stats.gamesPlayed} />
        <StatBox label="Current Streak" value={stats.currentStreak} />
        <StatBox label="Max Streak" value={stats.maxStreak} />
        <StatBox label="Best Score" value={stats.bestScore} />
        <StatBox label="Most Words" value={stats.bestWordCount} />
        <StatBox label="Avg Score" value={avgScore} />
      </div>

      <div className="text-center text-sm text-[var(--muted)] mb-4">
        Total: {stats.totalWords} words, {stats.totalScore} points
      </div>

      <Button variant="secondary" fullWidth onClick={onClose}>
        Close
      </Button>
    </Modal>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-3 bg-[var(--tile-bg)] rounded-lg">
      <div className="text-2xl font-bold text-[var(--foreground)]">{value}</div>
      <div className="text-xs text-[var(--muted)]">{label}</div>
    </div>
  );
}
