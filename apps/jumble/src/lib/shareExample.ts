/**
 * Generate an example share text for Jumble
 * Used by the dev share preview page
 */
export function generateShareExample(): string {
  // Example data matching actual share format
  const score = 47;
  const wordCounts = {
    3: 8,
    4: 5,
    5: 3,
    6: 1,
    7: 0,
  };

  const numberEmojis: Record<number, string> = {
    3: '3️⃣',
    4: '4️⃣',
    5: '5️⃣',
    6: '6️⃣',
    7: '7️⃣',
  };

  const counts: string[] = [];
  for (let len = 3; len <= 6; len++) {
    counts.push(`${numberEmojis[len]}: ${wordCounts[len as keyof typeof wordCounts]}`);
  }
  if (wordCounts[7] > 0) {
    counts.push(`${numberEmojis[7]}+: ${wordCounts[7]}`);
  }

  return [
    'Jumble',
    `Score: ${score} pts`,
    counts.join(' | '),
    '',
    'https://nerdcube.games/jumble',
  ].join('\n');
}
