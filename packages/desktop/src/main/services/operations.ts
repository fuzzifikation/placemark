/**
 * Operations execution service
 * Handles file copy/move operations with ATOMIC batch semantics
 *
 * SAFETY PRINCIPLES:
 * 1. ATOMIC: Either ALL files succeed, or NOTHING is modified
 * 2. NEVER OVERWRITE: Any conflict aborts the entire batch
 * 3. SKIP SAME-FILE: If source === dest, silently skip (not an error)
 * 4. OS TRASH: Undo uses system trash (recoverable), not hard delete
 * 5. VERIFY: Check all preconditions BEFORE any file I/O
 *
 * Cross-platform: Uses Node.js fs + Electron shell.trashItem()
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BrowserWindow, shell } from 'electron';
import { constants as fsConstants } from 'fs';
import { FileOperation, DryRunResult, OperationType } from '@placemark/core';
import {
  logOperationBatch,
  getLastCompletedBatch,
  updateBatchStatus,
  updatePhotoPath,
  deletePhotosByIds,
} from './storage';
import { getDb } from './storageConnection';
import { logger } from './logger';

// ============================================================================
// Cancellation + single-operation guard
// ============================================================================

export class CancelledError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CancelledError';
  }
}

let activeExecution: {
  cancelRequested: boolean;
} | null = null;

export function requestCancel(): { ok: boolean; message: string } {
  if (!activeExecution) {
    return { ok: false, message: 'No operation is currently running.' };
  }
  activeExecution.cancelRequested = true;
  return { ok: true, message: 'Cancel requested. Stopping at next safe point…' };
}

// ============================================================================
// Types
// ============================================================================

interface ExecutionProgress {
  totalFiles: number;
  completedFiles: number;
  currentFile: string;
  percentage: number;
  phase: 'executing' | 'cleanup' | 'complete';
}

interface ExecutionResult {
  success: boolean;
  completedCount: number;
  skippedCount: number;
  trashedSourceCount: number;
  message: string;
  batchId: number;
}

export interface BatchInfo {
  id: number;
  operation: OperationType;
  fileCount: number;
  timestamp: number;
}

// ============================================================================
// Execution
// ============================================================================

/**
 * Execute file operations with ATOMIC batch semantics
 *
 * FLOW:
 * 1. Get pending operations from dry-run (already validated by IPC handler)
 * 2. Execute one by one with COPYFILE_EXCL (never overwrites)
 * 3. If any execution fails → rollback all completed files
 *
 * Note: The IPC handler validates files during dry-run. We trust that result
 * and use COPYFILE_EXCL as a safety net for race conditions.
 */
