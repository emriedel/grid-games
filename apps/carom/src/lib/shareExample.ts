/**
 * Generate an example share text for Carom
 * Used by the dev share preview page
 */
export function generateShareExample(): string {
  const puzzleNumber = 2;
  const moveCount: number = 14;
  const moveSequence = '⬆️➡️⬇️⬅️⬆️➡️⬇️⬆️➡️⬅️⬆️➡️⬅️⬇️';

  const movesText = moveCount === 1 ? 'move' : 'moves';

  return [
    `Carom #${puzzleNumber}`,
    moveSequence,
    `${moveCount} ${movesText}`,
    '',
    'https://nerdcube.games/carom',
  ].join('\n');
}
