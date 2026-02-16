'use client';

import { getShape } from '@/constants/shapes';
import { getColor } from '@/constants/colors';
import type { ShapeId, ColorId, PatternId, CardCount } from '@/types';

interface CardShapeProps {
  shape: ShapeId;
  color: ColorId;
  pattern: PatternId;
  count: CardCount;
  size?: 'sm' | 'md' | 'lg';
}

// Size configuration for shapes based on count
const SIZE_CONFIG = {
  sm: { 1: 40, 2: 32, 3: 22 },
  md: { 1: 50, 2: 40, 3: 28 },
  lg: { 1: 60, 2: 48, 3: 34 },
} as const;

// Spacing between shapes based on count
const SPACING_CONFIG = {
  sm: { 2: 8, 3: 4 },
  md: { 2: 10, 3: 6 },
  lg: { 2: 12, 3: 8 },
} as const;

/**
 * Renders SVG shapes for a Trio card.
 * Handles different patterns (solid, outline, striped) and counts (1, 2, 3).
 * For count=3, shapes are arranged in a triangle (1 top, 2 bottom).
 * For count=1 and count=2, shapes are arranged horizontally.
 */
export function CardShape({ shape, color, pattern, count, size = 'md' }: CardShapeProps) {
  const shapeDef = getShape(shape);
  const colorDef = getColor(color);

  const shapeSize = SIZE_CONFIG[size][count];
  const spacing = count > 1 ? SPACING_CONFIG[size][count as 2 | 3] : 0;

  // Generate a unique ID for the stripe pattern
  const patternId = `stripes-${shape}-${color}-${count}`;

  // For count=3, use triangle layout
  if (count === 3) {
    // Triangle: 1 shape on top, 2 shapes on bottom
    const bottomWidth = 2 * shapeSize + spacing;
    const totalWidth = bottomWidth;
    const totalHeight = 2 * shapeSize + spacing;

    return (
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="w-full h-full"
        style={{ maxWidth: totalWidth, maxHeight: totalHeight }}
      >
        {/* Define stripe pattern if needed */}
        {pattern === 'striped' && (
          <defs>
            <pattern
              id={patternId}
              patternUnits="userSpaceOnUse"
              width="10"
              height="10"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="10"
                stroke={colorDef.value}
                strokeWidth="4"
              />
            </pattern>
          </defs>
        )}

        {/* Top shape (centered) */}
        <g transform={`translate(${(totalWidth - shapeSize) / 2}, 0)`}>
          <svg viewBox="0 0 100 100" width={shapeSize} height={shapeSize}>
            <path
              d={shapeDef.path}
              fill={
                pattern === 'solid'
                  ? colorDef.value
                  : pattern === 'striped'
                  ? `url(#${patternId})`
                  : 'none'
              }
              stroke={colorDef.value}
              strokeWidth={pattern === 'outline' ? (shapeDef.strokeWidth || 6) : (pattern === 'striped' ? 4 : 0)}
            />
          </svg>
        </g>

        {/* Bottom left shape */}
        <g transform={`translate(0, ${shapeSize + spacing})`}>
          <svg viewBox="0 0 100 100" width={shapeSize} height={shapeSize}>
            <path
              d={shapeDef.path}
              fill={
                pattern === 'solid'
                  ? colorDef.value
                  : pattern === 'striped'
                  ? `url(#${patternId})`
                  : 'none'
              }
              stroke={colorDef.value}
              strokeWidth={pattern === 'outline' ? (shapeDef.strokeWidth || 6) : (pattern === 'striped' ? 4 : 0)}
            />
          </svg>
        </g>

        {/* Bottom right shape */}
        <g transform={`translate(${shapeSize + spacing}, ${shapeSize + spacing})`}>
          <svg viewBox="0 0 100 100" width={shapeSize} height={shapeSize}>
            <path
              d={shapeDef.path}
              fill={
                pattern === 'solid'
                  ? colorDef.value
                  : pattern === 'striped'
                  ? `url(#${patternId})`
                  : 'none'
              }
              stroke={colorDef.value}
              strokeWidth={pattern === 'outline' ? (shapeDef.strokeWidth || 6) : (pattern === 'striped' ? 4 : 0)}
            />
          </svg>
        </g>
      </svg>
    );
  }

  // For count=1 and count=2, horizontal arrangement
  const totalWidth = count === 1 ? shapeSize : count * shapeSize + (count - 1) * spacing;

  return (
    <svg
      viewBox={`0 0 ${totalWidth} ${shapeSize}`}
      className="w-full h-full"
      style={{ maxWidth: totalWidth, maxHeight: shapeSize }}
    >
      {/* Define stripe pattern if needed */}
      {pattern === 'striped' && (
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width="10"
            height="10"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="10"
              stroke={colorDef.value}
              strokeWidth="4"
            />
          </pattern>
        </defs>
      )}

      {/* Render shapes horizontally */}
      {Array.from({ length: count }, (_, i) => {
        const xOffset = i * (shapeSize + spacing);

        return (
          <g
            key={i}
            transform={`translate(${xOffset}, 0)`}
          >
            <svg
              viewBox="0 0 100 100"
              width={shapeSize}
              height={shapeSize}
            >
              <path
                d={shapeDef.path}
                fill={
                  pattern === 'solid'
                    ? colorDef.value
                    : pattern === 'striped'
                    ? `url(#${patternId})`
                    : 'none'
                }
                stroke={colorDef.value}
                strokeWidth={pattern === 'outline' ? (shapeDef.strokeWidth || 6) : (pattern === 'striped' ? 4 : 0)}
              />
            </svg>
          </g>
        );
      })}
    </svg>
  );
}

export default CardShape;
