/**
 * Photo queries — CRUD operations and query functions for the photos table.
 */

import { Photo, PhotoCreateInput, PhotoSource } from '@placemark/core';
import { getDb } from './storageConnection';
import { ValidationIssue } from './photoMetadata';

interface PhotoRow {
  id: number;
  source: PhotoSource;
  path: string;
  latitude: number | null;
  longitude: number | null;
  timestamp: number | null;
  file_hash: string | null;
  scanned_at: number;
  file_size: number;
  mime_type: string;
  camera_make: string | null;
  camera_model: string | null;
  cloud_item_id: string | null;
  cloud_folder_path: string | null;
  cloud_sha256: string | null;
  cloud_web_url: string | null;
  cloud_folder_web_url: string | null;
}

function rowToPhoto(row: PhotoRow): Photo {
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
    cloudWebUrl: row.cloud_web_url ?? null,
    cloudFolderWebUrl: row.cloud_folder_web_url ?? null,
  };
}

export function createPhoto(input: PhotoCreateInput): Photo {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO photos (
        source, path, latitude, longitude, timestamp, file_hash, scanned_at,
        file_size, mime_type, camera_make, camera_model,
        cloud_item_id, cloud_folder_path, cloud_sha256,
        cloud_web_url, cloud_folder_web_url
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        cloud_web_url = excluded.cloud_web_url,
        cloud_folder_web_url = excluded.cloud_folder_web_url,
        scanned_at = excluded.scanned_at
      RETURNING *`
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
      input.cloudSha256 ?? null,
      input.cloudWebUrl ?? null,
      input.cloudFolderWebUrl ?? null
    ) as PhotoRow;

  return rowToPhoto(result);
}

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

export function recordPhotoIssues(photoId: number, issues: ValidationIssue[]): void {
  if (issues.length === 0) return;
  const db = getDb();
  db.prepare('DELETE FROM photo_issues WHERE photo_id = ?').run(photoId);
  const insert = db.prepare(
    'INSERT INTO photo_issues (photo_id, issue_code, field, raw_value, detected_at) VALUES (?, ?, ?, ?, ?)'
  );
  const now = Date.now();
  for (const issue of issues) {
    insert.run(photoId, issue.code, issue.field, issue.rawValue, now);
  }
}

export interface PhotoIssueEntry {
  photoId: number;
  path: string;
  source: string;
  issueCodes: string[];
}

export function getPhotosWithIssues(): PhotoIssueEntry[] {
  const rows = getDb()
    .prepare(
      `SELECT p.id AS photoId, p.path, p.source,
              GROUP_CONCAT(pi.issue_code) AS issueCodes
       FROM photo_issues pi
       JOIN photos p ON p.id = pi.photo_id
       GROUP BY p.id
       ORDER BY pi.detected_at DESC`
    )
    .all() as Array<{ photoId: number; path: string; source: string; issueCodes: string }>;

  return rows.map((r) => ({
    photoId: r.photoId,
    path: r.path,
    source: r.source,
    issueCodes: r.issueCodes.split(','),
  }));
}

export function getPhotoById(id: number): Photo | null {
  const row = getDb().prepare('SELECT * FROM photos WHERE id = ?').get(id) as PhotoRow | undefined;
  return row ? rowToPhoto(row) : null;
}

export function getPhotosByIds(ids: number[]): Photo[] {
  if (ids.length === 0) return [];
  const db = getDb();
  const CHUNK_SIZE = 500;
  const results: Photo[] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const placeholders = chunk.map(() => '?').join(',');
    const rows = db
      .prepare(`SELECT * FROM photos WHERE id IN (${placeholders})`)
      .all(...chunk) as PhotoRow[];
    results.push(...rows.map(rowToPhoto));
  }
  return results;
}

export function getPhotosWithLocation(): Photo[] {
  const rows = getDb()
    .prepare(
      'SELECT * FROM photos WHERE latitude IS NOT NULL AND longitude IS NOT NULL ORDER BY scanned_at DESC'
    )
    .all() as PhotoRow[];
  return rows.map(rowToPhoto);
}

export function updatePhotoPath(photoId: number, newPath: string): void {
  const result = getDb().prepare('UPDATE photos SET path = ? WHERE id = ?').run(newPath, photoId);
  if (result.changes === 0) {
    throw new Error(`Photo not found: ${photoId}`);
  }
}

export function clearAllPhotos(): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare('DELETE FROM photo_issues').run();
    db.prepare('DELETE FROM operation_batch_files').run();
    db.prepare('DELETE FROM operation_batch').run();
    db.prepare('DELETE FROM photos').run();
  })();
}

export function getPhotoDateRange(): { minDate: number | null; maxDate: number | null } {
  return getDb()
    .prepare(
      `SELECT MIN(timestamp) as minDate, MAX(timestamp) as maxDate
       FROM photos
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND timestamp IS NOT NULL`
    )
    .get() as { minDate: number | null; maxDate: number | null };
}

export function getPhotoHistogram(
  minDate: number,
  maxDate: number,
  bucketCount: number,
  gpsOnly: boolean
): { bucket: number; count: number }[] {
  const bucketWidth = (maxDate - minDate) / bucketCount;
  if (bucketWidth <= 0) return [];

  const gpsClause = gpsOnly ? 'AND latitude IS NOT NULL AND longitude IS NOT NULL' : '';
  return getDb()
    .prepare(
      `SELECT
        MAX(MIN(CAST((timestamp - :min) / :width AS INTEGER), :n - 1), 0) AS bucket,
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
}

export function getPhotoCountWithLocation(): number {
  const result = getDb()
    .prepare(
      'SELECT COUNT(*) as count FROM photos WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
    )
    .get() as { count: number };
  return result.count;
}
