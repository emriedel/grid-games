import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';

export const alt = 'Nerdcube Daily – Free Daily Word & Puzzle Games';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  const imagePath = join(process.cwd(), 'public', 'og-assets', 'og-image.png');
  const imageBuffer = await readFile(imagePath);

  return new Response(imageBuffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
