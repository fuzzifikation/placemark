/**
 * Combined filtering logic - geographic + temporal
 * Platform-agnostic filter composition
 */

import { Photo } from '../models/Photo';
import { BoundingBox, isPhotoInBounds } from './geographic';
import { DateRange, isPhotoInDateRange } from './temporal';

export interface CombinedFilter {
  bounds?: BoundingBox;
  dateRange?: DateRange;
}

/**
 * Check if a photo passes all active filters
 */
export function isPhotoInFilter(photo: Photo, filter: CombinedFilter): boolean {
  // If bounds filter is active, check it
  if (filter.bounds) {
    if (!isPhotoInBounds(photo, filter.bounds)) {
      return false;
    }
  }

  // If date range filter is active, check it
  if (filter.dateRange) {
    if (!isPhotoInDateRange(photo, filter.dateRange)) {
      return false;
    }
  }

  return true;
}

/**
 * Filter photos array by combined filters
 */
export function filterPhotos(photos: Photo[], filter: CombinedFilter): Photo[] {
  return photos.filter((photo) => isPhotoInFilter(photo, filter));
}
