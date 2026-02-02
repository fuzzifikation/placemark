/**
 * Database schema management for Placemark
 * Handles SQLite initialization and migrations
 */

import Database from 'better-sqlite3';
import { logger } from '../services/logger';

export interface DatabaseOptions {
  path: string;
  readonly?: boolean;
}

// Embedded migrations to avoid file system issues in production builds
const MIGRATIONS: Array<{ version: number; name: string; sql: string }> = [
  {
    version: 1,
    name: 'initial',
    sql: `
      -- Initial schema for Placemark
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
        UNIQUE(source, path)
      );

      CREATE INDEX IF NOT EXISTS idx_photos_coords ON photos(latitude, longitude);
      CREATE INDEX IF NOT EXISTS idx_photos_timestamp ON photos(timestamp);
      CREATE INDEX IF NOT EXISTS idx_photos_hash ON photos(file_hash);
      CREATE INDEX IF NOT EXISTS idx_photos_source ON photos(source);

      CREATE TABLE IF NOT EXISTS sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('local', 'onedrive', 'network')),
        path TEXT NOT NULL,
        name TEXT NOT NULL,
        last_scan INTEGER,
        enabled INTEGER NOT NULL DEFAULT 1,
        UNIQUE(type, path)
      );

      CREATE TABLE IF NOT EXISTS operation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT NOT NULL CHECK(operation IN ('copy', 'move')),
        source_path TEXT NOT NULL,
        dest_path TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed')),
        error TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_operation_log_timestamp ON operation_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_operation_log_status ON operation_log(status);
    `,
  },
  {
    version: 2,
    name: 'add_undone_status',
    sql: `
      -- SQLite doesn't support ALTER TABLE to modify constraints
      -- We need to recreate the table with the new constraint
      CREATE TABLE IF NOT EXISTS operation_log_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT NOT NULL CHECK(operation IN ('copy', 'move')),
        source_path TEXT NOT NULL,
        dest_path TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed', 'undone')),
        error TEXT
      );

      INSERT INTO operation_log_new SELECT * FROM operation_log;
      DROP TABLE operation_log;
      ALTER TABLE operation_log_new RENAME TO operation_log;

      CREATE INDEX IF NOT EXISTS idx_operation_log_timestamp ON operation_log(timestamp);
      CREATE INDEX IF NOT EXISTS idx_operation_log_status ON operation_log(status);
    `,
  },
  {
    version: 3,
    name: 'batch_operations',
    sql: `
      -- Add batch operations support
      -- Each batch has multiple files, enabling atomic undo of entire batches

      CREATE TABLE IF NOT EXISTS operation_batch (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation TEXT NOT NULL CHECK(operation IN ('copy', 'move')),
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed', 'undone', 'archived')),
        error TEXT
      );

      CREATE TABLE IF NOT EXISTS operation_batch_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_id INTEGER NOT NULL,
        source_path TEXT NOT NULL,
        dest_path TEXT NOT NULL,
        FOREIGN KEY (batch_id) REFERENCES operation_batch(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_operation_batch_timestamp ON operation_batch(timestamp);
      CREATE INDEX IF NOT EXISTS idx_operation_batch_status ON operation_batch(status);
      CREATE INDEX IF NOT EXISTS idx_operation_batch_files_batch ON operation_batch_files(batch_id);
    `,
  },
  {
    version: 4,
    name: 'batch_files_photo_id',
    sql: `
      -- Add photo_id to batch files for updating photo paths after move operations
      ALTER TABLE operation_batch_files ADD COLUMN photo_id INTEGER;
      CREATE INDEX IF NOT EXISTS idx_operation_batch_files_photo ON operation_batch_files(photo_id);
    `,
  },
];

/**
 * Initialize database and run migrations
 */
export function initializeDatabase(options: DatabaseOptions): Database.Database {
  const db = new Database(options.path, {
    readonly: options.readonly ?? false,
    fileMustExist: false,
  });

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Use WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Run migrations
  runMigrations(db);

  return db;
}

/**
 * Run all pending migrations
 */
function runMigrations(db: Database.Database): void {
  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `);

  // Get current schema version
  const currentVersion = db
    .prepare('SELECT COALESCE(MAX(version), 0) as version FROM schema_migrations')
    .get() as { version: number };

  // Apply pending migrations
  for (const migration of MIGRATIONS) {
    if (migration.version <= currentVersion.version) {
      continue;
    }

    logger.info(`Applying migration ${migration.version}-${migration.name}...`);

    db.transaction(() => {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
        migration.version,
        Date.now()
      );
    })();

    logger.info(`Migration ${migration.version}-${migration.name} applied successfully`);
  }
}

/**
 * Close database connection
 */
export function closeDatabase(db: Database.Database): void {
  db.close();
}
