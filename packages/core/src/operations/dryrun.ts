/**
 * Dry run logic for file operations
 * Generates a plan of what would happen without modifying the filesystem
 */

import { Photo } from '../models/Photo';
import { FileOperation, DryRunResult, OperationType } from '../models/Operation';

/**
 * Generate a unique ID for an operation
 */
function generateOpId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Extract filename from a path (platform-agnostic)
 */
function getBasename(path: string): string {
  // Handle both Windows and Unix separators
  const separator = path.includes('\\') ? '\\' : '/';
  return path.split(separator).pop() || path;
}

/**
 * Generate a dry run plan for copying/moving photos
 * Note: This allows for potential naming conflicts which must be resolved by the caller (desktop)
 * checking for file existence.
 */
export function generateDryRun(
  photos: Photo[],
  destFolder: string,
  type: OperationType
): DryRunResult {
  const operations: FileOperation[] = [];
  const warnings: string[] = [];
  let totalSize = 0;

  // Track destination filenames to detect collisions within the batch itself
  const destFilenames = new Set<string>();

  for (const photo of photos) {
    const filename = getBasename(photo.path);

    // Simple path joining (core cannot use path module)
    // We assume destFolder does not end with separator for simplicity,
    // but we should handle it.
    const cleanDestFolder =
      destFolder.endsWith('/') || destFolder.endsWith('\\') ? destFolder.slice(0, -1) : destFolder;

    // Use the same separator as the input if possible, default to /
    const sep = destFolder.includes('\\') ? '\\' : '/';

    // Handle batch collisions
    let uniqueFilename = filename;
    let counter = 1;

    // If the exact filename has already been used in this batch
    if (destFilenames.has(uniqueFilename)) {
      // Try to find a unique name: file (1).jpg, file (2).jpg
      const namePart = filename.substring(0, filename.lastIndexOf('.'));
      const extPart = filename.substring(filename.lastIndexOf('.'));

      while (destFilenames.has(uniqueFilename)) {
        uniqueFilename = `${namePart} (${counter})${extPart}`;
        counter++;
      }
    }

    destFilenames.add(uniqueFilename);
    const finalDestPath = `${cleanDestFolder}${sep}${uniqueFilename}`;

    operations.push({
      id: generateOpId(),
      type,
      sourcePath: photo.path,
      destPath: finalDestPath,
      status: 'pending',
      fileSize: photo.fileSize,
    });

    totalSize += photo.fileSize;
  }

  return {
    operations,
    summary: {
      totalFiles: photos.length,
      totalSize,
      warnings,
    },
  };
}
