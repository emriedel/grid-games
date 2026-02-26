'use client';

import { BugReporterProvider, ToastProvider } from '@grid-games/ui';
import { initAnalytics } from '@grid-games/shared';
import { useEffect, type ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

// In development, each game runs on different ports but the API is on port 3000
// In production, all games are on the same domain so relative URLs work
const API_ENDPOINT = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000/api/feedback'
  : '/api/feedback';

export function Providers({ children }: ProvidersProps) {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <ToastProvider topOffset="top-20">
      <BugReporterProvider apiEndpoint={API_ENDPOINT}>
        {children}
      </BugReporterProvider>
    </ToastProvider>
  );
}
