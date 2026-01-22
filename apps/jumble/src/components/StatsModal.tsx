'use client';

import { useMemo } from 'react';
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

  if (!isOpen || !stats) return null;

  const avgScore = stats.gamesPlayed > 0
    ? Math.round(stats.totalScore / stats.gamesPlayed)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-[var(--background)] rounded-xl p-6 max-w-sm w-full mx-4">
        <h2 className="text-2xl font-bold text-center mb-6">Statistics</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatBox label="Played" value={stats.gamesPlayed} />
          <StatBox label="Current Streak" value={stats.currentStreak} />
          <StatBox label="Max Streak" value={stats.maxStreak} />
          <StatBox label="Best Score" value={stats.bestScore} />
          <StatBox label="Most Words" value={stats.bestWordCount} />
          <StatBox label="Avg Score" value={avgScore} />
        </div>

        <div className="text-center text-sm opacity-60 mb-4">
          Total: {stats.totalWords} words, {stats.totalScore} points
        </div>

        <button
          onClick={onClose}
          className="
            w-full py-2 rounded-lg
            bg-[var(--tile-bg)] hover:bg-[var(--tile-bg-selected)]
            transition-colors
          "
        >
          Close
        </button>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center p-3 bg-[var(--tile-bg)] rounded-lg">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs opacity-60">{label}</div>
    </div>
  );
}
