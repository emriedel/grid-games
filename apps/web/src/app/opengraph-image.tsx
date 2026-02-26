import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Nerdcube Daily – Free Daily Word & Puzzle Games';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'radial-gradient(circle at 25% 25%, #1a1a2e 0%, transparent 50%), radial-gradient(circle at 75% 75%, #16213e 0%, transparent 50%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '24px',
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 700,
              color: '#ededed',
              letterSpacing: '-0.02em',
            }}
          >
            Nerdcube Daily
          </div>
          <div
            style={{
              fontSize: 32,
              color: '#a1a1aa',
              fontStyle: 'italic',
            }}
          >
            Free daily word & puzzle games
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
