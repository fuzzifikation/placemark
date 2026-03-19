/**
 * Placemarks storage service
 * CRUD operations for user-saved geo+time filter bookmarks
 */

import { app } from 'electron';
import * as path from 'path';
import Database from 'better-sqlite3';
import { Placemark, CreatePlacemarkInput, UpdatePlacemarkInput } from '@placemark/core';
import { initializeDatabase, closeDatabase } from '../database/schema';

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'placemark.db');
    db = initializeDatabase({ path: dbPath });
  }
  return db;
}

export function closePlacemarksStorage(): void {
  if (db) {
    closeDatabase(db);
    db = null;
  }
}

// ============================================================================
// Row mapping
// ============================================================================

function rowToPlacemark(row: any): Placemark {
  const hasBounds =
    row.bounds_north !== null &&
    row.bounds_south !== null &&
    row.bounds_east !== null &&
    row.bounds_west !== null;

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    bounds: hasBounds
      ? {
          north: row.bounds_north,
          south: row.bounds_south,
          east: row.bounds_east,
          west: row.bounds_west,
        }
      : null,
    dateStart: row.date_start ?? null,
    dateEnd: row.date_end ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// CRUD
// ============================================================================

export function getAllPlacemarks(): Placemark[] {
  const rows = getDb().prepare('SELECT * FROM placemarks ORDER BY created_at ASC').all();
  return rows.map(rowToPlacemark);
}

export function createPlacemark(input: CreatePlacemarkInput): Placemark {
  const row = getDb()
    .prepare(
      `INSERT INTO placemarks (name, type, bounds_north, bounds_south, bounds_east, bounds_west, date_start, date_end)
       VALUES (?, 'user', ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
    .get(
      input.name,
      input.bounds?.north ?? null,
      input.bounds?.south ?? null,
      input.bounds?.east ?? null,
      input.bounds?.west ?? null,
      input.dateStart,
      input.dateEnd
    );
  return rowToPlacemark(row);
}

export function updatePlacemark(input: UpdatePlacemarkInput): Placemark {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM placemarks WHERE id = ?').get(input.id) as any;
  if (!existing) {
    throw new Error(`Placemark ${input.id} not found`);
  }

  const name = input.name ?? existing.name;
  const bounds = input.bounds !== undefined ? input.bounds : rowToPlacemark(existing).bounds;
  const dateStart = input.dateStart !== undefined ? input.dateStart : existing.date_start;
  const dateEnd = input.dateEnd !== undefined ? input.dateEnd : existing.date_end;

  const row = db
    .prepare(
      `UPDATE placemarks
       SET name = ?, bounds_north = ?, bounds_south = ?, bounds_east = ?, bounds_west = ?,
           date_start = ?, date_end = ?, updated_at = datetime('now')
       WHERE id = ?
       RETURNING *`
    )
    .get(
      name,
      bounds?.north ?? null,
      bounds?.south ?? null,
      bounds?.east ?? null,
      bounds?.west ?? null,
      dateStart,
      dateEnd,
      input.id
    );
  return rowToPlacemark(row);
}

export function deletePlacemark(id: number): void {
  getDb().prepare('DELETE FROM placemarks WHERE id = ?').run(id);
}

// ============================================================================
// Photo count queries
// ============================================================================

/**
 * Count photos that fall within a placemark's geo+time filter.
 * Mirrors the filter logic used by the map views.
 */
export function getPlacemarkPhotoCount(placemark: Placemark): number {
  const db = getDb();

  const conditions: string[] = ['latitude IS NOT NULL', 'longitude IS NOT NULL'];
  const params: (string | number)[] = [];

  if (placemark.bounds) {
    const { north, south, east, west } = placemark.bounds;
    conditions.push('latitude <= ?', 'latitude >= ?');
    params.push(north, south);

    // Handle IDL crossing: when west > east the box wraps around the date line
    if (west > east) {
      conditions.push('(longitude >= ? OR longitude <= ?)');
      params.push(west, east);
    } else {
      conditions.push('longitude >= ?', 'longitude <= ?');
      params.push(west, east);
    }
  }

  if (placemark.dateStart) {
    conditions.push('timestamp >= ?');
    params.push(new Date(placemark.dateStart).getTime());
  }
  if (placemark.dateEnd) {
    // Include entire end day: use start of next day as exclusive upper bound
    const d = new Date(placemark.dateEnd);
    d.setUTCDate(d.getUTCDate() + 1);
    conditions.push('timestamp < ?');
    params.push(d.getTime());
  }

  const sql = `SELECT COUNT(*) as count FROM photos WHERE ${conditions.join(' AND ')}`;
  const row = db.prepare(sql).get(...params) as { count: number };
  return row.count;
}

// ============================================================================
// Smart placemark counts (hardcoded queries, no DB rows)
// ============================================================================

export function getThisYearPhotoCount(): number {
  const year = new Date().getFullYear();
  const startMs = new Date(year, 0, 1).getTime();
  const endMs = new Date(year + 1, 0, 1).getTime();
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) as count FROM photos
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL
         AND timestamp >= ? AND timestamp < ?`
    )
    .get(startMs, endMs) as { count: number };
  return row.count;
}

export function getLast3MonthsPhotoCount(): number {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) as count FROM photos
       WHERE latitude IS NOT NULL AND longitude IS NOT NULL
         AND timestamp >= ?`
    )
    .get(Date.now() - 90 * 24 * 60 * 60 * 1000) as { count: number };
  return row.count;
}
