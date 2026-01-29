'use client';

import { useState } from 'react';
import { Button } from '@grid-games/ui';
import { shareOrCopy } from '@grid-games/shared';
import { FoundWord } from '@/types';

interface ShareButtonProps {
  wordsFound: number;
  totalPossibleWords: number;
  score: number;
  foundWords: FoundWord[];
}

// Number to keycap emoji mapping
const numberEmojis: Record<number, string> = {
  3: '3️⃣',
  4: '4️⃣',
  5: '5️⃣',
  6: '6️⃣',
  7: '7️⃣',
  8: '8️⃣',
  9: '9️⃣',
};

export default function ShareButton({
  wordsFound,
  totalPossibleWords,
  score,
  foundWords,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Group found words by length
    const wordsByLength: Record<number, number> = {};
    for (const fw of foundWords) {
      const len = fw.word.length;
      wordsByLength[len] = (wordsByLength[len] || 0) + 1;
    }

    // Format counts with number emojis, only include lengths with words found
    const counts: string[] = [];
    for (let len = 3; len <= 6; len++) {
      if (wordsByLength[len]) {
        counts.push(`${numberEmojis[len]}: ${wordsByLength[len]}`);
      }
    }

    // 7+ letter words
    const sevenPlus = Object.entries(wordsByLength)
      .filter(([len]) => parseInt(len) >= 7)
      .reduce((sum, [, count]) => sum + count, 0);
    if (sevenPlus > 0) {
      counts.push(`${numberEmojis[7]}+: ${sevenPlus}`);
    }

    const shareText = [
      'Jumble',
      `Score: ${score} pts`,
      counts.join(' | '),
      '',
      'games.ericriedel.dev/jumble',
    ].join('\n');

    const result = await shareOrCopy(shareText);
    if (result.success && result.method === 'clipboard') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button variant="primary" size="lg" onClick={handleShare}>
      {copied ? 'Copied!' : 'Share'}
    </Button>
  );
}
