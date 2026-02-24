'use client';

import { useEffect } from 'react';

/**
 * Reference count for body scroll locks.
 * Multiple components can lock scroll simultaneously,
 * and scroll will only be unlocked when all locks are released.
 */
let lockCount = 0;

/**
 * Hook to manage body scroll locking with reference counting.
 * Prevents conflicts when multiple components (e.g., Modal and HamburgerMenu)
 * both try to lock/unlock body scroll independently.
 *
 * On iOS Safari PWA, conflicting scroll lock management can cause
 * touch input to freeze when components unmount in the wrong order.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    lockCount++;
    if (lockCount === 1) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = '';
      }
    };
  }, [isLocked]);
}
