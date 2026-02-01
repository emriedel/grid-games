import { Suspense } from 'react';
import Game from '@/components/Game';

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-xl text-[var(--foreground)]">Loading...</div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<Loading />}>
      <Game />
    </Suspense>
  );
}
