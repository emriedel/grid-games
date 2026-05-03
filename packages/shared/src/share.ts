/**
 * Shared interface for building share text
 * Each game controls its specific content (emoji grid, stats)
 * but the pipeline structure stays consistent
 */
export interface ShareInput {
  /** Game identifier (e.g., 'dabble', 'jumble') */
  gameId: string;
  /** Display name for the game */
  gameName: string;
  /** Puzzle identifier (number or date string) */
  puzzleId: string | number;
  /** Primary score or result (can include suffix like medal emoji) */
  score: number | string;
  /** Optional max possible score (for percentage display) */
  maxScore?: number;
  /** Game-specific emoji grid or bar representation */
  emojiGrid: string;
  /** Additional lines to include (game-specific stats) */
  extraLines?: string[];
  /** Optional URL to include */
  shareUrl?: string;
}

/**
 * Build consistent share text from game input
 * Structure: Header → Stats → Emoji → URL
 */
export function buildShareText(input: ShareInput): string {
  const lines: string[] = [];

  // Header: Game name and puzzle ID
  const puzzleLabel = typeof input.puzzleId === 'number'
    ? `#${input.puzzleId}`
    : input.puzzleId;
  lines.push(`${input.gameName} ${puzzleLabel}`);

  // Score line
  if (input.maxScore && typeof input.score === 'number') {
    const percentage = Math.round((input.score / input.maxScore) * 100);
    lines.push(`Score: ${input.score}/${input.maxScore} (${percentage}%)`);
  } else {
    lines.push(`Score: ${input.score}`);
  }

  // Extra lines (game-specific stats)
  if (input.extraLines && input.extraLines.length > 0) {
    lines.push(...input.extraLines);
  }

  // Emoji grid/bar
  lines.push(input.emojiGrid);

  // URL if provided
  if (input.shareUrl) {
    lines.push('');
    lines.push(input.shareUrl);
  }

  return lines.join('\n');
}

/**
 * Generate a performance bar using emoji
 * Useful for score visualization in shares
 */
export function generateEmojiBar(
  current: number,
  max: number,
  options: {
    length?: number;
    filledEmoji?: string;
    emptyEmoji?: string;
  } = {}
): string {
  const { length = 10, filledEmoji = '🟩', emptyEmoji = '⬜' } = options;
  const filled = Math.round((current / max) * length);
  const empty = length - filled;
  return filledEmoji.repeat(filled) + emptyEmoji.repeat(empty);
}

/**
 * Detect mobile device. Web Share API on desktop (especially Windows) opens the
 * OS share dialog and surfaces email apps as the primary target, which is a poor
 * UX for sharing puzzle results — desktop users expect a clipboard copy.
 */
function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const uaData = (navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  }).userAgentData;
  if (typeof uaData?.mobile === 'boolean') return uaData.mobile;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Share via native share API or fallback to clipboard
 * Returns true if shared/copied successfully
 */
export async function shareOrCopy(
  text: string,
  url?: string,
): Promise<{ success: boolean; method: 'share' | 'clipboard' }> {
  // Native share only on mobile — desktop share sheets (esp. Windows) are bad UX
  if (typeof navigator !== 'undefined' && navigator.share && isMobileDevice()) {
    try {
      await navigator.share(url ? { text, url } : { text });
      return { success: true, method: 'share' };
    } catch {
      // User cancelled or share failed, fall through to clipboard
    }
  }

  // Fallback to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, method: 'clipboard' };
    } catch {
      // Clipboard failed
    }
  }

  // Last resort: textarea hack
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return { success: true, method: 'clipboard' };
    } catch {
      // Everything failed
    }
  }

  return { success: false, method: 'clipboard' };
}
