'use client';

import { BugReporterProvider } from '@grid-games/ui';
import { initAnalytics } from '@grid-games/shared';
import { useEffect, type ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <BugReporterProvider apiEndpoint="/api/feedback">
      {children}
    </BugReporterProvider>
  );
}
