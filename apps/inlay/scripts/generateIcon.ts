/**
 * Generate the Inlay game icon
 *
 * Creates a capital "I" made of colorful pentomino-style squares
 * on an emerald green background.
 *
 * Usage: npx tsx apps/inlay/scripts/generateIcon.ts
 */

import { createCanvas } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';

// Icon dimensions
const SIZE = 727; // Match other app icons
const WEB_SIZE = 1024; // Larger for web/public icons

// Inlay's accent color
const BACKGROUND_COLOR = '#0da678';

// Colors for the squares - using warm, inviting colors that complement green
// Each square in the "I" gets a distinct color for a pentomino-puzzle feel
const SQUARE_COLORS = [
  '#f5f0e1', // cream/beige (like Scrabble tiles)
  '#fbbf24', // amber/gold
  '#fb923c', // orange
  '#f472b6', // pink
  '#a78bfa', // purple
  '#60a5fa', // blue
  '#34d399', // mint/light green
  '#fcd34d', // yellow
];

// The "I" shape on a 3x4 grid
// 1 = filled, 0 = empty
const I_SHAPE = [
  [1, 1, 1], // top serif
  [0, 1, 0], // stem
  [0, 1, 0], // stem
  [1, 1, 1], // bottom serif
];

function generateIcon(outputPath: string, size: number) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, size, size);

  // Calculate square dimensions
  const gridCols = 3;
  const gridRows = 4;
  const padding = size * 0.18; // Padding around the "I"
  const gap = size * 0.025; // Gap between squares

  const availableWidth = size - padding * 2 - gap * (gridCols - 1);
  const availableHeight = size - padding * 2 - gap * (gridRows - 1);

  const squareSize = Math.min(availableWidth / gridCols, availableHeight / gridRows);

  // Center the grid
  const totalWidth = squareSize * gridCols + gap * (gridCols - 1);
  const totalHeight = squareSize * gridRows + gap * (gridRows - 1);
  const offsetX = (size - totalWidth) / 2;
  const offsetY = (size - totalHeight) / 2;

  const cornerRadius = squareSize * 0.15;

  let colorIndex = 0;

  // Draw squares
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      if (I_SHAPE[row][col] === 1) {
        const x = offsetX + col * (squareSize + gap);
        const y = offsetY + row * (squareSize + gap);

        // Use cream/beige for all squares (matching Dabble/Jumble style)
        const color = '#f5f0e1';

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        roundRect(ctx, x + 4, y + 4, squareSize, squareSize, cornerRadius);
        ctx.fill();

        // Draw main square
        ctx.fillStyle = color;
        roundRect(ctx, x, y, squareSize, squareSize, cornerRadius);
        ctx.fill();

        // Draw subtle 3D effect (lighter top edge, darker bottom edge)
        // Top highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        roundRect(ctx, x, y, squareSize, squareSize * 0.15, cornerRadius);
        ctx.fill();

        // Bottom shadow (within square)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.beginPath();
        ctx.moveTo(x + cornerRadius, y + squareSize);
        ctx.lineTo(x + squareSize - cornerRadius, y + squareSize);
        ctx.arcTo(x + squareSize, y + squareSize, x + squareSize, y + squareSize - cornerRadius, cornerRadius);
        ctx.lineTo(x + squareSize, y + squareSize * 0.85);
        ctx.lineTo(x, y + squareSize * 0.85);
        ctx.lineTo(x, y + squareSize - cornerRadius);
        ctx.arcTo(x, y + squareSize, x + cornerRadius, y + squareSize, cornerRadius);
        ctx.closePath();
        ctx.fill();

        colorIndex++;
      }
    }
  }

  // Write to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Generated icon: ${outputPath} (${size}x${size})`);
}

// Helper to draw rounded rectangle
function roundRect(
  ctx: ReturnType<typeof createCanvas>['prototype'],
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + radius, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
  ctx.closePath();
}

// Main execution
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);

// Icon locations
const appIconPath = path.resolve(scriptDir, '../src/app/icon.png');
const publicIconPath = path.resolve(scriptDir, '../public/icons/inlay.png');
const webIconPath = path.resolve(scriptDir, '../../web/public/icons/inlay.png');

// Ensure directories exist
fs.mkdirSync(path.dirname(publicIconPath), { recursive: true });

// Generate all icons
generateIcon(appIconPath, SIZE);      // Next.js app icon (favicon)
generateIcon(publicIconPath, WEB_SIZE); // Local landing screen icon
generateIcon(webIconPath, WEB_SIZE);   // Web app hamburger menu icon

console.log('\nIcon generation complete!');
