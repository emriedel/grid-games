/**
 * Shared Mixpanel analytics utilities for Nerdcube Games
 *
 * Events tracked:
 * - game_start: When a game starts (new or resumed)
 * - game_complete: When a game finishes
 * - game_share: When results are shared/copied
 */

import mixpanel from 'mixpanel-browser';

let isInitialized = false;

/**
 * Initialize Mixpanel analytics (call from Providers.tsx in each app)
 * Safe to call multiple times - will only initialize once
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (isInitialized) return;

  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token) {
    // No token configured - analytics disabled
    return;
  }

  mixpanel.init(token, {
    track_pageview: true,
    persistence: 'localStorage',
    // Proxy through our domain to avoid ad blockers
    api_host: '/mp',
  });

  isInitialized = true;
}

// Type definitions for analytics events

export interface GameStartEvent {
  game: string;
  puzzleNumber: number;
  puzzleId?: string;
  isArchive: boolean;
  isResume: boolean;
}

export interface GameCompleteEvent {
  game: string;
  puzzleNumber: number;
  puzzleId?: string;
  isArchive: boolean;
  // Game-specific score fields (allowed via index signature)
  [key: string]: unknown;
}

export type ShareMethod = 'share' | 'clipboard';

/**
 * Track when a game starts
 */
export function trackGameStart(event: GameStartEvent): void {
  if (!isInitialized) return;
  mixpanel.track('game_start', event);
}

/**
 * Track when a game completes
 */
export function trackGameComplete(event: GameCompleteEvent): void {
  if (!isInitialized) return;
  mixpanel.track('game_complete', event);
}

/**
 * Track when results are shared
 */
export function trackShare(
  game: string,
  puzzleNumber: number,
  method: ShareMethod
): void {
  if (!isInitialized) return;
  mixpanel.track('game_share', { game, puzzleNumber, method });
}

/**
 * Track when a user clicks on a game from the homepage
 */
export function trackGameClick(game: string): void {
  if (!isInitialized) return;
  mixpanel.track('game_click', { game });
}
