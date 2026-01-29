/**
 * Geographic filtering logic - platform-agnostic
 * Handles bounding box calculations and coordinate filtering
 */

import { Photo } from '../models/Photo';

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Check if a photo is within a geographic bounding box
 * Handles International Date Line crossing
 */
export function isPhotoInBounds(photo: Photo, bounds: BoundingBox): boolean {
  if (photo.latitude === null || photo.longitude === null) {
    return false;
  }

  // Latitude check (always simple)
  const latOk = photo.latitude <= bounds.north && photo.latitude >= bounds.south;
  if (!latOk) return false;

  // Longitude check (handle IDL crossing)
  const crossesIdl = bounds.west > bounds.east;

  if (crossesIdl) {
    // Box crosses International Date Line
    // Photo is in box if longitude >= west OR longitude <= east
    return photo.longitude >= bounds.west || photo.longitude <= bounds.east;
  } else {
    // Standard box
    return photo.longitude >= bounds.west && photo.longitude <= bounds.east;
  }
}

/**
 * Filter photos array by bounding box
 */
export function filterPhotosByBounds(photos: Photo[], bounds: BoundingBox): Photo[] {
  return photos.filter((photo) => isPhotoInBounds(photo, bounds));
}

/**
 * Build SQL WHERE clause for geographic filtering
 * Returns SQL fragment and parameter array for prepared statements
 */
export function buildBoundsQuery(bounds: BoundingBox): {
  sql: string;
  params: number[];
} {
  const crossesIdl = bounds.west > bounds.east;

  if (crossesIdl) {
    // International Date Line crossing
    return {
      sql: 'latitude BETWEEN ? AND ? AND (longitude >= ? OR longitude <= ?)',
      params: [bounds.south, bounds.north, bounds.west, bounds.east],
    };
  } else {
    // Standard bounding box
    return {
      sql: 'latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?',
      params: [bounds.south, bounds.north, bounds.west, bounds.east],
    };
  }
}

/**
 * Calculate bounding box that encompasses all photos
 */
export function calculateBoundingBox(photos: Photo[]): BoundingBox | null {
  const photosWithLocation = photos.filter((p) => p.latitude !== null && p.longitude !== null);

  if (photosWithLocation.length === 0) {
    return null;
  }

  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  for (const photo of photosWithLocation) {
    const lat = photo.latitude!;
    const lon = photo.longitude!;

    if (lat > north) north = lat;
    if (lat < south) south = lat;
    if (lon > east) east = lon;
    if (lon < west) west = lon;
  }

  return { north, south, east, west };
}
