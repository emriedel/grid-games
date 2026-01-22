import { SCORING_TABLE } from '@/constants/gameConfig';
import { FoundWord } from '@/types';

// Get the effective length of a word (counting QU as 2 letters)
export function getWordLength(word: string): number {
  // The word is stored with "QU" as a single unit, so we need to count properly
  let length = 0;
  for (let i = 0; i < word.length; i++) {
    if (word[i] === 'Q' && i + 1 < word.length && word[i + 1] === 'U') {
      length += 2;
      i++; // Skip the U
    } else {
      length += 1;
    }
  }
  return length;
}

// Calculate score for a single word
export function calculateWordScore(word: string): number {
  const length = getWordLength(word);

  // Find the highest scoring bracket at or below this length
  const scoringLengths = Object.keys(SCORING_TABLE)
    .map(Number)
    .sort((a, b) => b - a);

  for (const bracketLength of scoringLengths) {
    if (length >= bracketLength) {
      return SCORING_TABLE[bracketLength];
    }
  }

  return 0;
}

// Calculate total score for a list of found words
export function calculateTotalScore(foundWords: FoundWord[]): number {
  return foundWords.reduce((total, fw) => total + fw.score, 0);
}

// Calculate max possible score from all valid words
export function calculateMaxScore(words: string[]): number {
  return words.reduce((total, word) => total + calculateWordScore(word), 0);
}

// Generate performance bar for sharing (10 segments)
export function generatePerformanceBar(foundCount: number, totalCount: number): string {
  const percentage = totalCount > 0 ? foundCount / totalCount : 0;
  const filledSegments = Math.round(percentage * 10);
  const emptySegments = 10 - filledSegments;
  return '🟨'.repeat(filledSegments) + '⬜'.repeat(emptySegments);
}

// Format time as M:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
