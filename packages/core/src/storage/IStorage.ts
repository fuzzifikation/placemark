/**
 * Storage interface - platform-agnostic database abstraction
 * Implementations: better-sqlite3 (desktop), react-native-sqlite (mobile)
 */

import { Photo, PhotoCreateInput } from '../models/Photo';
import { Source, SourceCreateInput, SourceUpdateInput } from '../models/Source';

/**
 * Core storage interface that all platforms must implement
 * Desktop uses better-sqlite3, mobile will use react-native-sqlite
 */
export interface IStorage {
  // ============================================================================
  // Photo operations
  // ============================================================================

  /**
   * Create or update a photo record
   * Uses UPSERT logic based on (source, path) unique constraint
   */
  upsertPhoto(input: PhotoCreateInput): Photo;

  /**
   * Get all photos with location data
   */
  getPhotosWithLocation(): Photo[];

  /**
   * Get photos within a date range
   */
  getPhotosInDateRange(startTimestamp: number, endTimestamp: number): Photo[];

  /**
   * Get photos within geographic bounds and optional date range
   */
  getPhotosInBounds(bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
    startTimestamp?: number;
    endTimestamp?: number;
  }): Photo[];

  /**
   * Get photo by ID
   */
  getPhotoById(id: number): Photo | null;

  /**
   * Get count of photos with location
   */
  getPhotoCountWithLocation(): number;

  /**
   * Get date range of all photos (min/max timestamps)
   */
  getPhotoDateRange(): { minDate: number | null; maxDate: number | null };

  /**
   * Delete all photos (for testing/reset)
   */
  clearAllPhotos(): void;

  // ============================================================================
  // Source operations
  // ============================================================================

  /**
   * Create a new source
   */
  createSource(input: SourceCreateInput): Source;

  /**
   * Get all sources
   */
  getAllSources(): Source[];

  /**
   * Get source by ID
   */
  getSourceById(id: number): Source | null;

  /**
   * Update source
   */
  updateSource(id: number, input: SourceUpdateInput): Source;

  /**
   * Delete source
   */
  deleteSource(id: number): void;

  // ============================================================================
  // Lifecycle
  // ============================================================================

  /**
   * Close database connection
   */
  close(): void;
}

/**
 * Storage factory options
 */
export interface StorageOptions {
  path: string;
  readonly?: boolean;
}

/**
 * Query builder helpers for SQL construction
 */
export class QueryBuilder {
  /**
   * Build WHERE clause for location filtering
   */
  static buildLocationFilter(): string {
    return 'latitude IS NOT NULL AND longitude IS NOT NULL';
  }

  /**
   * Build WHERE clause for date range filtering
   */
  static buildDateRangeFilter(
    startTimestamp: number,
    endTimestamp: number
  ): { sql: string; params: number[] } {
    return {
      sql: 'timestamp BETWEEN ? AND ?',
      params: [startTimestamp, endTimestamp],
    };
  }

  /**
   * Build WHERE clause for bounding box (handles IDL crossing)
   */
  static buildBoundsFilter(bounds: { north: number; south: number; east: number; west: number }): {
    sql: string;
    params: number[];
  } {
    const crossesIdl = bounds.west > bounds.east;

    if (crossesIdl) {
      return {
        sql: 'latitude BETWEEN ? AND ? AND (longitude >= ? OR longitude <= ?)',
        params: [bounds.south, bounds.north, bounds.west, bounds.east],
      };
    } else {
      return {
        sql: 'latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?',
        params: [bounds.south, bounds.north, bounds.west, bounds.east],
      };
    }
  }
}
