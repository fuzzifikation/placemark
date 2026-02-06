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

// Query builder helpers live in filters/geographic.ts (buildBoundsQuery),
// filters/temporal.ts (buildDateRangeQuery), and filters/combined.ts (buildCombinedQuery).
// Use those directly — they are the single source of truth for SQL clause construction.
