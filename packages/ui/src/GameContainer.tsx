'use client';

import type { ReactNode } from 'react';

interface GameContainerProps {
  children: ReactNode;
  /** Optional nav bar component */
  navBar?: ReactNode;
  /** Max width constraint */
  maxWidth?: 'sm' | 'md' | 'lg';
  /** Additional classes */
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-xs',   // 320px
  md: 'max-w-sm',   // 384px
  lg: 'max-w-md',   // 448px
};

/**
 * Container for game content
 * Provides consistent layout, centering, and safe area handling
 */
export function GameContainer({
  children,
  navBar,
  maxWidth = 'md',
  className = '',
}: GameContainerProps) {
  return (
    <div className="min-h-screen bg-[var(--background,#0a0a0a)] text-[var(--foreground,#ededed)] flex flex-col">
      {navBar}
      <main
        className={`
          flex-1 flex flex-col items-center
          w-full ${maxWidthClasses[maxWidth]} mx-auto
          px-4 py-4
          ${className}
        `}
      >
        {children}
      </main>
    </div>
  );
}
