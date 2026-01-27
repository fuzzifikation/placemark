-- Thumbnail cache database schema
-- Stores 400px JPEG thumbnails with LRU eviction

CREATE TABLE IF NOT EXISTS thumbnails (
  photo_id INTEGER PRIMARY KEY,
  thumbnail_data BLOB NOT NULL,
  size_bytes INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_accessed_at INTEGER NOT NULL,
  FOREIGN KEY (photo_id) REFERENCES photos(id) ON DELETE CASCADE
);

-- Index for LRU eviction (find least recently used)
CREATE INDEX IF NOT EXISTS idx_thumbnails_lru ON thumbnails(last_accessed_at);

-- Metadata table for cache management
CREATE TABLE IF NOT EXISTS thumbnail_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Store configuration
INSERT OR REPLACE INTO thumbnail_metadata (key, value) VALUES ('max_size_mb', '500');
INSERT OR REPLACE INTO thumbnail_metadata (key, value) VALUES ('total_size_bytes', '0');
INSERT OR REPLACE INTO thumbnail_metadata (key, value) VALUES ('thumbnail_count', '0');
