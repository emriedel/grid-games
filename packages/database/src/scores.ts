import { prisma } from './client';

export interface TopScore {
  score: number;
  rank: number;
}

export interface SubmitScoreResult {
  isTopScore: boolean;
  rank: number | null;
  topScores: TopScore[];
}

// Keep top N scores per puzzle as a buffer (handles ties, avoids edge cases)
const MAX_SCORES_PER_PUZZLE = 8;

/**
 * Submit a score for a puzzle and return whether it's a top score
 *
 * Uses a transaction to:
 * 1. Insert the new score
 * 2. Clean up scores outside top N to bound storage
 * 3. Return top 3 scores
 */
export async function submitScore(
  gameId: string,
  puzzleId: string,
  puzzleNumber: number,
  score: number
): Promise<SubmitScoreResult> {
  // Simple server-side validation with fixed maximum
  const MAX_ALLOWED_SCORE = 999;
  if (score < 0 || score > MAX_ALLOWED_SCORE) {
    throw new Error(`Score must be between 0 and ${MAX_ALLOWED_SCORE}`);
  }

  return await prisma.$transaction(async (tx) => {
    // Insert the new score
    await tx.score.create({
      data: {
        gameId,
        puzzleId,
        puzzleNumber,
        score,
      },
    });

    // Find the score at the cutoff position (e.g., 8th place)
    const cutoffRecord = await tx.score.findFirst({
      where: { gameId, puzzleId },
      orderBy: { score: 'desc' },
      skip: MAX_SCORES_PER_PUZZLE - 1, // 0-indexed, so skip 7 to get 8th
      select: { score: true, id: true },
    });

    // Delete any scores below the cutoff to bound storage
    if (cutoffRecord) {
      await tx.score.deleteMany({
        where: {
          gameId,
          puzzleId,
          score: { lt: cutoffRecord.score },
        },
      });
    }

    // Get top 3 scores for this puzzle (highest first)
    const topScoreRecords = await tx.score.findMany({
      where: { gameId, puzzleId },
      orderBy: { score: 'desc' },
      take: 3,
      select: { score: true },
    });

    // Build top scores with ranks
    const topScores: TopScore[] = topScoreRecords.map((record, index) => ({
      score: record.score,
      rank: index + 1,
    }));

    // Check if the submitted score is in the top 3
    const rankIndex = topScores.findIndex((ts) => ts.score === score);
    const isTopScore = rankIndex !== -1;
    const rank = isTopScore ? rankIndex + 1 : null;

    return { isTopScore, rank, topScores };
  });
}

/**
 * Get top scores for a puzzle
 */
export async function getTopScores(
  gameId: string,
  puzzleId: string,
  limit: number = 3
): Promise<TopScore[]> {
  const topScoreRecords = await prisma.score.findMany({
    where: { gameId, puzzleId },
    orderBy: { score: 'desc' },
    take: limit,
    select: { score: true },
  });

  return topScoreRecords.map((record, index) => ({
    score: record.score,
    rank: index + 1,
  }));
}
