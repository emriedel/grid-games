'use client';

import { useState, useEffect } from 'react';
import { GAMES, type GameInfo } from '@grid-games/config';
import { Button } from '@grid-games/ui';

interface PoolData {
  puzzles: unknown[];
  generatedAt?: string;
}

interface MonthlyData {
  puzzles: Record<string, unknown>;
}

interface GameStatus {
  game: GameInfo;
  poolSize: number;
  generatedAt: string | null;
  highestAssigned: number;
  runway: number;
  error?: string;
}

function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function getTodayPuzzleNumber(launchDate: string): number {
  const launch = new Date(launchDate + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = today.getTime() - launch.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getUrgencyLevel(runway: number): 'critical' | 'warning' | 'good' {
  if (runway < 30) return 'critical';
  if (runway < 60) return 'warning';
  return 'good';
}

function getUrgencyColor(level: 'critical' | 'warning' | 'good'): string {
  switch (level) {
    case 'critical':
      return 'var(--danger)';
    case 'warning':
      return 'var(--warning)';
    case 'good':
      return 'var(--success)';
  }
}

async function fetchPoolData(gameId: string): Promise<{ poolSize: number; generatedAt: string | null }> {
  try {
    const response = await fetch(`/${gameId}/puzzles/pool.json`);
    if (!response.ok) {
      return { poolSize: 0, generatedAt: null };
    }
    const data: PoolData = await response.json();
    return {
      poolSize: data.puzzles?.length ?? 0,
      generatedAt: data.generatedAt ?? null,
    };
  } catch {
    return { poolSize: 0, generatedAt: null };
  }
}

async function fetchHighestAssigned(gameId: string, launchDate: string): Promise<number> {
  const launch = new Date(launchDate + 'T00:00:00');
  const today = new Date();

  // Check current month + next 6 months
  const monthsToCheck: string[] = [];
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(today);
    checkDate.setMonth(checkDate.getMonth() + i);
    monthsToCheck.push(getMonthKey(checkDate));
  }

  let highest = 0;

  for (const monthKey of monthsToCheck) {
    try {
      const response = await fetch(`/${gameId}/puzzles/assigned/${monthKey}.json`);
      if (!response.ok) continue;

      const data: MonthlyData = await response.json();
      const puzzleNumbers = Object.keys(data.puzzles || {}).map(Number);
      const maxInMonth = Math.max(0, ...puzzleNumbers);
      if (maxInMonth > highest) {
        highest = maxInMonth;
      }
    } catch {
      // Month file doesn't exist, continue
    }
  }

  return highest;
}

async function fetchGameStatus(game: GameInfo): Promise<GameStatus> {
  if (!game.hasArchive || !game.launchDate) {
    return {
      game,
      poolSize: 0,
      generatedAt: null,
      highestAssigned: 0,
      runway: 0,
      error: 'No archive support',
    };
  }

  try {
    const [poolData, highestAssigned] = await Promise.all([
      fetchPoolData(game.id),
      fetchHighestAssigned(game.id, game.launchDate),
    ]);

    const todayPuzzleNumber = getTodayPuzzleNumber(game.launchDate);
    const runway = highestAssigned + poolData.poolSize - todayPuzzleNumber;

    return {
      game,
      poolSize: poolData.poolSize,
      generatedAt: poolData.generatedAt,
      highestAssigned,
      runway,
    };
  } catch (error) {
    return {
      game,
      poolSize: 0,
      generatedAt: null,
      highestAssigned: 0,
      runway: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function GameStatusCard({ status }: { status: GameStatus }) {
  const urgency = getUrgencyLevel(status.runway);
  const urgencyColor = getUrgencyColor(urgency);

  const debugUrl = `/${status.game.id}/debug`;

  return (
    <div
      className="bg-[var(--card-bg)] rounded-lg p-4 border-2"
      style={{ borderColor: status.game.accentColor }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: status.game.accentColor }}
        />
        <h3 className="font-bold text-lg">{status.game.name}</h3>
      </div>

      {status.error ? (
        <div className="text-[var(--muted)] text-sm">{status.error}</div>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Pool Size:</span>
            <span className="font-medium">{status.poolSize}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--muted)]">Assigned:</span>
            <span className="font-medium">1-{status.highestAssigned}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--muted)]">Runway:</span>
            <span
              className="font-bold"
              style={{ color: urgencyColor }}
            >
              {status.runway} days
            </span>
          </div>
          {status.generatedAt && (
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Generated:</span>
              <span className="font-medium text-xs">
                {new Date(status.generatedAt).toLocaleDateString()}
              </span>
            </div>
          )}

          <div className="pt-2">
            <a href={debugUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="secondary" size="sm" className="w-full">
                Debug Page
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function CommandsSection() {
  const archiveGames = GAMES.filter((g) => g.hasArchive);

  return (
    <div className="bg-[var(--card-bg)] rounded-lg p-4 mt-8">
      <h2 className="font-bold text-lg mb-4">Generate More Puzzles</h2>
      <div className="space-y-4">
        {archiveGames.map((game) => (
          <div key={game.id} className="space-y-1">
            <div className="text-sm text-[var(--muted)]">{game.name}:</div>
            <code className="block text-xs bg-[var(--background)] p-2 rounded font-mono">
              npm run generate-puzzles -w @grid-games/{game.id}
            </code>
            <code className="block text-xs bg-[var(--background)] p-2 rounded font-mono">
              npm run assign-puzzles -w @grid-games/{game.id}
            </code>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PuzzleDashboard() {
  const [isAllowed, setIsAllowed] = useState<boolean | null>(null);
  const [statuses, setStatuses] = useState<GameStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayPuzzleNumber, setTodayPuzzleNumber] = useState(0);

  useEffect(() => {
    const allowed = isLocalhost();
    setIsAllowed(allowed);

    if (!allowed) {
      setIsLoading(false);
      return;
    }

    // Calculate today's puzzle number (using a common launch date)
    const commonLaunch = '2026-02-01';
    setTodayPuzzleNumber(getTodayPuzzleNumber(commonLaunch));

    // Fetch status for all archive games
    const archiveGames = GAMES.filter((g) => g.hasArchive);
    Promise.all(archiveGames.map(fetchGameStatus)).then((results) => {
      setStatuses(results);
      setIsLoading(false);
    });
  }, []);

  // Not allowed (not localhost)
  if (isAllowed === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] text-center p-4">
        <div className="text-2xl font-bold text-[var(--danger)] mb-4">
          Not Available
        </div>
        <div className="text-[var(--muted)]">
          Admin dashboard is only available on localhost.
        </div>
      </div>
    );
  }

  // Loading
  if (isLoading || isAllowed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="text-xl text-[var(--foreground)]">Loading puzzle status...</div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Puzzle Status Dashboard</h1>
          <div className="text-[var(--muted)]">
            {today} (Puzzle #{todayPuzzleNumber})
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statuses.map((status) => (
            <GameStatusCard key={status.game.id} status={status} />
          ))}
        </div>

        <CommandsSection />
      </div>
    </div>
  );
}
