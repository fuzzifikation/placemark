/**
 * Filesystem scanning service
 * Recursively scans directories for photos and extracts EXIF data
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createPhoto } from './storage';
import { extractExif, isSupportedImageFile } from './exif';
import { PhotoSource } from '@placemark/core';
import { logger } from './logger';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
  '.webp': 'image/webp',
};

export interface ScanResult {
  totalFiles: number;
  processedFiles: number;
  photosWithLocation: number;
  errors: string[];
}

export interface ScanProgress {
  currentFile: string;
  processed: number;
  total: number;
}

/**
 * Scan a directory for photos
 * @param dirPath Absolute path to directory to scan
 * @param source Source type (local, network, etc.)
 * @param onProgress Optional callback for progress updates
 * @param includeSubdirectories Whether to scan subdirectories recursively (default: true)
 */
export async function scanDirectory(
  dirPath: string,
  source: PhotoSource,
  onProgress?: (progress: ScanProgress) => void,
  includeSubdirectories: boolean = true
): Promise<ScanResult> {
  const result: ScanResult = {
    totalFiles: 0,
    processedFiles: 0,
    photosWithLocation: 0,
    errors: [],
  };

  // Find all image files
  const imageFiles = await findImageFiles(dirPath, includeSubdirectories);
  result.totalFiles = imageFiles.length;

  logger.info(`Found ${imageFiles.length} image files in ${dirPath}`);

  // Process each file
  for (const filePath of imageFiles) {
    try {
      if (onProgress) {
        onProgress({
          currentFile: filePath,
          processed: result.processedFiles,
          total: result.totalFiles,
        });
      }

      await processImageFile(filePath, source, result);
      result.processedFiles++;
    } catch (error) {
      const errorMsg = `Error processing ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
    }
  }

  return result;
}

/**
 * Find all supported image files in a directory
 * @param dirPath Directory to scan
 * @param includeSubdirectories Whether to scan subdirectories recursively
 */
async function findImageFiles(dirPath: string, includeSubdirectories: boolean): Promise<string[]> {
  const imageFiles: string[] = [];

  async function scanDir(currentPath: string, isRoot: boolean = true): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          // Only recurse if includeSubdirectories is true and not the root directory
          if (
            includeSubdirectories &&
            !entry.name.startsWith('.') &&
            !shouldSkipDirectory(entry.name)
          ) {
            await scanDir(fullPath, false);
          }
        } else if (entry.isFile()) {
          if (isSupportedImageFile(fullPath)) {
            imageFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read (permissions, etc.)
    }
  }

  await scanDir(dirPath, true);
  return imageFiles;
}

/**
 * Check if directory should be skipped during scanning
 */
function shouldSkipDirectory(dirName: string): boolean {
  const skipPatterns = [
    'node_modules',
    '.git',
    '.vscode',
    'dist',
    'build',
    '__pycache__',
    'vendor',
  ];

  return skipPatterns.includes(dirName.toLowerCase());
}

/**
 * Process a single image file: extract EXIF and store in database
 */
async function processImageFile(
  filePath: string,
  source: PhotoSource,
  result: ScanResult
): Promise<void> {
  const stats = await fs.stat(filePath);

  if (stats.size > MAX_FILE_SIZE) {
    // Track large files that were skipped
    result.errors.push(
      `Skipped large file (${Math.round(stats.size / 1024 / 1024)}MB): ${path.basename(filePath)}`
    );
    return;
  }

  const exifData = await extractExif(filePath);
  const ext = path.extname(filePath).toLowerCase();

  createPhoto({
    source,
    path: filePath,
    latitude: exifData.latitude,
    longitude: exifData.longitude,
    timestamp: exifData.timestamp,
    fileSize: stats.size,
    mimeType: MIME_TYPES[ext] || 'image/jpeg',
  });

  if (exifData.latitude != null && exifData.longitude != null) {
    result.photosWithLocation++;
  }
}
