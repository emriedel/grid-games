/**
 * Shared date utilities for daily puzzle games
 */

/**
 * Get today's date string in YYYY-MM-DD format
 * Uses local timezone
 */
export function getTodayDateString(): string {
  const now = new Date();
  return formatDateString(now);
}

/**
 * Format a date to YYYY-MM-DD string
 */
export function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string to a Date object
 * Sets time to midnight local time
 */
export function parseDateString(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00');
}

/**
 * Format a date for display (e.g., "Jan 22, 2026")
 */
export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateString(date) : date;
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Calculate puzzle number from a base date
 * Useful for sequential daily puzzles
 */
export function getPuzzleNumber(baseDate: Date, currentDate: Date = new Date()): number {
  const baseTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()).getTime();
  const currentTime = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((currentTime - baseTime) / dayMs) + 1;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseDateString(date) : date;
  return isSameDay(d, new Date());
}
