import { NextResponse } from 'next/server';
import { submitScore, getTopScores } from '@grid-games/database';

// CORS headers for cross-origin requests from game apps
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface SubmitScorePayload {
  gameId: string;
  puzzleId: string;
  puzzleNumber: number;
  score: number;
}

/**
 * POST /api/scores - Submit a score
 */
export async function POST(request: Request) {
  try {
    const data: SubmitScorePayload = await request.json();

    // Validate required fields
    if (!data.gameId || !data.puzzleId || data.puzzleNumber === undefined || data.score === undefined) {
      return NextResponse.json(
        { error: 'gameId, puzzleId, puzzleNumber, and score are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate types
    if (typeof data.score !== 'number' || typeof data.puzzleNumber !== 'number') {
      return NextResponse.json(
        { error: 'score and puzzleNumber must be numbers' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate score is positive
    if (data.score < 0) {
      return NextResponse.json(
        { error: 'score must be non-negative' },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await submitScore(
      data.gameId,
      data.puzzleId,
      data.puzzleNumber,
      data.score
    );

    return NextResponse.json(result, { headers: corsHeaders });
  } catch (error) {
    console.error('Failed to submit score:', error);

    // Handle validation errors specifically
    if (error instanceof Error && error.message.includes('must be between')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      { error: 'Failed to submit score' },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/scores - Get top scores for a puzzle
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId');
    const puzzleId = searchParams.get('puzzleId');
    const limitParam = searchParams.get('limit');

    // Validate required fields
    if (!gameId || !puzzleId) {
      return NextResponse.json(
        { error: 'gameId and puzzleId are required query parameters' },
        { status: 400, headers: corsHeaders }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 3;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'limit must be a number between 1 and 100' },
        { status: 400, headers: corsHeaders }
      );
    }

    const topScores = await getTopScores(gameId, puzzleId, limit);

    return NextResponse.json({ topScores }, { headers: corsHeaders });
  } catch (error) {
    console.error('Failed to get top scores:', error);
    return NextResponse.json(
      { error: 'Failed to get top scores' },
      { status: 500, headers: corsHeaders }
    );
  }
}
