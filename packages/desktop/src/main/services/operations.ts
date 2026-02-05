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
  markBatchUndone,
  updateBatchStatus,
  updatePhotoPath,
} from './storage';
import { logger } from './logger';

// ============================================================================
// Cancellation + single-operation guard
// ============================================================================

class CancelledError extends Error {
  public readonly type = 'cancelled';
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

export interface ExecutionProgress {
  totalFiles: number;
  completedFiles: number;
  currentFile: string;
  percentage: number;
  phase: 'executing' | 'complete';
}

export interface ExecutionResult {
  success: boolean;
  completedCount: number;
  skippedCount: number;
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

  // Nothing to do
  if (toExecute.length === 0) {
    activeExecution = null;
    return {
      success: true,
      completedCount: 0,
      skippedCount,
      message:
        skippedCount > 0
          ? `All ${skippedCount} files are already in the destination folder.`
          : 'No files to process.',
      batchId: 0,
    };
  }

  sendProgress(mainWindow, {
    totalFiles: toExecute.length,
    completedFiles: 0,
    currentFile: 'Starting...',
    percentage: 0,
    phase: 'executing',
  });

  // Log batch to database BEFORE execution
  const batchId = logOperationBatch({
    operation: opType,
    files: toExecute.map((op) => ({
      photoId: op.photoId,
      sourcePath: op.sourcePath,
      destPath: op.destPath,
    })),
    timestamp: Date.now(),
    status: 'pending',
  });

  // Execute operations
  const completedOps: FileOperation[] = [];

  try {
    for (let i = 0; i < toExecute.length; i++) {
      if (activeExecution?.cancelRequested) {
        throw new CancelledError('Operation cancelled by user.');
      }

      const op = toExecute[i];

      sendProgress(mainWindow, {
        totalFiles: toExecute.length,
        completedFiles: i,
        currentFile: path.basename(op.sourcePath),
        percentage: Math.round((i / toExecute.length) * 100),
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
    updateBatchStatus(batchId, 'completed');

    // PHASE 4: Update photo paths in database (MOVE only)
    // This keeps the photos table in sync with actual file locations
    if (opType === 'move') {
      for (const op of completedOps) {
        try {
          updatePhotoPath(op.photoId, op.destPath);
          logger.info(`Updated photo ${op.photoId} path to ${op.destPath}`);
        } catch (err: any) {
          logger.error(`Failed to update photo path for ${op.photoId}: ${err.message}`);
          // Continue - the file is moved, just log the db update failure
        }
      }
    }

    sendProgress(mainWindow, {
      totalFiles: toExecute.length,
      completedFiles: toExecute.length,
      currentFile: '',
      percentage: 100,
      phase: 'complete',
    });

    const skippedMsg = skippedCount > 0 ? ` (${skippedCount} already in destination)` : '';
    return {
      success: true,
      completedCount: completedOps.length,
      skippedCount,
      message: `Successfully ${opType === 'copy' ? 'copied' : 'moved'} ${completedOps.length} files.${skippedMsg}`,
      batchId,
    };
  } catch (error: any) {
    const wasCancelled = error?.type === 'cancelled';
    const failureLabel = wasCancelled ? 'Operation cancelled' : 'Operation failed';
    logger.error(`${failureLabel}: ${error.message}. Rolling back...`);

    const rollbackFailures = await rollbackCompletedOps(completedOps, opType);
    updateBatchStatus(batchId, wasCancelled ? 'cancelled' : 'failed', error.message);

    const rollbackNote =
      rollbackFailures === 0
        ? `${completedOps.length} completed files have been rolled back.`
        : `${completedOps.length - rollbackFailures} rolled back, ${rollbackFailures} rollback steps failed. Manual review recommended.`;

    if (wasCancelled) {
      throw new CancelledError(`Cancelled. ${rollbackNote}`);
    }

    throw new Error(`Operation failed: ${error.message}. ${rollbackNote}`);
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
 * Undo the last completed batch operation
 * For copy: move copied files to OS trash (recoverable)
 * For move: move files back to original locations
 */
export async function undoLastBatch(): Promise<{
  success: boolean;
  message: string;
  undoneCount?: number;
}> {
  const batch = getLastCompletedBatch();

  if (!batch) {
    return { success: false, message: 'No operation to undo.' };
  }

  const errors: string[] = [];
  let undoneCount = 0;

  for (const file of batch.files) {
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
              // Copy failed - remove partial and throw
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
            // Continue - file is restored, just log the db update failure
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

  // Only mark as undone if ALL files were successfully undone
  if (errors.length === 0) {
    markBatchUndone(batch.id);
  } else {
    // Partial undo - don't mark batch as undone so user knows something's wrong
    return {
      success: false,
      message: `Partially undone: ${undoneCount} restored, ${errors.length} failed. Batch NOT marked as undone.`,
      undoneCount,
    };
  }

  return {
    success: true,
    message: `Undone: ${batch.operation} of ${undoneCount} files.`,
    undoneCount,
  };
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

function sendProgress(mainWindow: BrowserWindow | null, progress: ExecutionProgress): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('ops:progress', progress);
  }
}
