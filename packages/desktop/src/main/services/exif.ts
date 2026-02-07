/**
 * EXIF extraction service
 * Extracts GPS coordinates and timestamps from photos
 */

import exifr from 'exifr';

export interface ExifData {
  latitude?: number;
  longitude?: number;
  timestamp?: number;
}

/**
 * Extract EXIF data from a photo file
 * Only extracts GPS and timestamp to minimize processing time
 */
export async function extractExif(filePath: string): Promise<ExifData> {
  try {
    // Extract GPS data - exifr returns latitude/longitude directly when gps: true
    const gpsData = await exifr.gps(filePath);

    // Extract date/time separately
    const exifData = await exifr.parse(filePath, {
      pick: ['DateTimeOriginal', 'CreateDate', 'DateTime'],
    });

    const result: ExifData = {};

    // GPS coordinates — reject (0, 0) as implausible (default/error value from faulty firmware)
    if (gpsData && gpsData.latitude !== undefined && gpsData.longitude !== undefined) {
      if (gpsData.latitude !== 0 || gpsData.longitude !== 0) {
        result.latitude = gpsData.latitude;
        result.longitude = gpsData.longitude;
      }
    }

    // Timestamp
    if (exifData) {
      const dateTime = exifData.DateTimeOriginal || exifData.CreateDate || exifData.DateTime;
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

/**
 * Check if file is a supported image format
 */
export function isSupportedImageFile(filePath: string): boolean {
  const ext = filePath.toLowerCase().split('.').pop();
  const supported = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'tiff', 'tif', 'webp'];
  return supported.includes(ext || '');
}
