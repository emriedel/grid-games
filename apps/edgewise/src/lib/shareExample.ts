import { buildShareText, formatDisplayDate } from '@grid-games/shared';

/**
 * Generate an example share text for Edgewise
 * Used by the dev share preview page
 */
export function generateShareExample(): string {
  const displayDate = formatDisplayDate(new Date());
  const guessesUsed = 3;
  const solved = true;

  // Example feedback history (3 guesses)
  const feedbackHistory = [
    [2, 0, 0, 2], // First guess: 2 correct
    [2, 2, 0, 2], // Second guess: 3 correct
    [2, 2, 2, 2], // Third guess: all correct
  ];

  const emojiGrid = feedbackHistory
    .map((feedback) =>
      feedback
        .map((val) => (val === 2 ? '🟢' : '⚪'))
        .join('')
    )
    .join('\n');

  return buildShareText({
    gameId: 'edgewise',
    gameName: 'Edgewise',
    puzzleId: displayDate,
    score: guessesUsed,
    maxScore: 4,
    emojiGrid,
    extraLines: [solved ? '🎉' : ''],
    shareUrl: 'https://nerdcube.games/edgewise',
  });
}
