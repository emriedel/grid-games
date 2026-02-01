import { buildShareText, formatDisplayDate } from '@grid-games/shared';

/**
 * Generate an example share text for Dabble
 * Used by the dev share preview page
 */
export function generateShareExample(): string {
  const displayDate = formatDisplayDate(new Date());
  const lettersUsed = 12;
  const totalLetters = 14;
  const score = 127;

  const letterGrid = '🟨'.repeat(lettersUsed) + '⬛'.repeat(totalLetters - lettersUsed);
  const emojiGrid = `${letterGrid} (${lettersUsed}/${totalLetters})`;

  return buildShareText({
    gameId: 'dabble',
    gameName: 'Dabble',
    puzzleId: displayDate,
    score,
    emojiGrid,
    extraLines: ['+10 letter bonus!'],
    shareUrl: 'https://nerdcube.games/dabble',
  });
}