export async function executeOperations(
  dryRun: DryRunResult,
  opType: OperationType,
  mainWindow: BrowserWindow | null
): Promise<ExecutionResult> {
  if (activeExecution) {
    throw new Error('Another operation is already running. Please wait for it to finish.');
  }
  activeExecution = { cancelRequested: false };

  // Get operations to execute (already validated by IPC dry-run)
  const toExecute = dryRun.operations.filter((op) => op.status === 'pending');
  const skippedCount = dryRun.operations.filter((op) => op.status === 'skipped').length;
  const toTrashSource = dryRun.operations.filter((op) => op.status === 'delete-source');

  // Nothing pending — but for a move there may still be delete-source ops to execute
  if (toExecute.length === 0 && toTrashSource.length === 0) {
    activeExecution = null;
    return {
      success: true,
      completedCount: 0,
      skippedCount,
      trashedSourceCount: 0,
      message: 'No files to process.',
      batchId: 0,
    };
  }

  const totalFileCount = toExecute.length + toTrashSource.length;

  sendProgress(mainWindow, {
    totalFiles: totalFileCount,
    completedFiles: 0,
    currentFile: 'Starting...',
    percentage: 0,
    phase: 'executing',
  });

  // Execute operations
  let batchId = 0;
  const completedOps: FileOperation[] = [];

  try {
    // Log batch to database — includes both actual moves/copies and delete-source ops
    if (toExecute.length > 0 || toTrashSource.length > 0) {
      batchId = logOperationBatch({
        operation: opType,
        files: [
          ...toExecute.map((op) => ({
            photoId: op.photoId,
            sourcePath: op.sourcePath,
            destPath: op.destPath,
            fileOp: opType as 'copy' | 'move',
          })),
          ...toTrashSource.map((op) => ({
            photoId: op.photoId,
            sourcePath: op.sourcePath,
            destPath: op.destPath,
            fileOp: 'delete-source' as const,
          })),
        ],
        timestamp: Date.now(),
        status: 'pending',
      });
    }
    for (let i = 0; i < toExecute.length; i++) {
      if (activeExecution?.cancelRequested) {
        throw new CancelledError('Operation cancelled by user.');
      }

      const op = toExecute[i];

      sendProgress(mainWindow, {
        totalFiles: totalFileCount,
        completedFiles: i,
        currentFile: path.basename(op.sourcePath),
        percentage: Math.round((i / totalFileCount) * 100),
        phase: 'executing',
      });

      // Ensure destination directory exists
      const destDir = path.dirname(op.destPath);
      await fs.mkdir(destDir, { recursive: true });

      if (opType === 'copy') {
        // Exclusive copy: never overwrite even if dest appears after validation
        await fs.copyFile(op.sourcePath, op.destPath, fsConstants.COPYFILE_EXCL);
      } else {
        // Move: try rename first (fast), fallback to copy+delete
        try {
          await fs.rename(op.sourcePath, op.destPath);
        } catch (renameError: any) {
          if (renameError.code === 'EXDEV') {
            // Cross-device: copy then verify then delete
            await fs.copyFile(op.sourcePath, op.destPath, fsConstants.COPYFILE_EXCL);

            // VERIFY copy succeeded before deleting source
            const srcStat = await fs.stat(op.sourcePath);
            const destStat = await fs.stat(op.destPath);
            if (destStat.size !== srcStat.size) {
              await fs.unlink(op.destPath); // Clean up failed copy
              throw new Error(`Copy verification failed for ${path.basename(op.sourcePath)}`);
            }

            await fs.unlink(op.sourcePath);
          } else {
            throw renameError;
          }
        }
      }

      completedOps.push(op);
      logger.info(`${opType}: ${op.sourcePath} -> ${op.destPath}`);
    }

    // All succeeded - update batch status
    if (batchId !== 0) {
      updateBatchStatus(batchId, 'completed');
    }

    // Update photo paths in database after move (keeps DB in sync with filesystem)
    const pathUpdateFailures: string[] = [];
    if (opType === 'move') {
      for (const op of completedOps) {
        try {
          updatePhotoPath(op.photoId, op.destPath);
          logger.info(`Updated photo ${op.photoId} path to ${op.destPath}`);
        } catch (err: any) {
          logger.error(`Failed to update photo path for ${op.photoId}: ${err.message}`);
          pathUpdateFailures.push(op.destPath);
        }
      }
    }

    // For move operations: trash source files that were already at destination
    // and update their DB paths to point to the destination copy
    let trashedSourceCount = 0;
    const trashFailures: string[] = [];
    if (toTrashSource.length > 0) {
      sendProgress(mainWindow, {
        totalFiles: totalFileCount,
        completedFiles: toExecute.length,
        currentFile: '',
        percentage: Math.round((toExecute.length / totalFileCount) * 100),
        phase: 'cleanup',
      });
    }
    for (let i = 0; i < toTrashSource.length; i++) {
      const op = toTrashSource[i];
      sendProgress(mainWindow, {
        totalFiles: totalFileCount,
        completedFiles: toExecute.length + i,
        currentFile: path.basename(op.sourcePath),
        percentage: Math.round(((toExecute.length + i) / totalFileCount) * 100),
        phase: 'cleanup',
      });
      try {
        await shell.trashItem(op.sourcePath);
        trashedSourceCount++;
        logger.info(`Trashed source (already at dest): ${op.sourcePath}`);
        // Update DB path so the photo record points to the destination copy
        try {
          updatePhotoPath(op.photoId, op.destPath);
          logger.info(`Updated photo ${op.photoId} path to ${op.destPath} (delete-source)`);
        } catch (dbErr: any) {
          logger.error(`Failed to update photo path for ${op.photoId}: ${dbErr.message}`);
          pathUpdateFailures.push(op.destPath);
        }
      } catch (trashErr: any) {
        trashFailures.push(path.basename(op.sourcePath));
        logger.error(`Failed to trash source ${op.sourcePath}: ${trashErr.message}`);
      }
    }

    sendProgress(mainWindow, {
      totalFiles: totalFileCount,
      completedFiles: totalFileCount,
      currentFile: '',
      percentage: 100,
      phase: 'complete',
    });

    const message = buildExecutionMessage({
      opType,
      completedCount: completedOps.length,
      skippedCount,
      trashedSourceCount,
      trashFailures,
      pathUpdateFailures,
    });

    return {
      success: true,
      completedCount: completedOps.length,
      skippedCount,
      trashedSourceCount,
      message,
      batchId,
    };
  } catch (error: any) {
    const wasCancelled = error instanceof CancelledError;
    const failureLabel = wasCancelled ? 'Operation cancelled' : 'Operation failed';
    logger.error(`${failureLabel}: ${error.message}. Rolling back...`);

    const rollbackFailures = await rollbackCompletedOps(completedOps, opType);
    if (batchId !== 0) {
      updateBatchStatus(batchId, wasCancelled ? 'cancelled' : 'failed', error.message);
    }

    const rollbackNote =
      completedOps.length === 0
        ? ''
        : rollbackFailures === 0
          ? ` ${completedOps.length} completed files have been rolled back.`
          : ` ${completedOps.length - rollbackFailures} rolled back, ${rollbackFailures} rollback steps failed. Manual review recommended.`;

    if (wasCancelled) {
      throw new CancelledError(`Cancelled.${rollbackNote}`);
    }

    throw new Error(`Operation failed: ${error.message}.${rollbackNote}`);
  } finally {
    activeExecution = null;
  }
}

