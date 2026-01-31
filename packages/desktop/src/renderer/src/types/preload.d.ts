/**
 * Preload API type definitions
 * Defines the shape of window.api exposed via contextBridge
 */

import type { Photo } from '@placemark/core';

export interface ScanProgress {
  currentFile: string;
  processed: number;
  total: number;
  startTime?: number;
  eta?: number;
}

export interface ScanResult {
  canceled?: boolean;
  folderPath?: string;
  totalFiles?: number;
  processedFiles?: number;
  photosWithLocation?: number;
  errors?: string[];
  error?: string;
}

export interface DatabaseStats {
  photosDbSizeMB: number;
  thumbnailsDbSizeMB: number;
  totalPhotoCount: number;
}

export interface ThumbnailStats {
  totalSizeBytes: number;
  totalSizeMB: number;
  thumbnailCount: number;
  maxSizeMB: number;
  usagePercent: number;
}

export interface PhotosAPI {
  scanFolder: (includeSubdirectories: boolean) => Promise<ScanResult>;
  getWithLocation: () => Promise<Photo[]>;
  getWithLocationInDateRange: (
    startTimestamp: number | null,
    endTimestamp: number | null
  ) => Promise<Photo[]>;
  getDateRange: () => Promise<{ minDate: number | null; maxDate: number | null }>;
  getCountWithLocation: () => Promise<number>;
  openInViewer: (path: string) => Promise<void>;
  showInFolder: (path: string) => Promise<void>;
  getDatabaseStats: () => Promise<DatabaseStats>;
  clearDatabase: () => Promise<void>;
  onScanProgress: (callback: (progress: ScanProgress) => void) => () => void;
}

export interface ThumbnailsAPI {
  get: (photoId: number, photoPath: string) => Promise<Buffer | null>;
  getStats: () => Promise<ThumbnailStats>;
  clearCache: () => Promise<void>;
  setMaxSize: (sizeMB: number) => Promise<void>;
}

export interface OperationsAPI {
  selectDestination: () => Promise<string | null>;
  generateDryRun: (photos: Photo[], destPath: string, opType: string) => Promise<any>;
}

export interface SystemAPI {
  openAppDataFolder: () => Promise<void>;
}

/**
 * Complete Placemark API exposed to renderer
 */
export interface PlacemarkAPI {
  photos: PhotosAPI;
  thumbnails: ThumbnailsAPI;
  ops: OperationsAPI;
  system: SystemAPI;
}

/**
 * Extend Window interface with our API
 */
declare global {
  interface Window {
    api: PlacemarkAPI;
  }
}
