'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  /** Key to listen for (e.g., 'Escape', 'Enter', 'a') */
  key: string;
  /** Handler function */
  handler: () => void;
  /** Whether to check for Ctrl/Cmd key */
  ctrl?: boolean;
  /** Whether to check for Shift key */
  shift?: boolean;
  /** Whether to check for Alt key */
  alt?: boolean;
}

/**
 * Hook for keyboard shortcuts
 * Automatically disabled when focus is on inputs/textareas
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = e.key === shortcut.key;
        const ctrlMatch = !shortcut.ctrl || (e.ctrlKey || e.metaKey);
        const shiftMatch = !shortcut.shift || e.shiftKey;
        const altMatch = !shortcut.alt || e.altKey;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.handler();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
