/**
 * SQL query builders for storage operations
 * Platform-agnostic query construction helpers
 */

/**
 * Build SELECT query for photos with location
 */
export function buildPhotoWithLocationQuery(): string {
  return `
    SELECT * FROM photos 
    WHERE latitude IS NOT NULL 
      AND longitude IS NOT NULL 
    ORDER BY scanned_at DESC
  `.trim();
}

/**
 * Build SELECT query for photos in date range
 */
export function buildPhotoDateRangeQuery(): string {
  return `
    SELECT * FROM photos 
    WHERE latitude IS NOT NULL 
      AND longitude IS NOT NULL 
      AND timestamp BETWEEN ? AND ?
    ORDER BY timestamp ASC
  `.trim();
}

/**
 * Build SELECT query for photos in bounding box
 * @param crossesIdl - Whether the bounding box crosses the International Date Line
 */
export function buildPhotoBoundsQuery(crossesIdl: boolean): string {
  const longitudeClause = crossesIdl
    ? '(longitude >= ? OR longitude <= ?)'
    : 'longitude BETWEEN ? AND ?';

  return `
    SELECT * FROM photos 
    WHERE latitude IS NOT NULL 
      AND longitude IS NOT NULL 
      AND latitude BETWEEN ? AND ? 
      AND ${longitudeClause}
    ORDER BY timestamp ASC
  `.trim();
}

/**
 * Build SELECT query for photos in bounding box with date range
 */
export function buildPhotoBoundsAndDateQuery(crossesIdl: boolean): string {
  const longitudeClause = crossesIdl
    ? '(longitude >= ? OR longitude <= ?)'
    : 'longitude BETWEEN ? AND ?';

  return `
    SELECT * FROM photos 
    WHERE latitude IS NOT NULL 
      AND longitude IS NOT NULL 
      AND latitude BETWEEN ? AND ? 
      AND ${longitudeClause}
      AND timestamp BETWEEN ? AND ?
    ORDER BY timestamp ASC
  `.trim();
}

/**
 * Build SELECT query for date range (min/max)
 */
export function buildDateRangeStatsQuery(): string {
  return `
    SELECT 
      MIN(timestamp) as minDate, 
      MAX(timestamp) as maxDate 
    FROM photos 
    WHERE timestamp IS NOT NULL
  `.trim();
}

/**
 * Build SELECT query for photo count with location
 */
export function buildPhotoCountQuery(): string {
  return `
    SELECT COUNT(*) as count 
    FROM photos 
    WHERE latitude IS NOT NULL 
      AND longitude IS NOT NULL
  `.trim();
}

/**
 * Build UPSERT query for photos
 */
export function buildPhotoUpsertQuery(): string {
  return `
    INSERT INTO photos (
      source, path, latitude, longitude, timestamp, 
      file_hash, scanned_at, file_size, mime_type
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source, path) DO UPDATE SET
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      timestamp = excluded.timestamp,
      scanned_at = excluded.scanned_at
    RETURNING *
  `.trim();
}
