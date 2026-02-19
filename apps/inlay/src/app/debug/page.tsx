import { Suspense } from 'react';
import { DebugPageContent } from '@/components/DebugPageContent';

export default function DebugPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <DebugPageContent />
    </Suspense>
  );
}
