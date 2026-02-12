import { Suspense } from 'react';
import { ReplayPageContent } from '@/components/ReplayPageContent';

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-xl text-[var(--foreground)]">Loading...</div>
    </div>
  );
}

export default function ReplayPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ReplayPageContent />
    </Suspense>
  );
}
