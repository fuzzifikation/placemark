import Database from 'better-sqlite3';
import sharp from 'sharp';
import exifr from 'exifr';
import path from 'path';
import fs from 'fs/promises';
import { app } from 'electron';
import { logger } from './logger';
import { isRawFile, isHeicFile } from './formats';
import type { OneDriveAuthService } from './onedriveAuth';
import { ONEDRIVE_CONFIG } from '../config/onedrive';

const THUMBNAIL_CONFIG = {
  size: 400, // Single size for all contexts
  quality: 80, // JPEG, ~35KB per thumbnail
  maxSizeMB: 500, // User-configurable (default)
  autoEvict: true, // LRU eviction when limit reached
};

// Embedded schema to avoid file system issues in production builds
const THUMBNAIL_SCHEMA = `
  -- Thumbnail cache database schema
  -- Stores 400px JPEG thumbnails with LRU eviction

  CREATE TABLE IF NOT EXISTS thumbnails (
    photo_id INTEGER PRIMARY KEY,
    thumbnail_data BLOB NOT NULL,
    size_bytes INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    last_accessed_at INTEGER NOT NULL
  );

  -- Index for LRU eviction (find least recently used)
  CREATE INDEX IF NOT EXISTS idx_thumbnails_lru ON thumbnails(last_accessed_at);

  -- Metadata table for cache management
  CREATE TABLE IF NOT EXISTS thumbnail_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  -- Store configuration
  INSERT OR IGNORE INTO thumbnail_metadata (key, value) VALUES ('max_size_mb', '500');
  INSERT OR IGNORE INTO thumbnail_metadata (key, value) VALUES ('total_size_bytes', '0');
  INSERT OR IGNORE INTO thumbnail_metadata (key, value) VALUES ('thumbnail_count', '0');
`;