// ============================================================================
// Delete
// ============================================================================

/**
 * Send a batch of photos to the OS Recycle Bin and remove their DB records.
 *
 * No rollback: once trashed, files sit in the OS Recycle Bin (recoverable by
 * the user manually). DB records are removed for each successfully trashed file.
 * Undo prompts the user to restore from the Recycle Bin and re-scan.
 */
export async function executeDelete(
  dryRun: DryRunResult,
  mainWindow: BrowserWindow | null
): Promise<{
  success: boolean;
  trashedCount: number;
  failedCount: number;
  message: string;
  batchId: number;
}> {
  if (activeExecution) {
    throw new Error('Another operation is already running. Please wait for it to finish.');
  }
  activeExecution = { cancelRequested: false };

  const toDelete = dryRun.operations.filter((op) => op.status === 'pending');
  if (toDelete.length === 0) {
    activeExecution = null;
    return {
      success: true,
      trashedCount: 0,
      failedCount: 0,
      message: 'No files to delete.',
      batchId: 0,
    };
  }

  sendProgress(mainWindow, {
    totalFiles: toDelete.length,
    completedFiles: 0,
    currentFile: 'Starting...',
    percentage: 0,
    phase: 'executing',
  });

  const batchId = logOperationBatch({
    operation: 'delete',
    files: toDelete.map((op) => ({
      photoId: op.photoId,
      sourcePath: op.sourcePath,
      destPath: '',
      fileOp: 'delete' as const,
    })),
    timestamp: Date.now(),
    status: 'pending',
  });

  const succeededIds: number[] = [];
  const failures: string[] = [];

  try {
    for (let i = 0; i < toDelete.length; i++) {
      if (activeExecution?.cancelRequested) {
        break;
      }
      const op = toDelete[i];
      sendProgress(mainWindow, {
        totalFiles: toDelete.length,
        completedFiles: i,
        currentFile: path.basename(op.sourcePath),
        percentage: Math.round((i / toDelete.length) * 100),
        phase: 'executing',
      });
      try {
        await shell.trashItem(op.sourcePath);
        succeededIds.push(op.photoId);
        logger.info(`Deleted (trashed): ${op.sourcePath}`);
      } catch (err: any) {
        failures.push(path.basename(op.sourcePath));
        logger.error(`Failed to trash ${op.sourcePath}: ${err.message}`);
      }
    }

    if (succeededIds.length > 0) {
      deletePhotosByIds(succeededIds);
    }

    updateBatchStatus(batchId, 'completed');

    sendProgress(mainWindow, {
      totalFiles: toDelete.length,
      completedFiles: toDelete.length,
      currentFile: '',
      percentage: 100,
      phase: 'complete',
    });

    const failureNote =
      failures.length > 0
        ? ` ${failures.length} file${failures.length !== 1 ? 's' : ''} could not be sent to the Recycle Bin and were not removed.`
        : '';
    return {
      success: true,
      trashedCount: succeededIds.length,
      failedCount: failures.length,
      message: `Sent ${succeededIds.length} file${succeededIds.length !== 1 ? 's' : ''} to the Recycle Bin.${failureNote}`,
      batchId,
    };
  } finally {
    activeExecution = null;
  }
}

/**
 * Rollback completed operations after a failure
 * For copy: trash the copied files
 * For move: move files back to source
 */
