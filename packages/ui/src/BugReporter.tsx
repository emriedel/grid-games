'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
  type ChangeEvent,
} from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface BugContext {
  url: string;
  userAgent: string;
  viewport: string;
  timestamp: string;
  devicePixelRatio: number;
  touchEnabled: boolean;
  screenshot?: string;
  consoleErrors?: string[];
}

// Buffer to store recent console errors (max 10)
const consoleErrorBuffer: string[] = [];
const MAX_CONSOLE_ERRORS = 10;

interface BugReporterContextValue {
  open: () => void;
}

const BugReporterContext = createContext<BugReporterContextValue | null>(null);

interface BugReporterProviderProps {
  children: ReactNode;
  /** API endpoint to POST bug reports to */
  apiEndpoint?: string;
}

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Provider for bug reporter modal
 * Wrap your app with this to enable useBugReporter()
 */
export function BugReporterProvider({
  children,
  apiEndpoint = '/api/feedback',
}: BugReporterProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [context, setContext] = useState<BugContext | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Set up console error capture on mount
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      // Store error in buffer
      const errorStr = args
        .map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg)))
        .join(' ');
      consoleErrorBuffer.push(`[${new Date().toISOString()}] ${errorStr}`);
      // Keep only last N errors
      if (consoleErrorBuffer.length > MAX_CONSOLE_ERRORS) {
        consoleErrorBuffer.shift();
      }
      // Call original
      originalError.apply(console, args);
    };

    // Also capture unhandled errors
    const handleError = (event: ErrorEvent) => {
      const errorStr = `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
      consoleErrorBuffer.push(`[${new Date().toISOString()}] [Uncaught] ${errorStr}`);
      if (consoleErrorBuffer.length > MAX_CONSOLE_ERRORS) {
        consoleErrorBuffer.shift();
      }
    };

    window.addEventListener('error', handleError);

    return () => {
      console.error = originalError;
      window.removeEventListener('error', handleError);
    };
  }, []);

  const captureContext = useCallback(() => {
    setContext({
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      timestamp: new Date().toISOString(),
      devicePixelRatio: window.devicePixelRatio || 1,
      touchEnabled: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      consoleErrors: consoleErrorBuffer.length > 0 ? [...consoleErrorBuffer] : undefined,
    });
  }, []);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setDescription('');
    setScreenshot(null);
    setSubmitStatus('idle');
    setErrorMessage('');
    captureContext();
  }, [captureContext]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setContext(null);
    setScreenshot(null);
    setDescription('');
    setSubmitStatus('idle');
  }, []);

  const handleScreenshotChange = useCallback((file: File | null) => {
    if (!file) {
      setScreenshot(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setScreenshot(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) {
      setErrorMessage('Please describe the bug');
      setSubmitStatus('error');
      return;
    }

    setSubmitStatus('submitting');
    setErrorMessage('');

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bug',
          message: description.trim(),
          context: context ? { ...context, screenshot } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit bug report');
      }

      setSubmitStatus('success');
    } catch {
      setSubmitStatus('error');
      setErrorMessage('Failed to submit. Please try again.');
    }
  }, [apiEndpoint, description, context, screenshot]);

  return (
    <BugReporterContext.Provider value={{ open: handleOpen }}>
      {children}
      <BugReporterModal
        isOpen={isOpen}
        onClose={handleClose}
        description={description}
        onDescriptionChange={setDescription}
        context={context}
        screenshot={screenshot}
        onScreenshotChange={handleScreenshotChange}
        submitStatus={submitStatus}
        errorMessage={errorMessage}
        onSubmit={handleSubmit}
      />
    </BugReporterContext.Provider>
  );
}

/**
 * Hook to open the bug reporter modal
 */
export function useBugReporter(): BugReporterContextValue {
  const context = useContext(BugReporterContext);
  if (!context) {
    throw new Error('useBugReporter must be used within a BugReporterProvider');
  }
  return context;
}

interface BugReporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  context: BugContext | null;
  screenshot: string | null;
  onScreenshotChange: (file: File | null) => void;
  submitStatus: SubmitStatus;
  errorMessage: string;
  onSubmit: () => void;
}

function BugReporterModal({
  isOpen,
  onClose,
  description,
  onDescriptionChange,
  context,
  screenshot,
  onScreenshotChange,
  submitStatus,
  errorMessage,
  onSubmit,
}: BugReporterModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onScreenshotChange(file);
  };

  const handleRemoveScreenshot = () => {
    onScreenshotChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (submitStatus === 'success') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Bug Report" size="md">
        <div className="text-center py-4">
          <div className="text-4xl mb-4">&#10003;</div>
          <h3 className="text-lg font-semibold mb-2">Report Submitted</h3>
          <p className="text-[var(--muted,#a1a1aa)] text-sm mb-4">
            Thanks for helping improve Nerdcube Games!
          </p>
          <Button onClick={onClose} fullWidth>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report a Bug" size="md">
      <div className="space-y-4">
        {/* Description */}
        <div>
          <label
            htmlFor="bug-description"
            className="block text-sm font-medium mb-1.5 text-[var(--muted,#a1a1aa)]"
          >
            What went wrong?
          </label>
          <textarea
            id="bug-description"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe the bug..."
            rows={4}
            className="w-full bg-[var(--tile-bg,#1a1a2e)] border border-[var(--border,#27272a)] rounded-lg px-4 py-3 text-[var(--foreground,#ededed)] placeholder:text-[var(--muted,#a1a1aa)] focus:outline-none focus:border-[var(--foreground,#ededed)] resize-none"
            autoFocus
          />
        </div>

        {/* Screenshot upload */}
        <div>
          <p className="text-sm font-medium mb-1.5 text-[var(--muted,#a1a1aa)]">
            Screenshot <span className="font-normal">(optional)</span>
          </p>
          {screenshot ? (
            <div className="bg-[var(--tile-bg,#1a1a2e)] border border-[var(--border,#27272a)] rounded-lg p-2">
              <img
                src={screenshot}
                alt="Screenshot"
                className="w-full rounded border border-[var(--border,#27272a)]"
              />
              <button
                type="button"
                onClick={handleRemoveScreenshot}
                className="mt-2 text-sm text-[var(--muted,#a1a1aa)] hover:text-[var(--foreground,#ededed)] underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="block bg-[var(--tile-bg,#1a1a2e)] border border-dashed border-[var(--border,#27272a)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--muted,#a1a1aa)] transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <p className="text-[var(--muted,#a1a1aa)] text-sm">
                Click to upload a screenshot
              </p>
            </label>
          )}
        </div>

        {/* Context info */}
        {context && (
          <div className="text-xs text-[var(--muted,#a1a1aa)] space-y-0.5">
            <p>URL: {context.url}</p>
            <p>Viewport: {context.viewport}</p>
          </div>
        )}

        {/* Error message */}
        {submitStatus === 'error' && errorMessage && (
          <p className="text-red-400 text-sm">{errorMessage}</p>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitStatus === 'submitting'}
            fullWidth
          >
            {submitStatus === 'submitting' ? 'Sending...' : 'Submit Report'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
