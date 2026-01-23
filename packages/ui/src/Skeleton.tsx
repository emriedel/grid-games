'use client';

interface SkeletonProps {
  /** Width (CSS value or number for pixels) */
  width?: string | number;
  /** Height (CSS value or number for pixels) */
  height?: string | number;
  /** Border radius variant */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
  /** Additional classes */
  className?: string;
}

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

/**
 * Basic skeleton loading placeholder
 */
export function Skeleton({
  width = '100%',
  height = 20,
  rounded = 'md',
  className = '',
}: SkeletonProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`
        bg-[var(--tile-bg,#1a1a2e)] animate-pulse
        ${roundedClasses[rounded]}
        ${className}
      `}
      style={style}
    />
  );
}

interface SkeletonGridProps {
  /** Number of rows */
  rows: number;
  /** Number of columns */
  cols: number;
  /** Cell size in pixels */
  cellSize?: number;
  /** Gap between cells in pixels */
  gap?: number;
  /** Additional classes */
  className?: string;
}

/**
 * Grid of skeleton cells (for game boards)
 */
export function SkeletonGrid({
  rows,
  cols,
  cellSize = 40,
  gap = 4,
  className = '',
}: SkeletonGridProps) {
  return (
    <div
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
        gap: `${gap}px`,
      }}
    >
      {Array.from({ length: rows * cols }).map((_, i) => (
        <Skeleton key={i} width={cellSize} height={cellSize} rounded="md" />
      ))}
    </div>
  );
}

interface SkeletonTextProps {
  /** Number of text lines */
  lines: number;
  /** Additional classes */
  className?: string;
}

/**
 * Multiple skeleton lines (for text content)
 */
export function SkeletonText({ lines, className = '' }: SkeletonTextProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '75%' : '100%'}
          height={16}
          rounded="sm"
        />
      ))}
    </div>
  );
}
