'use client';

import type { ReactNode } from 'react';

interface DebugPanelProps {
  children: ReactNode;
}

/**
 * Fixed debug panel for displaying dev-only information and controls
 * Purple styling to indicate debug functionality
 */
export function DebugPanel({ children }: DebugPanelProps) {
  return (
    <div className="fixed bottom-4 right-4 p-3 bg-purple-900/90 rounded-lg border border-purple-500 text-sm text-white space-y-2 z-50">
      {children}
    </div>
  );
}
