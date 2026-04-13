/**
 * IPC handlers for file operations
 */

import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import * as fs from 'fs/promises';
import { constants } from 'fs';
import exifr from 'exifr';
import {
  generateOperationPlan,
  isValidDestination,
  FileOperation,
  DryRunResult,
  OperationType,
} from '@placemark/core';
import * as path from 'path';
import { getPhotosByIds } from '../services/storage';
import {
  executeOperations,
  undoLastBatch,
  canUndo,
  requestCancel,
  CancelledError,
} from '../services/operations';

// Store the last dry run result for execution
let lastDryRunResult: DryRunResult | null = null;
let lastOpType: OperationType | null = null;

// Set to true at startup when completed batches were archived (undo history cleared)
let startupUndoCleared = false;
export function setStartupUndoCleared(value: boolean): void {
  startupUndoCleared = value;
}

function normalizeForCompare(p: string): string {
  return path.resolve(p).replace(/\\/g, '/').toLowerCase();
}

function isSamePath(a: string, b: string): boolean {
  return normalizeForCompare(a) === normalizeForCompare(b);
}

export function registerOperationHandlers(getMainWindow: () => BrowserWindow | null): void {
  // One-shot query: was undo history cleared at startup?
  ipcMain.handle('ops:wasUndoHistoryCleared', () => {
    const result = startupUndoCleared;
    startupUndoCleared = false; // consume once
    return result;
  });

  // Select destination folder
  ipcMain.handle('ops:selectDestination', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Destination Folder',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Generate Dry Run
  ipcMain.handle(
    'ops:generateDryRun',
    async (_event, photoIds: number[], destPath: string, opType: string) => {
      // 1. Validate operation type strictly
      const validOpTypes: OperationType[] = ['copy', 'move'];
      if (!validOpTypes.includes(opType as OperationType)) {
        throw new Error(`Invalid operation type: ${opType}`);
      }
      const validatedOpType = opType as OperationType;

      // 2. Validate destination path
      if (!path.isAbsolute(destPath)) {
        throw new Error('Destination must be an absolute path');
      }

      // Prevent operations on system folders
      const systemFolders = [
        app.getPath('userData'),
        app.getPath('appData'),
        app.getPath('exe'),
        ...(process.platform === 'win32' ? [process.env.WINDIR ?? 'C:\\Windows'] : []),
        '/System',
        '/Library',
      ];
      const nDestPath = normalizeForCompare(destPath);
      if (systemFolders.some((sysPath) => nDestPath.startsWith(normalizeForCompare(sysPath)))) {
        throw new Error('Cannot perform operations on system folders');
      }

      const validCheck = isValidDestination(destPath);
      if (!validCheck.valid) {
        throw new Error(validCheck.error);
      }

      // 3. Fetch photos from database (canonical source of truth)
      const photos = getPhotosByIds(photoIds);
      if (photos.length === 0) {
        throw new Error('No valid photos found for the provided IDs');
      }
      if (photos.length !== photoIds.length) {
        throw new Error(
          `Some photo IDs are invalid (requested ${photoIds.length}, found ${photos.length})`
        );
      }

      // 4. Generate plan (pure logic)
      const plan = generateOperationPlan(photos, destPath, validatedOpType);

      // Build photoId → timestamp lookup for duplicate verification (step 5)
      const photoTimestamps = new Map<number, number | null>(
        photos.map((p) => [p.id, p.timestamp])
      );

      // 5. Enrich plan with reality checks (IO)
      const enrichedOps: FileOperation[] = [];
      const warnings: string[] = [...plan.summary.warnings];

      // Verify destination is writable
      try {
        await fs.access(destPath, constants.W_OK);
      } catch (e) {
        throw new Error(`Destination not writable: ${destPath}`);
      }

      // Check file status at destination
      for (const op of plan.operations) {
        const enrichedOp: FileOperation = { ...op };

        // Same-file operation (source already in destination) is a safe no-op
        if (isSamePath(op.sourcePath, op.destPath)) {
          enrichedOp.status = 'skipped';
          enrichedOps.push(enrichedOp);
          continue;
        }

        try {
          const destStat = await fs.stat(op.destPath);
          if (destStat.size !== op.fileSize) {
            // Different byte count — definitely a different file.
            enrichedOp.status = 'conflict';
            enrichedOp.error = 'Different file already exists at destination';
            warnings.push(
              `Conflict: ${path.basename(op.destPath)} already exists (different content)`
            );
          } else {
            // Same size — confirm identity using EXIF capture date.
            // A resize preserves EXIF but changes size, so both must agree.
            const sourceTimestamp = photoTimestamps.get(op.photoId) ?? null;
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
              // Destination file is unreadable by exifr (non-EXIF format, corrupt, etc.)
            }

            if (sourceTimestamp !== null && destTimestamp !== null) {
              if (sourceTimestamp === destTimestamp) {
                // Size matches AND capture date matches — same photo.
                enrichedOp.status = 'skipped';
              } else {
                // Same size, different capture date — distinct photos (camera counter
                // collision, or resized copy with EXIF from a different source).
                enrichedOp.status = 'conflict';
                enrichedOp.error =
                  'Different file already exists at destination (same size, different capture date)';
                warnings.push(
                  `Conflict: ${path.basename(op.destPath)} already exists (same size but different capture date — may be a different photo)`
                );
              }
            } else {
              // One or both sides have no timestamp — fall back to size-only skip.
              // Applies to screenshots, edited exports, and other non-EXIF files.
              enrichedOp.status = 'skipped';
              if (sourceTimestamp === null) {
                warnings.push(
                  `${path.basename(op.destPath)} skipped (same size; no capture date available to confirm identity)`
                );
              }
            }
          }
        } catch (err: any) {
          if (err.code === 'ENOENT') {
            // File does not exist -> OK to proceed
            enrichedOp.status = 'pending';
          } else {
            enrichedOp.status = 'failed';
            enrichedOp.error = `Access error: ${err.message}`;
            warnings.push(`Error checking ${path.basename(op.destPath)}: ${err.message}`);
          }
        }

        enrichedOps.push(enrichedOp);
      }

      const result: DryRunResult = {
        operations: enrichedOps,
        summary: {
          totalFiles: plan.summary.totalFiles,
          totalSize: plan.summary.totalSize,
          warnings,
        },
      };

      // Store for potential execution
      lastDryRunResult = result;
      lastOpType = validatedOpType;

      return result;
    }
  );

  // Execute file operations
  ipcMain.handle('ops:execute', async () => {
    if (!lastDryRunResult || !lastOpType) {
      throw new Error('No operation preview available. Please generate a preview first.');
    }

    // Strict atomic semantics: any conflicts/errors must be resolved before executing.
    const blocking = lastDryRunResult.operations.filter(
      (op) => op.status === 'conflict' || op.status === 'failed'
    );
    if (blocking.length > 0) {
      throw new Error(
        blocking.length === 1
          ? 'Preview contains a conflict/error. Resolve it before executing.'
          : `Preview contains ${blocking.length} conflicts/errors. Resolve them before executing.`
      );
    }

    const pendingOps = lastDryRunResult.operations.filter((op) => op.status === 'pending');
    if (pendingOps.length === 0) {
      throw new Error('No pending operations to execute.');
    }

    try {
      const result = await executeOperations(lastDryRunResult, lastOpType, getMainWindow());

      // Clear stored dry run after successful execution
      lastDryRunResult = null;
      lastOpType = null;

      return result;
    } catch (err: any) {
      // Always clear stored state — the plan is stale after any execution attempt
      // (rollback has already restored the filesystem on failure)
      lastDryRunResult = null;
      lastOpType = null;

      if (err instanceof CancelledError) {
        return { success: false, cancelled: true, message: err.message };
      }
      throw err;
    }
  });

  // Cancel current operation (rolls back in-progress batch)
  ipcMain.handle('ops:cancel', async () => {
    return requestCancel();
  });

  // Undo last operation
  ipcMain.handle('ops:undo', async () => {
    return await undoLastBatch();
  });

  // Check if undo is available
  ipcMain.handle('ops:canUndo', async () => {
    return canUndo();
  });
}
