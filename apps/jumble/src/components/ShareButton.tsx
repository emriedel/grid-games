'use client';

import { useState } from 'react';
import { Button } from '@grid-games/ui';
import { buildShareText, shareOrCopy, generateEmojiBar } from '@grid-games/shared';
import { TIMER_DURATION } from '@/constants/gameConfig';
import { formatTime } from '@/lib/scoring';

interface ShareButtonProps {
  puzzleNumber: number;
  wordsFound: number;
  totalPossibleWords: number;
  score: number;
}

export default function ShareButton({
  puzzleNumber,
  wordsFound,
  totalPossibleWords,
  score,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const emojiGrid = generateEmojiBar(wordsFound, totalPossibleWords, {
      filledEmoji: '🟩',
      emptyEmoji: '⬜',
    });

    const shareText = buildShareText({
      gameId: 'jumble',
      gameName: 'Jumble',
      puzzleId: puzzleNumber,
      score,
      maxScore: undefined,
      emojiGrid,
      extraLines: [
        `${formatTime(TIMER_DURATION)}`,
        `${wordsFound} of ${totalPossibleWords} words`,
      ],
      shareUrl: 'https://games.ericriedel.dev/jumble',
    });

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
