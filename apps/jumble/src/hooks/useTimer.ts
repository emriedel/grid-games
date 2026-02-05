'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerReturn {
  timeRemaining: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (newDuration?: number) => void;
  setTime: (time: number) => void;
}

export function useTimer(initialDuration: number, onComplete?: () => void): UseTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onCompleteRef = useRef(onComplete);
  const wasRunningBeforeHidden = useRef(false);

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Timer effect
  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            onCompleteRef.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining]);

  // Pause timer when tab becomes hidden, resume when visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is now hidden - pause timer
        if (isRunning) {
          wasRunningBeforeHidden.current = true;
          setIsRunning(false);
        }
      } else {
        // Tab is now visible - resume if it was running
        if (wasRunningBeforeHidden.current && timeRemaining > 0) {
          setIsRunning(true);
        }
        wasRunningBeforeHidden.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRunning, timeRemaining]);

  const start = useCallback(() => {
    if (timeRemaining > 0) {
      setIsRunning(true);
    }
  }, [timeRemaining]);

  const pause = useCallback(() => {
    setIsRunning(false);
    wasRunningBeforeHidden.current = false;
  }, []);

  const reset = useCallback((newDuration?: number) => {
    setIsRunning(false);
    wasRunningBeforeHidden.current = false;
    setTimeRemaining(newDuration ?? initialDuration);
  }, [initialDuration]);

  // Set time directly (for restoring from saved state)
  const setTime = useCallback((time: number) => {
    setTimeRemaining(time);
  }, []);

  return {
    timeRemaining,
    isRunning,
    start,
    pause,
    reset,
    setTime,
  };
}
