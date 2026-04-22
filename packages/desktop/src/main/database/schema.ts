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
    cloud_item_id TEXT,
    cloud_folder_path TEXT,
    cloud_sha256 TEXT,
    cloud_web_url TEXT,
    cloud_folder_web_url TEXT,
    UNIQUE(source, path)
  );

  CREATE INDEX IF NOT EXISTS idx_photos_coords ON photos(latitude, longitude);
  CREATE INDEX IF NOT EXISTS idx_photos_timestamp ON photos(timestamp);
  CREATE INDEX IF NOT EXISTS idx_photos_hash ON photos(file_hash);
  CREATE INDEX IF NOT EXISTS idx_photos_source ON photos(source);
  CREATE INDEX IF NOT EXISTS idx_photos_cloud_sha256 ON photos(cloud_sha256);
  CREATE INDEX IF NOT EXISTS idx_photos_cloud_lookup ON photos(source, cloud_item_id);

  CREATE TABLE IF NOT EXISTS operation_batch (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation TEXT NOT NULL CHECK(operation IN ('copy', 'move', 'delete')),
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
    file_op TEXT NOT NULL DEFAULT 'move' CHECK(file_op IN ('copy', 'move', 'delete', 'delete-source')),
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

  CREATE TABLE IF NOT EXISTS photo_issues (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    photo_id     INTEGER NOT NULL,
    issue_code   TEXT NOT NULL CHECK(issue_code IN ('gps_zero', 'gps_nan', 'future_timestamp', 'invalid_timestamp')),
    field        TEXT NOT NULL,
    raw_value    TEXT,
    detected_at  INTEGER NOT NULL,
    FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE,
    UNIQUE(photo_id, issue_code)
  );

  CREATE INDEX IF NOT EXISTS idx_photo_issues_photo ON photo_issues(photo_id);
  CREATE INDEX IF NOT EXISTS idx_photo_issues_code  ON photo_issues(issue_code);
`;

export function initializeDatabase(options: DatabaseOptions): Database.Database {
  const db = new Database(options.path, {
    readonly: options.readonly ?? false,
    fileMustExist: false,
  });

  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  db.exec(SCHEMA_SQL);

  return db;
}

/**
 * Close database connection
 */
export function closeDatabase(db: Database.Database): void {
  db.close();
}
