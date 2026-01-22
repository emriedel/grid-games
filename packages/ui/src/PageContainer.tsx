import { type ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  /** Additional classes */
  className?: string;
  /** Max width constraint (default: max-w-md) */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const maxWidthStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full',
};

/**
 * Shared page container with consistent padding and max-width
 */
export function PageContainer({
  children,
  className = '',
  maxWidth = 'md',
}: PageContainerProps) {
  return (
    <div
      className={`
        min-h-screen
        bg-[var(--background,#0a0a0a)] text-[var(--foreground,#ededed)]
        ${className}
      `}
    >
      <div className={`mx-auto ${maxWidthStyles[maxWidth]} px-4 py-4`}>
        {children}
      </div>
    </div>
  );
}
