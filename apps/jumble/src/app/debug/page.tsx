import { Suspense } from 'react';
import { DebugPageContent } from '@/components/DebugPageContent';

export default function DebugPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
          <div className="text-xl text-[var(--foreground)]">Loading...</div>
        </div>
      }
    >
      <DebugPageContent />
    </Suspense>
  );
}
