-- Initial schema for Placemark
-- Create photos table with geographic and temporal indexing

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

-- Index for geographic queries (bounding box searches)
CREATE INDEX IF NOT EXISTS idx_photos_coords ON photos(latitude, longitude);

-- Index for temporal queries (date range filters)
CREATE INDEX IF NOT EXISTS idx_photos_timestamp ON photos(timestamp);

-- Index for deduplication
CREATE INDEX IF NOT EXISTS idx_photos_hash ON photos(file_hash);

-- Index for source filtering
CREATE INDEX IF NOT EXISTS idx_photos_source ON photos(source);

-- Create sources table
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK(type IN ('local', 'onedrive', 'network')),
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  last_scan INTEGER,
  enabled INTEGER NOT NULL DEFAULT 1,
  UNIQUE(type, path)
);

-- Create operation log for file operations
CREATE TABLE IF NOT EXISTS operation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation TEXT NOT NULL CHECK(operation IN ('copy', 'move')),
  source_path TEXT NOT NULL,
  dest_path TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed')),
  error TEXT
);

-- Index for operation history queries
CREATE INDEX IF NOT EXISTS idx_operation_log_timestamp ON operation_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_operation_log_status ON operation_log(status);
