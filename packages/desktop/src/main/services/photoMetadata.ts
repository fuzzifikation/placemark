/**
 * Shared photo metadata normalization helpers.
 *
 * Used by both the local file scan path (exif.ts → filesystem.ts)
 * and the OneDrive import path (onedriveImport.ts).
 * Contains no platform dependencies — pure data transformation only.
 */

// ── Issue types ───────────────────────────────────────────────────────────────

export type PhotoIssueCode = 'gps_zero' | 'future_timestamp' | 'invalid_timestamp';

/** A validation problem found in a photo's raw metadata. */
export interface ValidationIssue {
  code: PhotoIssueCode;
  /** Which EXIF/Graph field the issue originates from */
  field: string;
  /** The original raw value that was rejected, as a string */
  rawValue: string;
}

// ── GPS ───────────────────────────────────────────────────────────────────────

export interface NormalizedGps {
  latitude: number;
  longitude: number;
}

export interface GpsResult {
  gps?: NormalizedGps;
  issue?: ValidationIssue;
}

/**
 * Validate GPS coordinates.
 * Returns the validated gps object, or an issue if the values are suspicious.
 * Rejects (0, 0) — a known default/error value produced by faulty firmware.
 */
export function normalizeGps(
  latitude: number | undefined,
  longitude: number | undefined
): GpsResult {
  if (latitude === undefined || longitude === undefined) return {};
  if (latitude === 0 && longitude === 0) {
    return {
      issue: { code: 'gps_zero', field: 'latitude/longitude', rawValue: '0,0' },
    };
  }
  return { gps: { latitude, longitude } };
}

// ── Camera make ───────────────────────────────────────────────────────────────

/**
 * Normalize camera make to title-case so "SAMSUNG", "Samsung", "samsung"
 * all become "Samsung". Returns undefined for absent/blank values.
 */
export function normalizeCameraMake(make: string | undefined): string | undefined {
  if (!make?.trim()) return undefined;
  return make
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Timestamp ─────────────────────────────────────────────────────────────────

export interface TimestampResult {
  timestamp?: number;
  issue?: ValidationIssue;
}

/**
 * Parse and validate a date string or Date object to a Unix millisecond timestamp.
 * - Returns an issue for unparseable values.
 * - Returns an issue for timestamps after the current system clock
 *   (no photo can be taken in the future — indicates wrong device clock).
 *   The timestamp is still stored so the photo remains usable.
 */
export function normalizeTimestamp(value: string | Date | undefined): TimestampResult {
  if (!value) return {};
  const raw = String(value);
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  if (!Number.isFinite(ms)) {
    return { issue: { code: 'invalid_timestamp', field: 'timestamp', rawValue: raw } };
  }
  if (ms > Date.now()) {
    return {
      timestamp: ms,
      issue: { code: 'future_timestamp', field: 'timestamp', rawValue: raw },
    };
  }
  return { timestamp: ms };
}
