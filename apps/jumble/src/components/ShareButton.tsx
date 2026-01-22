'use client';

import { useState } from 'react';
import { generatePerformanceBar, formatTime } from '@/lib/scoring';
import { TIMER_DURATION } from '@/constants/gameConfig';

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
    const performanceBar = generatePerformanceBar(wordsFound, totalPossibleWords);
    const shareText = `Jumble #${puzzleNumber} 🔤
⏱️ ${formatTime(TIMER_DURATION)}
📝 ${wordsFound} words
⭐ ${score} points

${performanceBar}`;

    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
        });
        return;
      } catch {
        // User cancelled or share failed, fall through to clipboard
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="
        px-6 py-3 rounded-lg font-bold text-lg
        bg-[var(--accent)] hover:opacity-90
        transition-opacity
      "
    >
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}
