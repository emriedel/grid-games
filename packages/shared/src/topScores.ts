/**
 * Top Scores API client
 *
 * Provides functions for fetching and submitting top scores.
 * This module is framework-agnostic (no React hooks).
 */

export interface TopScore {
  score: number;
  rank: number;
}

export interface SubmitScoreResult {
  isTopScore: boolean;
  rank: number | null;
  topScores: TopScore[];
}

// API base URL - production by default, can be overridden for local dev
const getApiBaseUrl = (): string => {
  // Check for explicit override
  if (typeof window !== 'undefined') {
    const envUrl = (window as { __SCORES_API_URL__?: string }).__SCORES_API_URL__;
    if (envUrl) return envUrl;
  }

  // In development, use localhost if we're on a dev port
  if (typeof window !== 'undefined') {
    const port = parseInt(window.location.port, 10);
    // Game apps run on ports 3001-3010 in dev, web runs on 3000
    if (port >= 3001 && port <= 3010) {
      return 'http://localhost:3000';
    }
    // If on port 3000 (web app), use relative URL
    if (port === 3000) {
      return '';
    }
  }

  // Production: use the production domain
  return 'https://nerdcube.games';
};

/**
 * Submit a score for a puzzle
 */
export async function submitScore(
  gameId: string,
  puzzleId: string,
  puzzleNumber: number,
  score: number
): Promise<SubmitScoreResult> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/scores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      gameId,
      puzzleId,
      puzzleNumber,
      score,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to submit score: ${response.status}`);
  }

  return response.json();
}

/**
 * Get top scores for a puzzle
 */
export async function getTopScores(
  gameId: string,
  puzzleId: string,
  limit: number = 3
): Promise<TopScore[]> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams({
    gameId,
    puzzleId,
    limit: limit.toString(),
  });

  const response = await fetch(`${baseUrl}/api/scores?${params}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to get top scores: ${response.status}`);
  }

  const data = await response.json();
  return data.topScores;
}
