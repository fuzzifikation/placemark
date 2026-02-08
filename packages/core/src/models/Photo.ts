/**
 * Photo model - platform-agnostic representation
 * No Node.js or browser dependencies
 */

export type PhotoSource = 'local' | 'onedrive' | 'network';

export interface Photo {
  id: number;
  source: PhotoSource;
  path: string;
  latitude: number | null;
  longitude: number | null;
  timestamp: number | null; // Unix epoch in milliseconds
  fileHash: string | null;
  scannedAt: number; // Unix epoch in milliseconds
  fileSize: number;
  mimeType: string;
}

export interface PhotoCreateInput {
  source: PhotoSource;
  path: string;
  latitude?: number;
  longitude?: number;
  timestamp?: number;
  fileHash?: string;
  fileSize: number;
  mimeType: string;
}

export interface PhotoUpdateInput {
  latitude?: number | null;
  longitude?: number | null;
  timestamp?: number | null;
  fileHash?: string | null;
}

/**
 * Check if a photo has location data
 */
export function hasLocation(photo: Photo): boolean {
  return photo.latitude !== null && photo.longitude !== null;
}

/**
 * Check if a photo has timestamp data
 */
export function hasTimestamp(photo: Photo): boolean {
  return photo.timestamp !== null;
}

/**
 * Get human-readable description of photo location status
 */
export function getLocationStatus(photo: Photo): string {
  if (hasLocation(photo)) {
    return `${photo.latitude!.toFixed(6)}, ${photo.longitude!.toFixed(6)}`;
  }
  return 'No location data';
}

/**
 * Get human-readable date from timestamp
 */
export function getDateString(photo: Photo, locale?: string): string {
  if (!hasTimestamp(photo)) {
    return 'No date';
  }
  return new Date(photo.timestamp!).toLocaleDateString(locale);
}
