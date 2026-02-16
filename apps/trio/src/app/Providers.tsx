'use client';

import { BugReporterProvider, ToastProvider } from '@grid-games/ui';
import { type ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

// In development, each game runs on different ports but the API is on port 3000
// In production, all games are on the same domain so relative URLs work
const API_ENDPOINT = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000/api/feedback'
  : '/api/feedback';

export function Providers({ children }: ProvidersProps) {
  return (
    <BugReporterProvider apiEndpoint={API_ENDPOINT}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </BugReporterProvider>
  );
}
