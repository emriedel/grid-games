import { Suspense } from 'react';
import { PuzzleDashboard } from './PuzzleDashboard';

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-xl text-[var(--foreground)]">Loading dashboard...</div>
    </div>
  );
}

export default function AdminPuzzlesPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PuzzleDashboard />
    </Suspense>
  );
}
