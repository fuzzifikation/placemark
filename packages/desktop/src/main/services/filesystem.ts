/**
 * Filesystem scanning service
 * Recursively scans directories for photos and extracts EXIF data
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createPhoto } from './storage';
import { extractExif, isSupportedImageFile } from './exif';
import { PhotoSource } from '@placemark/core';

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
 * Scan a directory recursively for photos
 * @param dirPath Absolute path to directory to scan
 * @param source Source type (local, network, etc.)
 * @param onProgress Optional callback for progress updates
 */
export async function scanDirectory(
  dirPath: string,
  source: PhotoSource,
  onProgress?: (progress: ScanProgress) => void
): Promise<ScanResult> {
  const result: ScanResult = {
    totalFiles: 0,
    processedFiles: 0,
    photosWithLocation: 0,
    errors: [],
  };

  // Find all image files recursively
  const imageFiles = await findImageFiles(dirPath);
  result.totalFiles = imageFiles.length;

  console.log(`Found ${imageFiles.length} image files in ${dirPath}`);

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
      const errorMsg = `Error processing ${filePath}: ${error}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
    }
  }

  return result;
}

/**
 * Find all supported image files recursively in a directory
 */
async function findImageFiles(dirPath: string): Promise<string[]> {
  const imageFiles: string[] = [];

  async function scanDir(currentPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          // Skip hidden directories and common exclude patterns
          if (!entry.name.startsWith('.') && !shouldSkipDirectory(entry.name)) {
            await scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          if (isSupportedImageFile(fullPath)) {
            imageFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory ${currentPath}:`, error);
    }
  }

  await scanDir(dirPath);
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
    console.warn(`Skipping large file: ${filePath} (${stats.size} bytes)`);
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

  if (exifData.latitude && exifData.longitude) {
    result.photosWithLocation++;
  }
}
