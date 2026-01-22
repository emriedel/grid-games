import { Suspense } from 'react';
import { Game } from '@/components/Game';

function GameLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-900">
      <div className="text-white text-lg">Loading puzzle...</div>
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
