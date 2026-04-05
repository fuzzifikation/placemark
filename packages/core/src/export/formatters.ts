/**
 * Export formatters — pure functions, no I/O, no platform dependencies.
 * Each formatter accepts a Photo array and returns a string ready for file writing.
 */

import type { Photo } from '../models/Photo';
import { getBasename } from '../utils';

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/** Wrap a value in double-quotes and escape any embedded double-quotes. */
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If the value contains a comma, double-quote, or newline it must be quoted
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CSV_HEADER = 'filename,date_iso,latitude,longitude,camera_make,camera_model,folder_path';

/**
 * Export photos as CSV.
 * Columns: filename, date_iso (ISO 8601), latitude, longitude, camera_make, camera_model, folder_path.
 * Only photos with GPS coordinates are included.
 */
export function toCsv(photos: Photo[]): string {
  const rows = [CSV_HEADER];
  for (const photo of photos) {
    if (!Number.isFinite(photo.latitude) || !Number.isFinite(photo.longitude)) continue;

    const filename = getBasename(photo.path);
    const folderPath = photo.path.substring(0, photo.path.length - filename.length - 1);
    const dateIso = photo.timestamp ? new Date(photo.timestamp).toISOString() : '';

    rows.push(
      [
        csvCell(filename),
        csvCell(dateIso),
        csvCell(photo.latitude),
        csvCell(photo.longitude),
        csvCell(photo.cameraMake),
        csvCell(photo.cameraModel),
        csvCell(folderPath),
      ].join(',')
    );
  }
  return rows.join('\r\n');
}

// ---------------------------------------------------------------------------
// GeoJSON
// ---------------------------------------------------------------------------

/**
 * Export photos as a GeoJSON FeatureCollection (RFC 7946).
 * Each photo with GPS coordinates becomes a Point Feature.
 * All photo fields are stored as properties.
 */
export function toGeoJson(photos: Photo[]): string {
  const features = photos
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .map((photo) => {
      const filename = getBasename(photo.path);
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          // GeoJSON uses [longitude, latitude] order
          coordinates: [photo.longitude, photo.latitude],
        },
        properties: {
          filename,
          path: photo.path,
          date: photo.timestamp ? new Date(photo.timestamp).toISOString() : null,
          camera_make: photo.cameraMake,
          camera_model: photo.cameraModel,
          source: photo.source,
        },
      };
    });

  const collection = {
    type: 'FeatureCollection',
    features,
  };

  return JSON.stringify(collection, null, 2);
}

// ---------------------------------------------------------------------------
// GPX
// ---------------------------------------------------------------------------

/** Escape characters that are invalid inside XML text content. */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Export photos as a GPX 1.1 file.
 * Each photo with GPS coordinates becomes a waypoint (<wpt>).
 * Waypoints are sorted chronologically (photos without timestamps come last).
 */
export function toGpx(photos: Photo[]): string {
  const withGps = photos
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .slice()
    .sort((a, b) => {
      if (a.timestamp === null && b.timestamp === null) return 0;
      if (a.timestamp === null) return 1;
      if (b.timestamp === null) return -1;
      return a.timestamp - b.timestamp;
    });

  const waypoints = withGps
    .map((photo) => {
      const filename = getBasename(photo.path);
      const timeTag = photo.timestamp
        ? `\n    <time>${new Date(photo.timestamp).toISOString()}</time>`
        : '';
      return (
        `  <wpt lat="${photo.latitude}" lon="${photo.longitude}">` +
        `\n    <name>${xmlEscape(filename)}</name>` +
        timeTag +
        `\n  </wpt>`
      );
    })
    .join('\n');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="Placemark"\n` +
    `  xmlns="http://www.topografix.com/GPX/1/1"\n` +
    `  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n` +
    `  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n` +
    waypoints +
    `\n</gpx>`
  );
}