export class ThumbnailService {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const thumbnailDbPath = dbPath || path.join(app.getPath('userData'), 'thumbnails.db');
    this.db = new Database(thumbnailDbPath);
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    // Execute embedded schema
    this.db.exec(THUMBNAIL_SCHEMA);
  }

  /**
   * Generate and cache thumbnail for a photo
   *
   * Safety: This function only READS from photo files, never writes or modifies them.
   * Thumbnails are stored in a separate SQLite database (thumbnails.db).
   *
   * @returns Buffer containing JPEG thumbnail data, or null if thumbnail cannot be generated
   */
  async generateThumbnail(photoId: number, photoPath: string): Promise<Buffer | null> {
    try {
      // Check if thumbnail already exists
      const existing = this.getThumbnail(photoId);
      if (existing) {
        return existing;
      }

      // Check if file exists and is readable before attempting thumbnail generation
      try {
        await fs.access(photoPath, fs.constants.R_OK);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Photo file not accessible: ${photoPath} (${errorMessage})`);
      }

      // For RAW and HEIC/HEIF files, extract embedded JPEG thumbnail first.
      // - RAW: sharp cannot decode sensor data at all.
      // - HEIC/HEIF: sharp on Windows only supports AVIF, not H.265/HEIC.
      let inputForSharp: Buffer | string = photoPath;

      if (isRawFile(photoPath) || isHeicFile(photoPath)) {
        const formatLabel = isHeicFile(photoPath) ? 'HEIC' : 'RAW';
        try {
          // exifr.thumbnail() extracts the embedded JPEG preview.
          // Fast (~10-50ms) — reads only the thumbnail bytes, not pixel data.
          const embeddedThumbnail = await exifr.thumbnail(photoPath);

          if (embeddedThumbnail) {
            inputForSharp = embeddedThumbnail;
          } else {
            logger.warn(
              `${formatLabel} file has no embedded thumbnail: ${path.basename(photoPath)}`
            );
            return null;
          }
        } catch (error) {
          logger.warn(
            `Failed to extract ${formatLabel} thumbnail: ${path.basename(photoPath)} — ${error}`
          );
          return null;
        }
      }

      // Generate thumbnail using sharp
      const thumbnailBuffer = await sharp(inputForSharp, {
        failOn: 'none',
      })
        .rotate() // Auto-orient based on EXIF Orientation tag
        .resize(THUMBNAIL_CONFIG.size, THUMBNAIL_CONFIG.size, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: THUMBNAIL_CONFIG.quality })
        .toBuffer();

      // Store thumbnail
      this.storeThumbnail(photoId, thumbnailBuffer);

      return thumbnailBuffer;
    } catch (error) {
      // Silently fail for corrupted files, log others
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!errorMessage.includes('VipsJpeg') && !errorMessage.includes('Invalid SOS parameters')) {
        logger.error(`Failed to generate thumbnail for photo ${photoId}:`, error);
      }
      throw error;
    }
  }

  /**
   * Fetch the Graph API "large" thumbnail for a OneDrive photo, resize to 400px,
   * store in cache, and return the buffer.
   * Returns null when not connected or if the item has no thumbnail.
   */
  async generateThumbnailFromOneDrive(
    photoId: number,
    cloudItemId: string,
    authService: OneDriveAuthService
  ): Promise<Buffer | null> {
    const accessToken = await authService.getValidAccessToken();
    if (!accessToken) return null;

    const url = `${ONEDRIVE_CONFIG.graphBaseUrl}/me/drive/items/${encodeURIComponent(cloudItemId)}/thumbnails/0/large/content`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status === 404) return null; // item has no thumbnail
    if (!response.ok) {
      logger.warn(`OneDrive thumbnail fetch failed (${response.status}) for item ${cloudItemId}`);
      return null;
    }

    const rawBuffer = Buffer.from(await response.arrayBuffer());

    const thumbnailBuffer = await sharp(rawBuffer, { failOn: 'none' })
      .rotate()
      .resize(THUMBNAIL_CONFIG.size, THUMBNAIL_CONFIG.size, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: THUMBNAIL_CONFIG.quality })
      .toBuffer();

    this.storeThumbnail(photoId, thumbnailBuffer);
    return thumbnailBuffer;
  }

  /**
   * Get thumbnail from cache (updates LRU timestamp)
   */
  getThumbnail(photoId: number): Buffer | null {
    const row = this.db
      .prepare('SELECT thumbnail_data FROM thumbnails WHERE photo_id = ?')
      .get(photoId) as { thumbnail_data: Buffer } | undefined;

    if (row) {
      // Update last accessed time for LRU
      this.db
        .prepare('UPDATE thumbnails SET last_accessed_at = ? WHERE photo_id = ?')
        .run(Date.now(), photoId);
      return row.thumbnail_data;
    }

    return null;
  }

  /**
   * Store thumbnail in cache (with LRU eviction if needed)
   */
  private storeThumbnail(photoId: number, thumbnailData: Buffer): void {
    const sizeBytes = thumbnailData.length;
    const now = Date.now();

    this.evictIfNeeded(sizeBytes);

    this.db
      .prepare(
        `INSERT OR REPLACE INTO thumbnails (photo_id, thumbnail_data, size_bytes, created_at, last_accessed_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(photoId, thumbnailData, sizeBytes, now, now);

    this.recalculateMetadata();
  }

  private evictIfNeeded(newThumbnailSize: number): void {
    if (!THUMBNAIL_CONFIG.autoEvict) return;
    const maxSizeBytes = this.getMaxSizeBytes();
    const currentSizeBytes = this.getTotalSizeBytes();
    if (currentSizeBytes + newThumbnailSize <= maxSizeBytes) return;
    this.evictLRU(currentSizeBytes + newThumbnailSize - maxSizeBytes);
  }

  private evictToFitNewLimit(): void {
    const maxSizeBytes = this.getMaxSizeBytes();
    const currentSizeBytes = this.getTotalSizeBytes();
    if (currentSizeBytes <= maxSizeBytes) return;
    this.evictLRU(currentSizeBytes - maxSizeBytes);
  }

  private evictLRU(bytesToFree: number): void {
    const thumbnailsToEvict = this.db
      .prepare('SELECT photo_id, size_bytes FROM thumbnails ORDER BY last_accessed_at ASC')
      .all() as Array<{ photo_id: number; size_bytes: number }>;

    let freedSpace = 0;
    const idsToDelete: number[] = [];

    for (const thumbnail of thumbnailsToEvict) {
      idsToDelete.push(thumbnail.photo_id);
      freedSpace += thumbnail.size_bytes;
      if (freedSpace >= bytesToFree) break;
    }

    if (idsToDelete.length > 0) {
      const placeholders = idsToDelete.map(() => '?').join(',');
      this.db
        .prepare(`DELETE FROM thumbnails WHERE photo_id IN (${placeholders})`)
        .run(...idsToDelete);
      this.recalculateMetadata();
      logger.debug(`Evicted ${idsToDelete.length} thumbnails to free ${freedSpace} bytes`);
    }
  }

  /**
   * Recalculate cache metadata from actual database state.
   * Runs in a transaction so both counters are always consistent.
   */
  private recalculateMetadata(): void {
    const stats = this.db
      .prepare(
        `SELECT
          COUNT(*) as count,
          COALESCE(SUM(size_bytes), 0) as total_size
         FROM thumbnails`
      )
      .get() as { count: number; total_size: number };

    const updateMeta = this.db.transaction(() => {
      this.db
        .prepare('UPDATE thumbnail_metadata SET value = ? WHERE key = ?')
        .run(stats.total_size.toString(), 'total_size_bytes');
      this.db
        .prepare('UPDATE thumbnail_metadata SET value = ? WHERE key = ?')
        .run(stats.count.toString(), 'thumbnail_count');
    });
    updateMeta();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalSizeBytes: number;
    totalSizeMB: number;
    thumbnailCount: number;
    maxSizeMB: number;
    usagePercent: number;
  } {
    const totalSizeBytes = this.getTotalSizeBytes();
    const thumbnailCount = this.getThumbnailCount();
    const maxSizeMB = this.getMaxSizeMB();
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    return {
      totalSizeBytes,
      totalSizeMB: totalSizeBytes / (1024 * 1024),
      thumbnailCount,
      maxSizeMB,
      usagePercent: (totalSizeBytes / maxSizeBytes) * 100,
    };
  }

  /**
   * Clear all thumbnails
   */
  clearCache(): void {
    this.db.prepare('DELETE FROM thumbnails').run();
    // Recalculate metadata (will be 0 after DELETE)
    this.recalculateMetadata();
    logger.info('Thumbnail cache cleared');
  }

  /**
   * Set maximum cache size in MB
   */
  setMaxSizeMB(sizeMB: number): void {
    this.db
      .prepare('UPDATE thumbnail_metadata SET value = ? WHERE key = ?')
      .run(sizeMB.toString(), 'max_size_mb');
    logger.info(`Thumbnail cache max size set to ${sizeMB}MB`);
    this.evictToFitNewLimit();
  }

  // Helper methods for metadata
  private getTotalSizeBytes(): number {
    const row = this.db
      .prepare('SELECT value FROM thumbnail_metadata WHERE key = ?')
      .get('total_size_bytes') as { value: string } | undefined;
    return row ? parseInt(row.value, 10) : 0;
  }

  private getThumbnailCount(): number {
    const row = this.db
      .prepare('SELECT value FROM thumbnail_metadata WHERE key = ?')
      .get('thumbnail_count') as { value: string } | undefined;
    return row ? parseInt(row.value, 10) : 0;
  }

  private getMaxSizeMB(): number {
    const row = this.db
      .prepare('SELECT value FROM thumbnail_metadata WHERE key = ?')
      .get('max_size_mb') as { value: string } | undefined;
    return row ? parseInt(row.value, 10) : THUMBNAIL_CONFIG.maxSizeMB;
  }

  private getMaxSizeBytes(): number {
    return this.getMaxSizeMB() * 1024 * 1024;
  }

  close(): void {
    this.db.close();
  }
}
