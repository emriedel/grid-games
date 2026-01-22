'use client';

import { useState } from 'react';
import type { Word } from '@/types';

interface ShareModalProps {
  date: string;
  words: Word[];
  totalScore: number;
  allLettersUsed: boolean;
  allLettersBonus: number;
  onClose: () => void;
}

export function ShareModal({ date, words, totalScore, allLettersUsed, allLettersBonus, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  // Format date for display
  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Generate share text
  const generateShareText = () => {
    const lines = [
      `Dabble ${displayDate}`,
      `Score: ${totalScore}${allLettersUsed ? ' (includes +' + allLettersBonus + ' bonus!)' : ''}`,
      '',
      ...words.map((w) => `${w.word} (${w.score})`),
      ...(allLettersUsed ? [`All letters bonus (+${allLettersBonus})`] : []),
      '',
      'Play at: [URL]', // Replace with actual URL when deployed
    ];
    return lines.join('\n');
  };

  // Generate emoji grid representation of the score
  const generateEmojiShare = () => {
    const scoreBlocks = Math.min(10, Math.ceil(totalScore / 20));
    const blocks = '🟨'.repeat(scoreBlocks) + '⬛'.repeat(10 - scoreBlocks);

    const lines = [
      `Dabble ${displayDate}`,
      `Score: ${totalScore} | ${words.length} words${allLettersUsed ? ' | All letters used!' : ''}`,
      blocks,
      '',
      'Play at: [URL]',
    ];
    return lines.join('\n');
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const text = generateEmojiShare();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Dabble ${displayDate}`,
          text,
        });
      } catch {
        // User cancelled or share failed, fall back to copy
        handleCopy(text);
      }
    } else {
      handleCopy(text);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-800 rounded-xl max-w-sm w-full p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold mb-1">Great job!</h2>
          <p className="text-neutral-400">{displayDate}</p>
        </div>

        {/* Score summary */}
        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-amber-400 mb-2">{totalScore}</div>
          <div className="text-neutral-400">
            {words.length} word{words.length !== 1 ? 's' : ''}
          </div>
          {allLettersUsed && (
            <div className="mt-2 text-green-400 font-semibold">
              All letters used! +{allLettersBonus} bonus
            </div>
          )}
        </div>

        {/* Word breakdown */}
        <div className="bg-neutral-900 rounded-lg p-4 mb-6 max-h-40 overflow-y-auto">
          <div className="space-y-1">
            {words.map((word, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="font-medium">{word.word}</span>
                <span className="text-amber-400">{word.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Share buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleShare}
            className="w-full py-3 px-4 rounded-lg font-bold text-base
              bg-amber-500 text-neutral-900 hover:bg-amber-400
              transition-colors flex items-center justify-center gap-2"
          >
            {copied ? 'Copied!' : 'Share Results'}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>

          <button
            onClick={() => handleCopy(generateShareText())}
            className="w-full py-3 px-4 rounded-lg font-semibold text-sm
              bg-neutral-700 hover:bg-neutral-600
              transition-colors"
          >
            Copy Detailed Results
          </button>

          <button
            onClick={onClose}
            className="w-full py-2 px-4 rounded-lg text-sm text-neutral-400
              hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
