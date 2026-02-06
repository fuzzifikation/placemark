/**
 * Combined filtering logic - geographic + temporal
 * Platform-agnostic filter composition
 */

import { Photo } from '../models/Photo';
import { BoundingBox, isPhotoInBounds, buildBoundsQuery } from './geographic';
import { DateRange, isPhotoInDateRange, buildDateRangeQuery } from './temporal';

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

/**
 * Build SQL WHERE clause for combined filtering.
 * Composes from geographic and temporal query builders — single source of truth.
 */
export function buildCombinedQuery(filter: CombinedFilter): {
  sql: string;
  params: number[];
} {
  const clauses: string[] = [];
  const params: number[] = [];

  // Compose from geographic query builder
  if (filter.bounds) {
    const boundsQuery = buildBoundsQuery(filter.bounds);
    clauses.push(boundsQuery.sql);
    params.push(...boundsQuery.params);
  }

  // Compose from temporal query builder
  if (filter.dateRange) {
    const dateQuery = buildDateRangeQuery(filter.dateRange);
    clauses.push(dateQuery.sql);
    params.push(...dateQuery.params);
  }

  // Always require location data
  clauses.push('latitude IS NOT NULL');
  clauses.push('longitude IS NOT NULL');

  return {
    sql: clauses.join(' AND '),
    params,
  };
}

/**
 * Count how many photos pass the filter
 */
export function countFilteredPhotos(photos: Photo[], filter: CombinedFilter): number {
  return filterPhotos(photos, filter).length;
}