async function rollbackCompletedOps(
  completedOps: FileOperation[],
  opType: OperationType
): Promise<number> {
  let failures = 0;
  for (const op of completedOps) {
    try {
      if (opType === 'copy') {
        await shell.trashItem(op.destPath);
      } else {
        // Do not overwrite anything that might have appeared at the source path.
        let sourceExists = true;
        try {
          await fs.access(op.sourcePath);
        } catch (existsError: any) {
          if (existsError?.code === 'ENOENT') {
            sourceExists = false;
          } else {
            throw existsError;
          }
        }
        if (sourceExists) {
          throw new Error('Cannot rollback move: source path already exists');
        }

        try {
          await fs.rename(op.destPath, op.sourcePath);
        } catch (renameError: any) {
          if (renameError.code === 'EXDEV') {
            await fs.copyFile(op.destPath, op.sourcePath, fsConstants.COPYFILE_EXCL);
            // Verify before deleting
            const srcStat = await fs.stat(op.sourcePath);
            const destStat = await fs.stat(op.destPath);
            if (srcStat.size !== destStat.size) {
              throw new Error('Rollback copy verification failed');
            }
            await fs.unlink(op.destPath);
          } else {
            throw renameError;
          }
        }
      }
      logger.info(`Rollback: restored ${op.sourcePath}`);
    } catch (rollbackError: any) {
      failures++;
      logger.error(`Rollback failed for ${op.sourcePath}: ${rollbackError.message}`);
    }
  }

  return failures;
}

// ============================================================================
// Undo
// ============================================================================

/**
 * Undo the last completed batch operation.
 *
 * - copy / move files are reversed automatically.
 * - delete-source files (trashed during a move) cannot be untrashed
 *   programmatically. Their count is returned so the renderer can prompt
 *   the user to restore them manually from the OS Recycle Bin.
 *   The batch is NOT marked 'undone' yet; call confirmTrashUndo() after the
 *   user acknowledges.
 */
export async function undoLastBatch(): Promise<{
  success: boolean;
  message: string;
  undoneCount?: number;
  trashedCount?: number;
  batchId?: number;
}> {
  const batch = getLastCompletedBatch();

  if (!batch) {
    return { success: false, message: 'No operation to undo.' };
  }

  const autoUndoFiles = batch.files.filter(
    (f) => f.fileOp !== 'delete-source' && f.fileOp !== 'delete'
  );
  const trashedFiles = batch.files.filter(
    (f) => f.fileOp === 'delete-source' || f.fileOp === 'delete'
  );

  const errors: string[] = [];
  let undoneCount = 0;

  for (const file of autoUndoFiles) {
    try {
      if (batch.operation === 'copy') {
        // Undo copy: verify file still exists, then move to OS trash
        try {
          await fs.access(file.destPath);
        } catch {
          // File doesn't exist - already deleted or moved, skip
          logger.info(`Undo copy: file already gone ${file.destPath}`);
          undoneCount++;
          continue;
        }
        await shell.trashItem(file.destPath);
        logger.info(`Undo copy: trashed ${file.destPath}`);
      } else {
        // Undo move: check source doesn't exist, then restore
        try {
          await fs.access(file.sourcePath);
          // File exists at original location - skip to avoid overwrite
          errors.push(
            `Cannot restore ${path.basename(file.sourcePath)}: file exists at original location`
          );
          continue;
        } catch {
          // Source doesn't exist - safe to restore
        }

        await fs.mkdir(path.dirname(file.sourcePath), { recursive: true });

        try {
          await fs.rename(file.destPath, file.sourcePath);
        } catch (renameError: any) {
          if (renameError.code === 'EXDEV') {
            await fs.copyFile(file.destPath, file.sourcePath, fsConstants.COPYFILE_EXCL);
            // Verify copy before deleting
            const srcStat = await fs.stat(file.sourcePath);
            const destStat = await fs.stat(file.destPath);
            if (srcStat.size !== destStat.size) {
              await fs.unlink(file.sourcePath);
              throw new Error('Cross-device restore verification failed');
            }
            await fs.unlink(file.destPath);
          } else {
            throw renameError;
          }
        }

        // Restore photo path in database
        if (file.photoId) {
          try {
            updatePhotoPath(file.photoId, file.sourcePath);
            logger.info(`Restored photo ${file.photoId} path to ${file.sourcePath}`);
          } catch (err: any) {
            logger.error(`Failed to restore photo path for ${file.photoId}: ${err.message}`);
          }
        }

        logger.info(`Undo move: ${file.destPath} -> ${file.sourcePath}`);
      }
      undoneCount++;
    } catch (error: any) {
      errors.push(`${path.basename(file.sourcePath)}: ${error.message}`);
      logger.error(`Undo failed for ${file.sourcePath}: ${error.message}`);
    }
  }

  if (errors.length > 0) {
    return {
      success: false,
      message: `Partially undone: ${undoneCount} restored, ${errors.length} failed. Batch NOT marked as undone.`,
      undoneCount,
    };
  }

  if (trashedFiles.length > 0) {
    // Auto-undo succeeded but trashed files need manual Recycle Bin restore.
    // Do NOT mark batch as undone yet — that happens in confirmTrashUndo().
    const restoredMsg =
      undoneCount > 0 ? `${undoneCount} file${undoneCount !== 1 ? 's' : ''} restored. ` : '';
    return {
      success: true,
      message: `${restoredMsg}${trashedFiles.length} file${trashedFiles.length !== 1 ? 's' : ''} need${trashedFiles.length === 1 ? 's' : ''} to be restored from the Recycle Bin.`,
      undoneCount,
      trashedCount: trashedFiles.length,
      batchId: batch.id,
    };
  }

  updateBatchStatus(batch.id, 'undone');
  return {
    success: true,
    message: `Undone: ${batch.operation} of ${undoneCount} file${undoneCount !== 1 ? 's' : ''}.`,
    undoneCount,
  };
}

