/**
 * Filesystem scanning service
 * Recursively scans directories for photos and extracts EXIF data
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createPhoto } from './storage';
import { extractExif } from './exif';
import { isSupportedImageFile, isRawFile, getMimeType } from './formats';
import { PhotoSource } from '@placemark/core';
import { logger } from './logger';

// 150MB  default limit to accommodate professional RAW files (medium format cameras can exceed 100MB)
// This is now configurable via settings
const DEFAULT_MAX_FILE_SIZE_MB = 150;

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
 * @param maxFileSizeMB Maximum file size in MB (default: 150MB)
 */
export async function scanDirectory(
  dirPath: string,
  source: PhotoSource,
  onProgress?: (progress: ScanProgress) => void,
  includeSubdirectories: boolean = true,
  maxFileSizeMB: number = DEFAULT_MAX_FILE_SIZE_MB
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

      await processImageFile(filePath, source, result, maxFileSizeMB);
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
  return deduplicateRawJpegPairs(imageFiles);
}

/** JPEG extensions used for RAW+JPEG companion detection */
const JPEG_EXTENSIONS = ['.jpg', '.jpeg'];

/**
 * Remove RAW files that have a JPEG companion with the same filename stem
 * in the same directory. Many cameras output both RAW + JPEG for each shot;
 * the JPEG contains identical EXIF/GPS data and produces better thumbnails.
 *
 * Standalone RAW files (no JPEG companion) are kept.
 */
function deduplicateRawJpegPairs(files: string[]): string[] {
  // Build a set of JPEG stems keyed by directory for O(1) lookup
  const jpegStemsByDir = new Map<string, Set<string>>();

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (JPEG_EXTENSIONS.includes(ext)) {
      const dir = path.dirname(filePath);
      const stem = path.basename(filePath, path.extname(filePath)).toLowerCase();
      let stems = jpegStemsByDir.get(dir);
      if (!stems) {
        stems = new Set();
        jpegStemsByDir.set(dir, stems);
      }
      stems.add(stem);
    }
  }

  // If no JPEGs at all, nothing to deduplicate
  if (jpegStemsByDir.size === 0) {
    return files;
  }

  let skippedCount = 0;
  const result = files.filter((filePath) => {
    if (!isRawFile(filePath)) {
      return true; // Keep all non-RAW files
    }
    const dir = path.dirname(filePath);
    const stem = path.basename(filePath, path.extname(filePath)).toLowerCase();
    const dirJpegs = jpegStemsByDir.get(dir);
    if (dirJpegs && dirJpegs.has(stem)) {
      skippedCount++;
      return false; // Skip RAW — JPEG companion exists
    }
    return true; // Keep standalone RAW
  });

  if (skippedCount > 0) {
    logger.info(`Skipped ${skippedCount} RAW files with JPEG companions`);
  }

  return result;
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
  result: ScanResult,
  maxFileSizeMB: number
): Promise<void> {
  const stats = await fs.stat(filePath);

  const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;
  if (stats.size > maxFileSizeBytes) {
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
    mimeType: getMimeType(ext),
  });

  if (exifData.latitude != null && exifData.longitude != null) {
    result.photosWithLocation++;
  }
}
