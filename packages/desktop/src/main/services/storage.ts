/**
 * Storage service - SQLite implementation for desktop
 * Handles all database operations for photos and sources
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import { Photo, PhotoCreateInput, Source, SourceCreateInput } from '@placemark/core';
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
