/**
 * Database connection singleton — lazy-initialized on first getDb() call.
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
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
