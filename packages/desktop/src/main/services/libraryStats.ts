/**
 * Library statistics — aggregate queries for the stats panel, plus the
 * in-memory last-import summary (reset on app restart).
 */

import { getDb } from './storageConnection';

// ── Last import summary (in-memory, reset on app restart) ────────────────────

export interface LastImportSummary {
  source: 'local' | 'onedrive';
  scanned: number;
  imported: number;
  duplicates: number;
  completedAt: number;
}

let lastImportSummary: LastImportSummary | null = null;

export function setLastImportSummary(summary: LastImportSummary): void {
  lastImportSummary = summary;
}

export function getLastImportSummary(): LastImportSummary | null {
  return lastImportSummary;
}

// ── Full library stats ───────────────────────────────────────────────────────

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
  photosWithIssues: number;
  lastImportSummary: LastImportSummary | null;
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
       FROM photos GROUP BY mime_type ORDER BY count DESC`
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
       ORDER BY count DESC`
    )
    .all() as Array<{ make: string; model: string; count: number }>;

  const issuesRow = db
    .prepare(`SELECT COUNT(DISTINCT photo_id) AS photosWithIssues FROM photo_issues`)
    .get() as { photosWithIssues: number };

  return {
    ...summary,
    oldestPhotoId: oldestRow?.id ?? null,
    newestPhotoId: newestRow?.id ?? null,
    formatBreakdown: formatRows,
    cameraBreakdown: cameraRows,
    photosWithIssues: issuesRow.photosWithIssues,
    lastImportSummary: getLastImportSummary(),
  };
}
