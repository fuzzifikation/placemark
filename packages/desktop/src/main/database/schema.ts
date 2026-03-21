/**
 * Database schema management for Placemark
 */

import Database from 'better-sqlite3';

export interface DatabaseOptions {
  path: string;
  readonly?: boolean;
}

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL CHECK(source IN ('local', 'onedrive', 'network')),
    path TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    timestamp INTEGER,
    file_hash TEXT,
    scanned_at INTEGER NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    camera_make TEXT,
    camera_model TEXT,
    UNIQUE(source, path)
  );

  CREATE INDEX IF NOT EXISTS idx_photos_coords ON photos(latitude, longitude);
  CREATE INDEX IF NOT EXISTS idx_photos_timestamp ON photos(timestamp);
  CREATE INDEX IF NOT EXISTS idx_photos_hash ON photos(file_hash);
  CREATE INDEX IF NOT EXISTS idx_photos_source ON photos(source);

  CREATE TABLE IF NOT EXISTS operation_batch (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation TEXT NOT NULL CHECK(operation IN ('copy', 'move')),
    timestamp INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed', 'cancelled', 'undone', 'archived')),
    error TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_operation_batch_timestamp ON operation_batch(timestamp);
  CREATE INDEX IF NOT EXISTS idx_operation_batch_status ON operation_batch(status);

  CREATE TABLE IF NOT EXISTS operation_batch_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_id INTEGER NOT NULL,
    photo_id INTEGER,
    source_path TEXT NOT NULL,
    dest_path TEXT NOT NULL,
    FOREIGN KEY (batch_id) REFERENCES operation_batch(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_operation_batch_files_batch ON operation_batch_files(batch_id);
  CREATE INDEX IF NOT EXISTS idx_operation_batch_files_photo ON operation_batch_files(photo_id);

  CREATE TABLE IF NOT EXISTS placemarks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    name         TEXT NOT NULL,
    type         TEXT NOT NULL DEFAULT 'user' CHECK(type IN ('user', 'suggested')),
    bounds_north REAL,
    bounds_south REAL,
    bounds_east  REAL,
    bounds_west  REAL,
    geo_label    TEXT,
    date_start   TEXT,
    date_end     TEXT,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_placemarks_type ON placemarks(type);
`;

export function initializeDatabase(options: DatabaseOptions): Database.Database {
  const db = new Database(options.path, {
    readonly: options.readonly ?? false,
    fileMustExist: false,
  });

  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA_SQL);

  // Add camera columns to existing databases that pre-date this schema version.
  // SQLite does not support ALTER TABLE ADD COLUMN IF NOT EXISTS, so we use try-catch.
  try {
    db.exec('ALTER TABLE photos ADD COLUMN camera_make TEXT');
  } catch {
    /* already exists */
  }
  try {
    db.exec('ALTER TABLE photos ADD COLUMN camera_model TEXT');
  } catch {
    /* already exists */
  }

  try {
    db.exec('ALTER TABLE placemarks ADD COLUMN geo_label TEXT');
  } catch {
    /* already exists */
  }

  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(db: Database.Database): void {
  db.close();
}