/**
 * Called after the user confirms they have restored trashed files from the
 * OS Recycle Bin. Updates photo paths for the delete-source files and marks
 * the batch as undone.
 */
export function confirmTrashUndo(batchId: number): void {
  const db = getDb();

  const trashedRows = db
    .prepare(
      `SELECT photo_id, source_path FROM operation_batch_files
       WHERE batch_id = ? AND file_op IN ('delete-source', 'delete')`
    )
    .all(batchId) as Array<{ photo_id: number; source_path: string }>;

  for (const row of trashedRows) {
    if (row.photo_id) {
      try {
        updatePhotoPath(row.photo_id, row.source_path);
        logger.info(
          `Confirmed trash undo: restored photo ${row.photo_id} path to ${row.source_path}`
        );
      } catch (err: any) {
        logger.error(`Failed to restore photo path for ${row.photo_id}: ${err.message}`);
      }
    }
  }

  updateBatchStatus(batchId, 'undone');
  logger.info(`Batch ${batchId} marked as undone after trash confirmation`);
}

/**
 * Check if there's a batch available to undo
 */
export function canUndo(): { canUndo: boolean; batchInfo?: BatchInfo } {
  const batch = getLastCompletedBatch();
  if (!batch) {
    return { canUndo: false };
  }
  return {
    canUndo: true,
    batchInfo: {
      id: batch.id,
      operation: batch.operation,
      fileCount: batch.files.length,
      timestamp: batch.timestamp,
    },
  };
}

// ============================================================================
// Helpers
// ============================================================================

function plural(count: number, word: string): string {
  return `${count} ${word}${count !== 1 ? 's' : ''}`;
}

function buildExecutionMessage(opts: {
  opType: OperationType;
  completedCount: number;
  skippedCount: number;
  trashedSourceCount: number;
  trashFailures: string[];
  pathUpdateFailures: string[];
}): string {
  const {
    opType,
    completedCount,
    skippedCount,
    trashedSourceCount,
    trashFailures,
    pathUpdateFailures,
  } = opts;

  const skippedMsg = skippedCount > 0 ? ` (${skippedCount} already in destination, skipped)` : '';
  const opLabel = opType === 'copy' ? 'Copied' : 'Moved';

  let message: string;
  if (completedCount > 0 && trashedSourceCount > 0) {
    message = `${opLabel} ${plural(completedCount, 'file')}. ${plural(trashedSourceCount, 'source file')} sent to Recycle Bin (already at destination).${skippedMsg}`;
  } else if (completedCount > 0) {
    message = `Successfully ${opLabel.toLowerCase()} ${plural(completedCount, 'file')}.${skippedMsg}`;
  } else {
    message = `${plural(trashedSourceCount, 'source file')} sent to Recycle Bin — all files were already at the destination.${skippedMsg}`;
  }

  if (pathUpdateFailures.length > 0) {
    message += ` Warning: ${plural(pathUpdateFailures.length, 'photo path')} could not be updated in the database — the files are safe at the destination. Re-scan the destination folder to restore them.`;
  }
  if (trashFailures.length > 0) {
    message += ` Warning: ${plural(trashFailures.length, 'source file')} could not be sent to Recycle Bin: ${trashFailures.join(', ')}.`;
  }

  return message;
}

function sendProgress(mainWindow: BrowserWindow | null, progress: ExecutionProgress): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('ops:progress', progress);
  }
}
