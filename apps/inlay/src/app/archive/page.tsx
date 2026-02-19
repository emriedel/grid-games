import { Suspense } from 'react';
import { ArchivePageContent } from '@/components/ArchivePageContent';

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="text-[var(--foreground)] text-lg">Loading...</div>
    </div>
  );
}

export default function ArchivePage() {
  return (
    <Suspense fallback={<Loading />}>
      <ArchivePageContent />
    </Suspense>
  );
}
