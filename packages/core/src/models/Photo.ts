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
  cameraMake: string | null;
  cameraModel: string | null;
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
  cameraMake?: string;
  cameraModel?: string;
}
