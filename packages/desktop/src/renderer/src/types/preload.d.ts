/**
 * Preload API type definitions
 * Defines the shape of window.api exposed via contextBridge
 */

import type { Photo, Placemark, CreatePlacemarkInput, UpdatePlacemarkInput } from '@placemark/core';

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

export interface LastImportSummary {
  source: 'local' | 'onedrive';
  scanned: number;
  imported: number;
  duplicates: number;
  completedAt: number;
}

export interface LibraryStats {
  totalPhotos: number;
  photosWithLocation: number;
  photosWithTimestamp: number;
  totalFileSizeBytes: number;
  avgFileSizeBytes: number;
  minTimestamp: number | null;
  maxTimestamp: number | null;
  oldestPhotoId: number | null;
  newestPhotoId: number | null;
  formatBreakdown: Array<{ mimeType: string; count: number }>;
  cameraBreakdown: Array<{ make: string; model: string; count: number }>;
  lastScannedAt: number | null;
  photosWithIssues: number;
  lastImportSummary: LastImportSummary | null;
}

export interface ThumbnailStats {
  totalSizeBytes: number;
  totalSizeMB: number;
  thumbnailCount: number;
  maxSizeMB: number;
  usagePercent: number;
}

export interface PhotoIssueEntry {
  photoId: number;
  path: string;
  source: string;
  issueCodes: string[];
}

export interface PhotosAPI {
  scanFolder: (includeSubdirectories: boolean, maxFileSizeMB: number) => Promise<ScanResult>;
  abortScan: () => Promise<void>;
  getWithLocation: () => Promise<Photo[]>;
  getDateRange: () => Promise<{ minDate: number | null; maxDate: number | null }>;
  getCountWithLocation: () => Promise<number>;
  openInViewer: (photoId: number) => Promise<void>;
  showInFolder: (photoId: number) => Promise<void>;
  showMultipleInFolder: (filePaths: string[]) => Promise<void>;
  getDatabaseStats: () => Promise<DatabaseStats>;
  getLibraryStats: () => Promise<LibraryStats>;
  getPhotosWithIssues: () => Promise<PhotoIssueEntry[]>;
  clearDatabase: () => Promise<void>;
  getHistogram: (
    minDate: number,
    maxDate: number,
    bucketCount: number,
    gpsOnly: boolean
  ) => Promise<{ bucket: number; count: number }[]>;
  onScanProgress: (callback: (progress: ScanProgress) => void) => () => void;
}

export interface ThumbnailsAPI {
  get: (photoId: number) => Promise<Buffer | null>;
  getStats: () => Promise<ThumbnailStats>;
  clearCache: () => Promise<void>;
  setMaxSize: (sizeMB: number) => Promise<void>;
}

export interface OperationsAPI {
  selectDestination: () => Promise<string | null>;
  generateDryRun: (
    photoIds: number[],
    destPath: string,
    opType: string
  ) => Promise<import('@placemark/core').DryRunResult>;
  execute: () => Promise<{
    success: boolean;
    message: string;
    batchId?: number;
    cancelled?: boolean;
  }>;
  cancel: () => Promise<{ ok: boolean; message: string }>;
  undo: () => Promise<{ success: boolean; message: string; undoneCount?: number }>;
  canUndo: () => Promise<{
    canUndo: boolean;
    batchInfo?: {
      id: number;
      operation: import('@placemark/core').OperationType;
      fileCount: number;
      timestamp: number;
    };
  }>;
  onProgress: (
    callback: (progress: {
      totalFiles: number;
      completedFiles: number;
      currentFile: string;
      percentage: number;
      phase: 'executing' | 'complete';
    }) => void
  ) => () => void;
}

export interface VersionStampResult {
  current: string;
  stored: string | null;
  mismatch: boolean;
}

export interface SystemAPI {
  openAppDataFolder: () => Promise<void>;
  getAppVersion: () => Promise<string>;
  getSystemLocale: () => Promise<string>;
  openExternal: (url: string) => Promise<void>;
  reverseGeocode: (lat: number, lng: number) => Promise<string | null>;
  checkVersionStamp: () => Promise<VersionStampResult>;
  acceptVersionStamp: () => Promise<void>;
  wipeAndRestart: () => Promise<void>;
}

export interface PlacemarkWithCount extends Placemark {
  photoCount: number;
  geoLabel?: string | null;
}

export interface PlacemarkSmartCounts {
  thisYear: number;
  last3Months: number;
}

export interface PlacemarksGetAllResult {
  placemarks: PlacemarkWithCount[];
  smartCounts: PlacemarkSmartCounts;
}

export interface PlacemarksAPI {
  getAll: () => Promise<PlacemarksGetAllResult>;
  create: (input: CreatePlacemarkInput) => Promise<PlacemarkWithCount>;
  update: (input: UpdatePlacemarkInput) => Promise<PlacemarkWithCount>;
  delete: (id: number) => Promise<void>;
  setGeoLabel: (id: number, label: string) => Promise<void>;
}

export interface OneDriveImportProgress {
  scanned: number;
  imported: number;
  duplicates: number;
  total: number;
  currentFile: string;
}

export interface OneDriveImportResult {
  scanned: number;
  imported: number;
  duplicates: number;
}

export interface OneDriveConnectionStatus {
  connected: boolean;
  accountEmail: string | null;
  expiresAt: number | null;
}

export interface OneDriveFolderItem {
  id: string;
  name: string;
  childCount: number;
  path: string | null;
}

export interface OneDriveAPI {
  login: () => Promise<OneDriveConnectionStatus>;
  logout: () => Promise<{ ok: boolean }>;
  getConnectionStatus: () => Promise<OneDriveConnectionStatus>;
  listRootFolders: () => Promise<OneDriveFolderItem[]>;
  getCameraRollFolder: () => Promise<OneDriveFolderItem>;
  listChildFolders: (itemId: string) => Promise<OneDriveFolderItem[]>;
  importFolder: (itemId: string, includeSubdirectories: boolean) => Promise<OneDriveImportResult>;
  abortImport: () => Promise<void>;
  onImportProgress: (callback: (progress: OneDriveImportProgress) => void) => () => void;
}

export type ExportFormat = 'csv' | 'geojson' | 'gpx';

export interface ExportSaveResult {
  saved: boolean;
  filePath: string | null;
  count: number;
}

export interface ExportAPI {
  saveFile: (photoIds: number[], format: ExportFormat) => Promise<ExportSaveResult>;
}

/**
 * Complete Placemark API exposed to renderer
 */
export interface PlacemarkAPI {
  photos: PhotosAPI;
  thumbnails: ThumbnailsAPI;
  ops: OperationsAPI;
  system: SystemAPI;
  placemarks: PlacemarksAPI;
  onedrive: OneDriveAPI;
  export: ExportAPI;
}

/**
 * Extend Window interface with our API
 */
declare global {
  interface Window {
    api: PlacemarkAPI;
  }
}
