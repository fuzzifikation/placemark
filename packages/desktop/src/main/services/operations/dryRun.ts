/**
 * Dry-run generation for file operations.
 *
 * Produces a plan by:
 * 1. Fetching photos from the database.
 * 2. Validating the destination (syntactic + not a system folder + writable).
 * 3. Generating the base plan via core.
 * 4. Enriching each op with filesystem reality (does dest exist? same photo?)
 *    using parallel IO with bounded concurrency.
 *
 * For 'delete' there is no destination, so we skip steps 2-4 and return a
 * minimal plan.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { constants as fsConstants } from 'fs';
import { app } from 'electron';
import exifr from 'exifr';
import {
  generateOperationPlan,
  isValidDestination,
  isForbiddenDestination,
  isSamePath,
  FileOperation,
  DryRunResult,
  OperationType,
} from '@placemark/core';
import { getPhotosByIds } from '../storage';

const DRY_RUN_CONCURRENCY = 8;

function systemFolders(): string[] {
  return [
    app.getPath('userData'),
    app.getPath('appData'),
    app.getPath('exe'),
    ...(process.platform === 'win32' ? [process.env.WINDIR ?? 'C:\\Windows'] : []),
    '/System',
    '/Library',
  ];
}

/**
 * Fetch photos by ID, ensuring all IDs resolved to a row. Throws otherwise.
 */
function fetchPhotosStrict(photoIds: number[]) {
  const photos = getPhotosByIds(photoIds);
  if (photos.length === 0) {
    throw new Error('No valid photos found for the provided IDs');
  }
  if (photos.length !== photoIds.length) {
    throw new Error(
      `Some photo IDs are invalid (requested ${photoIds.length}, found ${photos.length})`
    );
  }
  return photos;
}

/**
 * Build a delete-only dry run (no filesystem checks at the destination).
 */
function buildDeleteDryRun(photoIds: number[]): DryRunResult {
  const photos = fetchPhotosStrict(photoIds);
  return {
    operations: photos.map((p) => ({
      id: String(p.id),
      photoId: p.id,
      type: 'delete',
      sourcePath: p.path,
      destPath: '',
      status: 'pending',
      fileSize: p.fileSize,
    })),
    summary: {
      totalFiles: photos.length,
      totalSize: photos.reduce((acc, p) => acc + p.fileSize, 0),
      warnings: [],
    },
  };
}

/**
 * Validate a copy/move destination. Throws on failure.
 */
async function validateCopyMoveDestination(destPath: string): Promise<void> {
  if (!path.isAbsolute(destPath)) {
    throw new Error('Destination must be an absolute path');
  }
  if (isForbiddenDestination(destPath, systemFolders())) {
    throw new Error('Cannot perform operations on system folders');
  }
  const syntactic = isValidDestination(destPath);
  if (!syntactic.valid) {
    throw new Error(syntactic.error);
  }
  try {
    await fs.access(destPath, fsConstants.W_OK);
  } catch {
    throw new Error(`Destination not writable: ${destPath}`);
  }
}

/**
 * Enrich one planned op with filesystem reality checks.
 * Returns the enriched op and an optional warning for the user-facing summary.
 */
async function enrichOne(
  op: FileOperation,
  opType: Exclude<OperationType, 'delete'>,
  sourceTimestamp: number | null
): Promise<{ op: FileOperation; warning?: string }> {
  const enrichedOp: FileOperation = { ...op };

  if (isSamePath(op.sourcePath, op.destPath)) {
    enrichedOp.status = 'skipped';
    return { op: enrichedOp };
  }

  try {
    const destStat = await fs.stat(op.destPath);
    if (destStat.size !== op.fileSize) {
      enrichedOp.status = 'conflict';
      enrichedOp.error = 'Different file already exists at destination';
      return {
        op: enrichedOp,
        warning: `Conflict: ${path.basename(op.destPath)} already exists (different content)`,
      };
    }

    // Same size — confirm identity using EXIF capture date.
    let destTimestamp: number | null = null;
    try {
      const destExif = await exifr.parse(op.destPath, {
        exif: true,
        tiff: true,
        gps: false,
        makerNote: false,
        iptc: false,
        xmp: false,
        icc: false,
      });
      const dt: Date | undefined =
        destExif?.DateTimeOriginal ?? destExif?.CreateDate ?? destExif?.DateTime;
      destTimestamp = dt instanceof Date ? dt.getTime() : null;
    } catch {
      // Non-EXIF or unreadable — fall through to size-only logic.
    }

    if (sourceTimestamp !== null && destTimestamp !== null) {
      if (sourceTimestamp === destTimestamp) {
        enrichedOp.status = opType === 'move' ? 'delete-source' : 'skipped';
        return { op: enrichedOp };
      }
      enrichedOp.status = 'conflict';
      enrichedOp.error =
        'Different file already exists at destination (same size, different capture date)';
      return {
        op: enrichedOp,
        warning: `Conflict: ${path.basename(op.destPath)} already exists (same size but different capture date — may be a different photo)`,
      };
    }

    // Size-only match — treat as identity (screenshots, edited exports, etc.)
    enrichedOp.status = opType === 'move' ? 'delete-source' : 'skipped';
    if (sourceTimestamp === null) {
      const action = opType === 'move' ? 'source will be sent to Recycle Bin' : 'skipped';
      return {
        op: enrichedOp,
        warning: `${path.basename(op.destPath)} ${action} (same size; no capture date available to confirm identity)`,
      };
    }
    return { op: enrichedOp };
  } catch (err: any) {
    if (err?.code === 'ENOENT') {
      enrichedOp.status = 'pending';
      return { op: enrichedOp };
    }
    enrichedOp.status = 'failed';
    enrichedOp.error = `Access error: ${err.message}`;
    return {
      op: enrichedOp,
      warning: `Error checking ${path.basename(op.destPath)}: ${err.message}`,
    };
  }
}

/**
 * Generate a dry-run plan for copy/move/delete.
 */
export async function generateDryRun(
  photoIds: number[],
  destPath: string,
  opType: OperationType
): Promise<DryRunResult> {
  if (opType === 'delete') {
    return buildDeleteDryRun(photoIds);
  }

  await validateCopyMoveDestination(destPath);

  const photos = fetchPhotosStrict(photoIds);

  const plan = generateOperationPlan(photos, destPath, opType);
  const photoTimestamps = new Map<number, number | null>(photos.map((p) => [p.id, p.timestamp]));
  const warnings: string[] = [...plan.summary.warnings];
  const enrichedOps: FileOperation[] = [];

  // Parallel enrichment with bounded concurrency.
  for (let i = 0; i < plan.operations.length; i += DRY_RUN_CONCURRENCY) {
    const slice = plan.operations.slice(i, i + DRY_RUN_CONCURRENCY);
    const results = await Promise.all(
      slice.map((op) => enrichOne(op, opType, photoTimestamps.get(op.photoId) ?? null))
    );
    for (const { op, warning } of results) {
      enrichedOps.push(op);
      if (warning) warnings.push(warning);
    }
  }

  return {
    operations: enrichedOps,
    summary: {
      totalFiles: plan.summary.totalFiles,
      totalSize: plan.summary.totalSize,
      warnings,
    },
  };
}
