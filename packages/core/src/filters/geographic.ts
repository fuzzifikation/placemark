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
