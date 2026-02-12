'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastProviderProps {
  children: ReactNode;
  /** Position of toasts */
  position?: 'top' | 'bottom';
  /** Auto-dismiss duration in ms */
  duration?: number;
}

/**
 * Provider for toast notifications
 * Wrap your app with this to enable useToast()
 */
export function ToastProvider({
  children,
  position = 'top',
  duration = 3000,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastContainer
        toasts={toasts}
        position={position}
        duration={duration}
        onDismiss={dismiss}
      />
    </ToastContext.Provider>
  );
}

/**
 * Hook to show toast notifications
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastContainerProps {
  toasts: Toast[];
  position: 'top' | 'bottom';
  duration: number;
  onDismiss: (id: string) => void;
}

function ToastContainer({
  toasts,
  position,
  duration,
  onDismiss,
}: ToastContainerProps) {
  // top-16 (64px) clears typical nav headers
  const positionClasses = position === 'top' ? 'top-16' : 'bottom-20';

  return (
    <div
      className={`fixed ${positionClasses} left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none`}
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          duration={duration}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  duration: number;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, duration, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 200);

    const dismissTimer = setTimeout(() => {
      onDismiss(toast.id);
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, duration, onDismiss]);

  const typeClasses = {
    success: 'bg-[var(--success,#22c55e)]',
    error: 'bg-[var(--danger,#ef4444)]',
    info: 'bg-[var(--accent)]',
  };

  return (
    <div
      className={`
        px-4 py-2 rounded-lg shadow-lg pointer-events-auto
        ${typeClasses[toast.type]}
        text-white font-medium text-sm
        transform transition-all duration-200
        ${isExiting ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}
      `}
    >
      {toast.message}
    </div>
  );
}
