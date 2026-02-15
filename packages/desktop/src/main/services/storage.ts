/**
 * Storage service - SQLite implementation for desktop
 * Handles all database operations for photos and sources
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import {
  Photo,
  PhotoCreateInput,
  Source,
  SourceCreateInput,
  OperationType,
  BatchStatus,
} from '@placemark/core';
import { initializeDatabase, closeDatabase } from '../database/schema';
import { logger } from './logger';

let db: Database.Database | null = null;

function getDb(): Database.Database {
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
    INSERT INTO photos (source, path, latitude, longitude, timestamp, file_hash, scanned_at, file_size, mime_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, path) DO UPDATE SET
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      timestamp = excluded.timestamp,
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
      input.mimeType
    );

  return rowToPhoto(result);
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
  getDb().prepare('DELETE FROM photos').run();
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
 * Get photos with location data filtered by date range
 * @param startTimestamp Start of range (Unix milliseconds) or null for no lower bound
 * @param endTimestamp End of range (Unix milliseconds) or null for no upper bound
 */
export function getPhotosWithLocationInDateRange(
  startTimestamp: number | null,
  endTimestamp: number | null
): Photo[] {
  let query = 'SELECT * FROM photos WHERE latitude IS NOT NULL AND longitude IS NOT NULL';
  const params: number[] = [];

  if (startTimestamp !== null) {
    query += ' AND timestamp >= ?';
    params.push(startTimestamp);
  }
  if (endTimestamp !== null) {
    query += ' AND timestamp <= ?';
    params.push(endTimestamp);
  }

  query += ' ORDER BY timestamp ASC';

  const rows = getDb()
    .prepare(query)
    .all(...params);
  return rows.map(rowToPhoto);
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
  formatBreakdown: Array<{ mimeType: string; count: number }>;
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

  const formatRows = db
    .prepare(
      `SELECT mime_type AS mimeType, COUNT(*) AS count
       FROM photos
       GROUP BY mime_type
       ORDER BY count DESC`
    )
    .all() as Array<{ mimeType: string; count: number }>;

  return {
    ...summary,
    formatBreakdown: formatRows,
  };
}

// ============================================================================
// Source operations
// ============================================================================

/**
 * Create a new source
 */
export function createSource(input: SourceCreateInput): Source {
  const db = getDb();
  const result = db
    .prepare('INSERT INTO sources (type, path, name, enabled) VALUES (?, ?, ?, 1)')
    .run(input.type, input.path, input.name);

  const row = db.prepare('SELECT * FROM sources WHERE id = ?').get(result.lastInsertRowid) as any;

  return {
    id: row.id,
    type: row.type,
    path: row.path,
    name: row.name,
    lastScan: row.last_scan,
    enabled: row.enabled === 1,
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
 * Mark batch as undone
 */
export function markBatchUndone(batchId: number): void {
  getDb().prepare('UPDATE operation_batch SET status = ? WHERE id = ?').run('undone', batchId);
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
