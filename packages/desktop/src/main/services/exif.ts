/**
 * EXIF extraction service
 * Extracts GPS coordinates and timestamps from photos
 */

import exifr from 'exifr';
import { isSupportedImageFile as checkSupportedImage } from './formats';

export interface ExifData {
  latitude?: number;
  longitude?: number;
  timestamp?: number;
}

// Re-export format helper for convenience
export const isSupportedImageFile = checkSupportedImage;

/**
 * Extract EXIF data from a photo file
 * Only extracts GPS and timestamp to minimize processing time
 *
 * exifr automatically handles all image formats (JPEG, RAW, HEIC, TIFF, etc.) by detecting
 * file signatures. Uses optimal 512-byte chunks for Node.js local file I/O.
 *
 * Safety: This function only READS from photo files, never writes or modifies them.
 */
export async function extractExif(filePath: string): Promise<ExifData> {
  try {
    // Single parse operation extracts both GPS and timestamp data
    // exifr detects file format automatically (no extension checking needed)
    const data = await exifr.parse(filePath, {
      gps: true,
      pick: ['DateTimeOriginal', 'CreateDate', 'DateTime'],
    });

    const result: ExifData = {};

    // GPS coordinates — reject (0, 0) as implausible (default/error value from faulty firmware)
    if (data?.latitude !== undefined && data?.longitude !== undefined) {
      if (data.latitude !== 0 || data.longitude !== 0) {
        result.latitude = data.latitude;
        result.longitude = data.longitude;
      }
    }

    // Timestamp
    if (data) {
      const dateTime = data.DateTimeOriginal || data.CreateDate || data.DateTime;
      if (dateTime) {
        result.timestamp = new Date(dateTime).getTime();
      }
    }

    return result;
  } catch (error) {
    // Silently skip files with unreadable EXIF data
    return {};
  }
}
