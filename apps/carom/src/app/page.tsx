import { Suspense } from 'react';
import { Game } from '@/components/Game';

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <Game />
    </Suspense>
  );
}
