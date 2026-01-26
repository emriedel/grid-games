import { Suspense } from 'react';
import { Game } from '@/components/Game';
import { Skeleton } from '@grid-games/ui';

function GameLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="text-center space-y-4">
        <Skeleton className="w-16 h-16 rounded-full mx-auto" />
        <Skeleton className="w-32 h-6 mx-auto" />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<GameLoading />}>
      <Game />
    </Suspense>
  );
}
