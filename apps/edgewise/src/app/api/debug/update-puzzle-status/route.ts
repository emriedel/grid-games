import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface PoolPuzzle {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  categories: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  squares: unknown[];
  metadata: unknown;
}

interface PoolFile {
  gameId: 'edgewise';
  puzzles: PoolPuzzle[];
}

export async function POST(request: NextRequest) {
  // Only allow on localhost
  const host = request.headers.get('host') || '';
  if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { puzzleId, status } = body as { puzzleId: string; status: 'pending' | 'approved' | 'rejected' };

    if (!puzzleId || !status) {
      return NextResponse.json({ error: 'Missing puzzleId or status' }, { status: 400 });
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Read pool.json
    const poolPath = path.join(process.cwd(), 'public', 'puzzles', 'pool.json');

    if (!fs.existsSync(poolPath)) {
      return NextResponse.json({ error: 'pool.json not found' }, { status: 404 });
    }

    const poolData: PoolFile = JSON.parse(fs.readFileSync(poolPath, 'utf-8'));

    // Find and update the puzzle
    const puzzleIndex = poolData.puzzles.findIndex((p) => p.id === puzzleId);
    if (puzzleIndex === -1) {
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
    }

    poolData.puzzles[puzzleIndex].status = status;

    // Save back to pool.json
    fs.writeFileSync(poolPath, JSON.stringify(poolData, null, 2));

    return NextResponse.json({ success: true, puzzleId, status });
  } catch (error) {
    console.error('Failed to update puzzle status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
