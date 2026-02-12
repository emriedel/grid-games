'use client';

import { BugReporterProvider } from '@grid-games/ui';
import { type ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <BugReporterProvider apiEndpoint="/api/feedback">
      {children}
    </BugReporterProvider>
  );
}
