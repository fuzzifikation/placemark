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
