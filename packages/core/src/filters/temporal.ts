/**
 * Temporal filtering logic - platform-agnostic
 * Handles date range calculations and timestamp filtering
 */

import { Photo } from '../models/Photo';

export interface DateRange {
  start: number; // Unix timestamp in milliseconds
  end: number; // Unix timestamp in milliseconds
}

/**
 * Check if a photo is within a date range
 */
export function isPhotoInDateRange(photo: Photo, range: DateRange): boolean {
  if (photo.timestamp === null || photo.timestamp === undefined) {
    return false;
  }

  return photo.timestamp >= range.start && photo.timestamp <= range.end;
}

/**
 * Filter photos array by date range
 */
export function filterPhotosByDateRange(photos: Photo[], range: DateRange): Photo[] {
  return photos.filter((photo) => isPhotoInDateRange(photo, range));
}

/**
 * Build SQL WHERE clause for temporal filtering
 * Returns SQL fragment and parameter array for prepared statements
 */
export function buildDateRangeQuery(range: DateRange): {
  sql: string;
  params: number[];
} {
  return {
    sql: 'timestamp BETWEEN ? AND ?',
    params: [range.start, range.end],
  };
}

/**
 * Get the date range that encompasses all photos
 */
export function calculateDateRange(photos: Photo[]): DateRange | null {
  const photosWithTimestamp = photos.filter(
    (p) => p.timestamp !== null && p.timestamp !== undefined
  );

  if (photosWithTimestamp.length === 0) {
    return null;
  }

  let minTimestamp = Infinity;
  let maxTimestamp = -Infinity;

  for (const photo of photosWithTimestamp) {
    const ts = photo.timestamp!;
    if (ts < minTimestamp) minTimestamp = ts;
    if (ts > maxTimestamp) maxTimestamp = ts;
  }

  return { start: minTimestamp, end: maxTimestamp };
}

/**
 * Format timestamp to human-readable date string
 * Uses platform-agnostic logic (no localization)
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse date range from user-friendly strings
 * Returns null if invalid
 */
export function parseDateRange(startStr: string, endStr: string): DateRange | null {
  const start = new Date(startStr).getTime();
  const end = new Date(endStr).getTime();

  if (isNaN(start) || isNaN(end) || start > end) {
    return null;
  }

  return { start, end };
}
