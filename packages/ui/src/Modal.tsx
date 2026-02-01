'use client';

import { useEffect, useCallback, type ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Optional title displayed in header */
  title?: string;
  /** Modal width variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show close button in header (default: true when title is provided) */
  showCloseButton?: boolean;
  /** Additional classes for the modal card */
  className?: string;
  /** Whether clicking the backdrop closes the modal (default: true) */
  closeOnBackdrop?: boolean;
  /** Whether pressing Escape closes the modal (default: true) */
  closeOnEscape?: boolean;
}

const sizeClasses = {
  sm: 'max-w-xs', // 320px
  md: 'max-w-sm', // 384px
  lg: 'max-w-md', // 448px
};

/**
 * Shared modal container component
 * Provides: overlay, centering, escape handling, backdrop click
 * Game-specific content goes in children
 */
export function Modal({
  isOpen,
  onClose,
  children,
  title,
  size = 'md',
  showCloseButton,
  className = '',
  closeOnBackdrop = true,
  closeOnEscape = true,
}: ModalProps) {
  // Default showCloseButton to true when title is provided
  const shouldShowCloseButton = showCloseButton ?? !!title;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={closeOnBackdrop ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`
          bg-[var(--background,#0a0a0a)] rounded-xl
          border border-[var(--border,#27272a)] shadow-xl shadow-black/50
          ${sizeClasses[size]} w-full mx-4 max-h-[90vh] overflow-y-auto
          ${className}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border,#27272a)]">
            <h2 className="text-lg font-semibold text-[var(--foreground,#ededed)]">
              {title}
            </h2>
            {shouldShowCloseButton && (
              <button
                onClick={onClose}
                className="text-[var(--muted,#a1a1aa)] hover:text-[var(--foreground,#ededed)] transition-colors p-1 -mr-1"
                aria-label="Close modal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}
        {title ? (
          <div className="p-6">{children}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
