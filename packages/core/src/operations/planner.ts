/**
 * Operation planner - generates file operation plans
 *
 * Creates a list of operations mapping source photos to destination paths,
 * handling batch filename collisions. The actual filesystem validation
 * (checking if destination files exist) happens in the desktop package.
 *
 * Key responsibilities:
 * - Map photos to destination paths
 * - Handle duplicate filenames within a batch (adds " (1)", " (2)", etc.)
 * - Include photoId for database sync after move operations
 */

import { Photo } from '../models/Photo';
import { FileOperation, DryRunResult, OperationType } from '../models/Operation';

/**
 * Generate a unique tracking ID for an operation.
 * Uses crypto.randomUUID() — available in Node 19+, modern browsers, and React Native.
 */
function generateOpId(): string {
  return crypto.randomUUID();
}

/**
 * Extract filename from a path (platform-agnostic)
 */
function getBasename(path: string): string {
  const separator = path.includes('\\') ? '\\' : '/';
  return path.split(separator).pop() || path;
}

/**
 * Generate an operation plan for copying/moving photos
 *
 * @param photos - Photos to operate on (from database)
 * @param destFolder - Target folder path
 * @param type - 'copy' or 'move'
 * @returns Plan with operations list and summary
 *
 * Note: This only handles batch-internal collisions (same filename in batch).
 * Filesystem collisions (file already exists at dest) are checked by the
 * desktop package before execution.
 */
export function generateOperationPlan(
  photos: Photo[],
  destFolder: string,
  type: OperationType
): DryRunResult {
  const operations: FileOperation[] = [];
  const warnings: string[] = [];
  let totalSize = 0;

  // Track filenames to detect collisions within this batch
  const destFilenames = new Set<string>();

  for (const photo of photos) {
    const filename = getBasename(photo.path);

    // Path joining (core package cannot use Node's path module)
    const cleanDestFolder =
      destFolder.endsWith('/') || destFolder.endsWith('\\') ? destFolder.slice(0, -1) : destFolder;
    const sep = destFolder.includes('\\') ? '\\' : '/';

    // Handle batch collisions - add " (1)", " (2)" suffix if needed
    let uniqueFilename = filename;
    let counter = 1;

    if (destFilenames.has(uniqueFilename)) {
      const dotIndex = filename.lastIndexOf('.');
      const hasExtension = dotIndex > 0;
      const namePart = hasExtension ? filename.slice(0, dotIndex) : filename;
      const extPart = hasExtension ? filename.slice(dotIndex) : '';

      while (destFilenames.has(uniqueFilename)) {
        uniqueFilename = `${namePart} (${counter})${extPart}`;
        counter++;
      }
    }

    destFilenames.add(uniqueFilename);
    const finalDestPath = `${cleanDestFolder}${sep}${uniqueFilename}`;

    operations.push({
      id: generateOpId(),
      photoId: photo.id,
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
