/**
 * Storage service - SQLite implementation for desktop
 * Handles all database operations for photos and batch file operations
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import { Photo, PhotoCreateInput, OperationType, BatchStatus } from '@placemark/core';
import { initializeDatabase, closeDatabase } from '../database/schema';
import { logger } from './logger';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'placemark.db');
    logger.info(`Initializing database at: ${dbPath}`);
    db = initializeDatabase({ path: dbPath });
  }
  return db;
}

export function closeStorage(): void {
  if (db) {
    closeDatabase(db);
    db = null;
  }
}

// ============================================================================
// Photo operations
// ============================================================================

function rowToPhoto(row: any): Photo {
  return {
    id: row.id,
    source: row.source,
    path: row.path,
    latitude: row.latitude,
    longitude: row.longitude,
    timestamp: row.timestamp,
    fileHash: row.file_hash,
    scannedAt: row.scanned_at,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    cameraMake: row.camera_make ?? null,
    cameraModel: row.camera_model ?? null,
    cloudItemId: row.cloud_item_id ?? null,
    cloudFolderPath: row.cloud_folder_path ?? null,
    cloudSha256: row.cloud_sha256 ?? null,
  };
}

/**
 * Create a new photo record
 */
export function createPhoto(input: PhotoCreateInput): Photo {
  const db = getDb();
  const result = db
    .prepare(
      `
    INSERT INTO photos (
      source, path, latitude, longitude, timestamp, file_hash, scanned_at,
      file_size, mime_type, camera_make, camera_model,
      cloud_item_id, cloud_folder_path, cloud_sha256
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, path) DO UPDATE SET
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      timestamp = excluded.timestamp,
      file_size = excluded.file_size,
      mime_type = excluded.mime_type,
      camera_make = excluded.camera_make,
      camera_model = excluded.camera_model,
      cloud_item_id = excluded.cloud_item_id,
      cloud_folder_path = excluded.cloud_folder_path,
      cloud_sha256 = excluded.cloud_sha256,
      scanned_at = excluded.scanned_at
    RETURNING *
  `
    )
    .get(
      input.source,
      input.path,
      input.latitude ?? null,
      input.longitude ?? null,
      input.timestamp ?? null,
      input.fileHash ?? null,
      Date.now(),
      input.fileSize,
      input.mimeType,
      input.cameraMake ?? null,
      input.cameraModel ?? null,
      input.cloudItemId ?? null,
      input.cloudFolderPath ?? null,
      input.cloudSha256 ?? null
    );

  return rowToPhoto(result);
}

/**
 * Check whether an OneDrive photo already exists in the database.
 * Checks sha256 hash first (cross-source dedup), then item ID (re-import guard).
 * Returns true if the photo should be skipped.
 */
export function isDuplicateOneDrivePhoto(cloudSha256: string | null, cloudItemId: string): boolean {
  const db = getDb();
  if (cloudSha256) {
    const row = db.prepare('SELECT 1 FROM photos WHERE cloud_sha256 = ?').get(cloudSha256);
    if (row) return true;
  }
  const row = db
    .prepare("SELECT 1 FROM photos WHERE source = 'onedrive' AND cloud_item_id = ?")
    .get(cloudItemId);
  return !!row;
}

/**
 * Get a single photo by ID
 */
export function getPhotoById(id: number): Photo | null {
  const row = getDb().prepare('SELECT * FROM photos WHERE id = ?').get(id);
  return row ? rowToPhoto(row) : null;
}

/**
 * Get multiple photos by IDs
 */
export function getPhotosByIds(ids: number[]): Photo[] {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = getDb()
    .prepare(`SELECT * FROM photos WHERE id IN (${placeholders})`)
    .all(...ids);
  return rows.map(rowToPhoto);
}

/**
 * Get photos with location data
 */
export function getPhotosWithLocation(): Photo[] {
  const rows = getDb()
    .prepare(
      'SELECT * FROM photos WHERE latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY scanned_at DESC'
    )
    .all();
  return rows.map(rowToPhoto);
}

/**
 * Update a photo's path in the database
 * Used after move operations to keep database in sync with filesystem
 */
export function updatePhotoPath(photoId: number, newPath: string): void {
  const result = getDb().prepare('UPDATE photos SET path = ? WHERE id = ?').run(newPath, photoId);

  if (result.changes === 0) {
    throw new Error(`Photo not found: ${photoId}`);
  }
}

