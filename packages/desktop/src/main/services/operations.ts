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
// Types
// ============================================================================

export interface ExecutionProgress {
  totalFiles: number;
  completedFiles: number;
  currentFile: string;
  percentage: number;
  phase: 'validating' | 'executing' | 'complete';
}

export interface ExecutionResult {
  success: boolean;
  completedCount: number;
  skippedCount: number;
  message: string;
  batchId: number;
}

export interface ConflictError {
  type: 'conflict';
  conflicts: string[];
  message: string;
}

export interface BatchInfo {
  id: number;
  operation: OperationType;
  fileCount: number;
  timestamp: number;
}

// ============================================================================
// Path utilities
// ============================================================================

/**
 * Normalize path for comparison (lowercase, forward slashes)
 */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase();
}

/**
 * Check if two paths refer to the same file
 */
function isSameFile(source: string, dest: string): boolean {
  return normalizePath(source) === normalizePath(dest);
}

// ============================================================================
// Pre-flight validation
// ============================================================================

/**
 * Pre-flight validation: Check ALL files before touching anything
 * Returns list of operations to execute (excluding same-file skips)
 * Throws ConflictError if any file would be overwritten
 */
async function validateBatch(
  operations: FileOperation[]
): Promise<{ toExecute: FileOperation[]; skipped: FileOperation[] }> {
  const toExecute: FileOperation[] = [];
  const skipped: FileOperation[] = [];
  const conflicts: string[] = [];

  for (const op of operations) {
    // Skip same-file operations (source === dest)
    if (isSameFile(op.sourcePath, op.destPath)) {
      skipped.push(op);
      continue;
    }

    // Check if source still exists
    try {
      await fs.access(op.sourcePath);
    } catch {
      throw new Error(`Source file no longer exists: ${path.basename(op.sourcePath)}`);
    }

    // Check if destination already exists (CONFLICT)
    try {
      await fs.access(op.destPath);
      // File exists at destination = CONFLICT
      conflicts.push(path.basename(op.destPath));
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        // File doesn't exist at destination = OK to proceed
        toExecute.push(op);
      } else {
        throw new Error(`Cannot check destination: ${err.message}`);
      }
    }
  }

  // If ANY conflicts, abort entire batch
  if (conflicts.length > 0) {
    const error: ConflictError = {
      type: 'conflict',
      conflicts,
      message:
        conflicts.length === 1
          ? `File already exists at destination: "${conflicts[0]}". Operation cancelled.`
          : `${conflicts.length} files already exist at destination (e.g., "${conflicts[0]}"). Operation cancelled.`,
    };
    throw error;
  }

  return { toExecute, skipped };
}

// ============================================================================
// Execution
// ============================================================================

/**
 * Execute file operations with ATOMIC batch semantics
 *
 * FLOW:
 * 1. Validate ALL files (pre-flight check) - NO modifications
 * 2. If any conflict → abort with clear message
 * 3. If all clear → execute one by one
 * 4. If any execution fails → rollback all completed files
 */
export async function executeOperations(
  dryRun: DryRunResult,
  opType: OperationType,
  mainWindow: BrowserWindow | null
): Promise<ExecutionResult> {
  const pendingOps = dryRun.operations.filter((op) => op.status === 'pending');

  sendProgress(mainWindow, {
    totalFiles: pendingOps.length,
    completedFiles: 0,
    currentFile: 'Validating...',
    percentage: 0,
    phase: 'validating',
  });

  // PHASE 1: Pre-flight validation (NO file modifications)
  let toExecute: FileOperation[];
  let skipped: FileOperation[];

  try {
    const validation = await validateBatch(pendingOps);
    toExecute = validation.toExecute;
    skipped = validation.skipped;
  } catch (error: any) {
    if (error.type === 'conflict') {
      throw error; // Re-throw ConflictError for UI
    }
    throw new Error(`Validation failed: ${error.message}`);
  }

  // Nothing to do (all files were same-file skips)
  if (toExecute.length === 0) {
    return {
      success: true,
      completedCount: 0,
      skippedCount: skipped.length,
      message:
        skipped.length > 0
          ? `All ${skipped.length} files are already in the destination folder.`
          : 'No files to process.',
      batchId: 0,
    };
  }

  // PHASE 2: Log batch to database BEFORE execution
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

  // PHASE 3: Execute operations
  const completedOps: FileOperation[] = [];

  try {
    for (let i = 0; i < toExecute.length; i++) {
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
        await fs.copyFile(op.sourcePath, op.destPath);
      } else {
        // Move: try rename first (fast), fallback to copy+delete
        try {
          await fs.rename(op.sourcePath, op.destPath);
        } catch (renameError: any) {
          if (renameError.code === 'EXDEV') {
            // Cross-device: copy then verify then delete
            await fs.copyFile(op.sourcePath, op.destPath);

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

    const skippedMsg = skipped.length > 0 ? ` (${skipped.length} already in destination)` : '';
    return {
      success: true,
      completedCount: completedOps.length,
      skippedCount: skipped.length,
      message: `Successfully ${opType === 'copy' ? 'copied' : 'moved'} ${completedOps.length} files.${skippedMsg}`,
      batchId,
    };
  } catch (error: any) {
    // Execution failed mid-batch - rollback completed operations
    logger.error(`Operation failed: ${error.message}. Rolling back...`);

    await rollbackCompletedOps(completedOps, opType);
    updateBatchStatus(batchId, 'failed', error.message);

    throw new Error(
      `Operation failed: ${error.message}. ` +
        `${completedOps.length} completed files have been rolled back.`
    );
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
): Promise<void> {
  for (const op of completedOps) {
    try {
      if (opType === 'copy') {
        await shell.trashItem(op.destPath);
      } else {
        try {
          await fs.rename(op.destPath, op.sourcePath);
        } catch (renameError: any) {
          if (renameError.code === 'EXDEV') {
            await fs.copyFile(op.destPath, op.sourcePath);
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
      logger.error(`Rollback failed for ${op.sourcePath}: ${rollbackError.message}`);
    }
  }
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
            await fs.copyFile(file.destPath, file.sourcePath);
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
