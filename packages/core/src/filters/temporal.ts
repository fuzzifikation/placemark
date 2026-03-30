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
  if (photo.timestamp === null) {
    return false;
  }

  return photo.timestamp >= range.start && photo.timestamp <= range.end;
}

/**
 * Return the oldest and youngest timestamps across a set of photos.
 * Only photos with a non-null timestamp are considered.
 * Returns null when no photo has a timestamp.
 */
export function getDateRange(photos: Photo[]): DateRange | null {
  let min = Infinity;
  let max = -Infinity;

  for (const p of photos) {
    if (p.timestamp === null) continue;
    if (p.timestamp < min) min = p.timestamp;
    if (p.timestamp > max) max = p.timestamp;
  }

  if (!isFinite(min)) return null;
  return { start: min, end: max };
}