/**
 * Clear all photos from database
 */
export function clearAllPhotos(): void {
  const db = getDb();
  // Also clear operation history — old batches reference file paths that are
  // no longer valid once the library is wiped, so undo would be meaningless.
  db.prepare('DELETE FROM operation_batch_files').run();
  db.prepare('DELETE FROM operation_batch').run();
  db.prepare('DELETE FROM photos').run();
}

/**
 * Get date range of photos (min and max timestamps)
 */
export function getPhotoDateRange(): { minDate: number | null; maxDate: number | null } {
  const result = getDb()
    .prepare(
      `SELECT 
        MIN(timestamp) as minDate, 
        MAX(timestamp) as maxDate 
      FROM photos 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND timestamp IS NOT NULL`
    )
    .get() as { minDate: number | null; maxDate: number | null };
  return result;
}

/**
 * Histogram of photo counts per equi-temporal bucket.
 * @param minDate     Range start (Unix ms)
 * @param maxDate     Range end (Unix ms)
 * @param bucketCount Number of buckets (e.g. 100)
 * @param gpsOnly     When true, only photos with GPS coordinates are counted
 */
export function getPhotoHistogram(
  minDate: number,
  maxDate: number,
  bucketCount: number,
  gpsOnly: boolean
): { bucket: number; count: number }[] {
  const bucketWidth = (maxDate - minDate) / bucketCount;
  if (bucketWidth <= 0) return [];

  const gpsClause = gpsOnly ? 'AND latitude IS NOT NULL AND longitude IS NOT NULL' : '';
  const rows = getDb()
    .prepare(
      `SELECT
        MIN(CAST((timestamp - :min) / :width AS INTEGER), :n - 1) AS bucket,
        COUNT(*) AS count
       FROM photos
       WHERE timestamp BETWEEN :min AND :max
         ${gpsClause}
       GROUP BY bucket
       ORDER BY bucket`
    )
    .all({ min: minDate, max: maxDate, width: bucketWidth, n: bucketCount }) as {
    bucket: number;
    count: number;
  }[];
  return rows;
}

/**
 * Get count of photos with location data
 */
export function getPhotoCountWithLocation(): number {
  const result = getDb()
    .prepare(
      'SELECT COUNT(*) as count FROM photos WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
    )
    .get() as { count: number };
  return result.count;
}

/**
 * Library statistics — single query aggregating photo metadata for the stats panel.
 * Returns total counts, GPS/timestamp coverage, format breakdown, file sizes, and date range.
 */
export interface LibraryStats {
  totalPhotos: number;
  photosWithLocation: number;
  photosWithTimestamp: number;
  totalFileSizeBytes: number;
  avgFileSizeBytes: number;
  minTimestamp: number | null;
  maxTimestamp: number | null;
  oldestPhotoId: number | null;
  newestPhotoId: number | null;
  formatBreakdown: Array<{ mimeType: string; count: number }>;
  cameraBreakdown: Array<{ make: string; model: string; count: number }>;
  lastScannedAt: number | null;
}

