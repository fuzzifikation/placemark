/**
 * EXIF extraction service
 * Extracts GPS coordinates and timestamps from photos
 */

import exifr from 'exifr';
import { isSupportedImageFile as checkSupportedImage } from './formats';
import {
  normalizeGps,
  normalizeCameraMake,
  normalizeTimestamp,
  ValidationIssue,
} from './photoMetadata';

export interface ExifData {
  latitude?: number;
  longitude?: number;
  timestamp?: number;
  cameraMake?: string;
  cameraModel?: string;
  /** Validation issues found in this photo's metadata. */
  issues?: ValidationIssue[];
}

// Re-export format helper for convenience
export const isSupportedImageFile = checkSupportedImage;

/**
 * Extract EXIF data from a photo file
 * Only extracts GPS and timestamp to minimize processing time
 *
 * exifr handles standard formats (JPEG, HEIC, TIFF, PNG) reliably. RAW support is partial —
 * TIFF-based formats (NEF, ARW, DNG, CR2) work for GPS; CR3 is not supported by exifr 7.x.
 * exifr detects file format by
 * file signatures. Uses optimal 512-byte chunks for Node.js local file I/O.
 *
 * Safety: This function only READS from photo files, never writes or modifies them.
 */
export async function extractExif(filePath: string): Promise<ExifData> {
  try {
    // Single parse operation extracts both GPS and timestamp data.
    // exifr detects file format automatically (no extension checking needed).
    // NOTE: Do NOT use `pick` together with `gps: true` — `pick` filters GPS tags
    // before exifr can compute latitude/longitude, silently dropping all GPS data.
    // Instead, disable heavy segments we don't need.
    const data = await exifr.parse(filePath, {
      gps: true, // GPS IFD → latitude, longitude
      exif: true, // EXIF IFD → DateTimeOriginal, CreateDate
      tiff: true, // IFD0 → DateTime, Make, Model
      makerNote: false, // Skip large camera maker notes
      iptc: false,
      xmp: false,
      icc: false,
      jfif: false,
      ihdr: false,
    });

    const result: ExifData = {};
    const issues: ValidationIssue[] = [];

    // GPS — shared normalizer rejects (0, 0)
    const gpsResult = normalizeGps(data?.latitude, data?.longitude);
    if (gpsResult.gps) {
      result.latitude = gpsResult.gps.latitude;
      result.longitude = gpsResult.gps.longitude;
    } else if (gpsResult.issue) {
      issues.push(gpsResult.issue);
    }

    if (data) {
      // Timestamp — shared normalizer rejects invalid/future dates
      const dateTime = data.DateTimeOriginal || data.CreateDate || data.DateTime;
      const tsResult = normalizeTimestamp(dateTime);
      result.timestamp = tsResult.timestamp;
      if (tsResult.issue) issues.push(tsResult.issue);

      // Camera make — shared normalizer applies title-case
      result.cameraMake = normalizeCameraMake(data.Make);

      // Model keeps original casing (e.g. "SM-G991B" is meaningful)
      if (typeof data.Model === 'string' && data.Model.trim()) {
        result.cameraModel = data.Model.trim();
      }
    }

    if (issues.length > 0) result.issues = issues;
    return result;
  } catch (error) {
    // Silently skip files with unreadable EXIF data
    return {};
  }
}