export function getLibraryStats(): LibraryStats {
  const db = getDb();

  const summary = db
    .prepare(
      `SELECT
        COUNT(*) AS totalPhotos,
        SUM(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 ELSE 0 END) AS photosWithLocation,
        SUM(CASE WHEN timestamp IS NOT NULL THEN 1 ELSE 0 END) AS photosWithTimestamp,
        COALESCE(SUM(file_size), 0) AS totalFileSizeBytes,
        COALESCE(AVG(file_size), 0) AS avgFileSizeBytes,
        MIN(CASE WHEN timestamp IS NOT NULL THEN timestamp END) AS minTimestamp,
        MAX(CASE WHEN timestamp IS NOT NULL THEN timestamp END) AS maxTimestamp,
        MAX(scanned_at) AS lastScannedAt
      FROM photos`
    )
    .get() as {
    totalPhotos: number;
    photosWithLocation: number;
    photosWithTimestamp: number;
    totalFileSizeBytes: number;
    avgFileSizeBytes: number;
    minTimestamp: number | null;
    maxTimestamp: number | null;
    lastScannedAt: number | null;
  };

  const oldestRow = db
    .prepare(`SELECT id FROM photos WHERE timestamp IS NOT NULL ORDER BY timestamp ASC LIMIT 1`)
    .get() as { id: number } | undefined;

  const newestRow = db
    .prepare(`SELECT id FROM photos WHERE timestamp IS NOT NULL ORDER BY timestamp DESC LIMIT 1`)
    .get() as { id: number } | undefined;

  const formatRows = db
    .prepare(
      `SELECT mime_type AS mimeType, COUNT(*) AS count
       FROM photos
       GROUP BY mime_type
       ORDER BY count DESC`
    )
    .all() as Array<{ mimeType: string; count: number }>;

  const cameraRows = db
    .prepare(
      `SELECT
         COALESCE(camera_make, 'Unknown') AS make,
         COALESCE(camera_model, 'Unknown') AS model,
         COUNT(*) AS count
       FROM photos
       WHERE camera_make IS NOT NULL OR camera_model IS NOT NULL
       GROUP BY camera_make, camera_model
       ORDER BY count DESC
       LIMIT 20`
    )
    .all() as Array<{ make: string; model: string; count: number }>;

  return {
    ...summary,
    oldestPhotoId: oldestRow?.id ?? null,
    newestPhotoId: newestRow?.id ?? null,
    formatBreakdown: formatRows,
    cameraBreakdown: cameraRows,
  };
}

// ============================================================================
// Batch operations (for atomic undo)
// ============================================================================

export interface BatchFile {
  photoId: number;
  sourcePath: string;
  destPath: string;
}

export interface OperationBatch {
  id: number;
  operation: OperationType;
  timestamp: number;
  status: BatchStatus;
  error?: string;
  files: BatchFile[];
}

export interface BatchInput {
  operation: OperationType;
  files: BatchFile[];
  timestamp: number;
  status: BatchStatus;
}

/**
 * Log a batch of file operations
 * Returns the batch ID
 * Uses a transaction to ensure atomic insert
 */
export function logOperationBatch(input: BatchInput): number {
  const db = getDb();

  // Use transaction to ensure batch + files are inserted atomically
  const insertBatch = db.transaction(() => {
    const batchResult = db
      .prepare(
        `INSERT INTO operation_batch (operation, timestamp, status, error)
         VALUES (?, ?, ?, NULL)`
      )
      .run(input.operation, input.timestamp, input.status);

    const batchId = batchResult.lastInsertRowid as number;

    const insertFile = db.prepare(
      `INSERT INTO operation_batch_files (batch_id, source_path, dest_path, photo_id)
       VALUES (?, ?, ?, ?)`
    );

    for (const file of input.files) {
      insertFile.run(batchId, file.sourcePath, file.destPath, file.photoId);
    }

    return batchId;
  });

  return insertBatch();
}

/**
 * Update batch status
 */
export function updateBatchStatus(batchId: number, status: BatchStatus, error?: string): void {
  getDb()
    .prepare('UPDATE operation_batch SET status = ?, error = ? WHERE id = ?')
    .run(status, error ?? null, batchId);
}

/**
 * Get the last completed batch (for undo)
 */
export function getLastCompletedBatch(): OperationBatch | null {
  const db = getDb();

  const batchRow = db
    .prepare(
      `SELECT * FROM operation_batch 
       WHERE status = 'completed' 
       ORDER BY timestamp DESC 
       LIMIT 1`
    )
    .get() as any;

  if (!batchRow) return null;

  const fileRows = db
    .prepare('SELECT * FROM operation_batch_files WHERE batch_id = ?')
    .all(batchRow.id) as any[];

  return {
    id: batchRow.id,
    operation: batchRow.operation as OperationType,
    timestamp: batchRow.timestamp,
    status: batchRow.status as BatchStatus,
    error: batchRow.error ?? undefined,
    files: fileRows.map((row) => ({
      photoId: row.photo_id,
      sourcePath: row.source_path,
      destPath: row.dest_path,
    })),
  };
}

/**
 * Archive all completed batches (called on app startup)
 * This clears the undo history - old operations shouldn't be undoable after restart
 */
export function archiveCompletedBatches(): void {
  const result = getDb()
    .prepare("UPDATE operation_batch SET status = 'archived' WHERE status = 'completed'")
    .run();

  if (result.changes > 0) {
    logger.info(`Archived ${result.changes} completed operation batches from previous session`);
  }
}
