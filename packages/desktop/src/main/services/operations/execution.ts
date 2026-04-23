/**
 * Copy/move execution with atomic batch semantics.
 *
 * SAFETY PRINCIPLES:
 * 1. ATOMIC: Either ALL files succeed, or NOTHING is modified.
 * 2. NEVER OVERWRITE: Any conflict aborts the entire batch.
 * 3. OS TRASH: Rollback uses system trash (recoverable), not hard delete.
 *
 * Delete is handled separately — see deleter.ts.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BrowserWindow, shell } from 'electron';
import { constants as fsConstants } from 'fs';
import { FileOperation, DryRunResult, OperationType } from '@placemark/core';
import { logOperationBatch, updateBatchStatus, updatePhotoPaths } from '../storage';
import { logger } from '../logger';
import { beginExecution, endExecution, throwIfCancelled, CancelledError } from './cancel';
import { moveFileSafely } from './moveFile';
import { sendProgress } from './progress';
import { buildExecutionMessage } from './messages';

export interface ExecutionResult {
  success: boolean;
  completedCount: number;
  skippedCount: number;
  trashedSourceCount: number;
  message: string;
  batchId: number;
}

/**
 * Execute file operations with ATOMIC batch semantics.
 *
 * FLOW:
 * 1. Get pending operations from dry-run (already validated by IPC handler).
 * 2. Execute one by one with COPYFILE_EXCL (never overwrites).
 * 3. If any execution fails → rollback all completed files.
 */
export async function executeOperations(
  dryRun: DryRunResult,
  opType: OperationType,
  mainWindow: BrowserWindow | null
): Promise<ExecutionResult> {
  beginExecution();
  try {
    const toExecute = dryRun.operations.filter((op) => op.status === 'pending');
    const skippedCount = dryRun.operations.filter((op) => op.status === 'skipped').length;
    const toTrashSource = dryRun.operations.filter((op) => op.status === 'delete-source');

    if (toExecute.length === 0 && toTrashSource.length === 0) {
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

    let batchId = 0;
    const completedOps: FileOperation[] = [];

    try {
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

      for (let i = 0; i < toExecute.length; i++) {
        throwIfCancelled();
        const op = toExecute[i];

        sendProgress(mainWindow, {
          totalFiles: totalFileCount,
          completedFiles: i,
          currentFile: path.basename(op.sourcePath),
          percentage: Math.round((i / totalFileCount) * 100),
          phase: 'executing',
        });

        await fs.mkdir(path.dirname(op.destPath), { recursive: true });

        if (opType === 'copy') {
          await fs.copyFile(op.sourcePath, op.destPath, fsConstants.COPYFILE_EXCL);
        } else {
          await moveFileSafely(op.sourcePath, op.destPath);
        }

        completedOps.push(op);
        logger.info(`${opType}: ${op.sourcePath} -> ${op.destPath}`);
      }

      updateBatchStatus(batchId, 'completed');

      // Post-execute DB work — each step is a single transaction.
      const pathUpdateFailures: string[] = [];
      if (opType === 'move' && completedOps.length > 0) {
        const missing = updatePhotoPaths(
          completedOps.map((op) => ({ photoId: op.photoId, newPath: op.destPath }))
        );
        if (missing.length > 0) {
          logger.error(`Photo rows missing during path update: ${missing.join(', ')}`);
          for (const op of completedOps) {
            if (missing.includes(op.photoId)) pathUpdateFailures.push(op.destPath);
          }
        } else {
          logger.info(`Updated ${completedOps.length} photo path(s) after move`);
        }
      }

      // Trash sources that were already present at destination.
      const {
        trashedCount: trashedSourceCount,
        failedPhotoIds,
        failedBasenames: trashFailures,
      } = await trashSourcesLoop(toTrashSource, toExecute.length, totalFileCount, mainWindow);

      // Update DB paths for successfully-trashed sources (exclude failed ones by
      // photoId, NOT basename — basenames can collide across source folders).
      const trashedDbUpdates = toTrashSource
        .filter((op) => !failedPhotoIds.has(op.photoId))
        .map((op) => ({ photoId: op.photoId, newPath: op.destPath }));
      if (trashedDbUpdates.length > 0) {
        const missing = updatePhotoPaths(trashedDbUpdates);
        if (missing.length > 0) {
          logger.error(
            `Photo rows missing during delete-source path update: ${missing.join(', ')}`
          );
          for (const { photoId, newPath } of trashedDbUpdates) {
            if (missing.includes(photoId)) pathUpdateFailures.push(newPath);
          }
        }
      }

      sendProgress(mainWindow, {
        totalFiles: totalFileCount,
        completedFiles: totalFileCount,
        currentFile: '',
        percentage: 100,
        phase: 'complete',
      });

      return {
        success: true,
        completedCount: completedOps.length,
        skippedCount,
        trashedSourceCount,
        message: buildExecutionMessage({
          opType,
          completedCount: completedOps.length,
          skippedCount,
          trashedSourceCount,
          trashFailures,
          pathUpdateFailures,
        }),
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
    }
  } finally {
    endExecution();
  }
}

/**
 * Trash the given operations' source paths (used for the 'delete-source'
 * cleanup phase of a move where the file was already at the destination).
 * Returns:
 *   - trashedCount: number of successful trashes
 *   - failedPhotoIds: set of photoIds whose source could NOT be trashed
 *     (use this for DB path-update filtering — basenames can collide)
 *   - failedBasenames: user-facing list for the summary message
 */
async function trashSourcesLoop(
  ops: FileOperation[],
  progressOffset: number,
  totalFileCount: number,
  mainWindow: BrowserWindow | null
): Promise<{ trashedCount: number; failedPhotoIds: Set<number>; failedBasenames: string[] }> {
  if (ops.length === 0) {
    return { trashedCount: 0, failedPhotoIds: new Set(), failedBasenames: [] };
  }

  sendProgress(mainWindow, {
    totalFiles: totalFileCount,
    completedFiles: progressOffset,
    currentFile: '',
    percentage: Math.round((progressOffset / totalFileCount) * 100),
    phase: 'cleanup',
  });

  let trashedCount = 0;
  const failedPhotoIds = new Set<number>();
  const failedBasenames: string[] = [];

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    sendProgress(mainWindow, {
      totalFiles: totalFileCount,
      completedFiles: progressOffset + i,
      currentFile: path.basename(op.sourcePath),
      percentage: Math.round(((progressOffset + i) / totalFileCount) * 100),
      phase: 'cleanup',
    });
    try {
      await shell.trashItem(op.sourcePath);
      trashedCount++;
      logger.info(`Trashed source (already at dest): ${op.sourcePath}`);
    } catch (err: any) {
      failedPhotoIds.add(op.photoId);
      failedBasenames.push(path.basename(op.sourcePath));
      logger.error(`Failed to trash source ${op.sourcePath}: ${err.message}`);
    }
  }

  return { trashedCount, failedPhotoIds, failedBasenames };
}

/**
 * Rollback completed operations after a failure.
 * - copy: trash the copied files
 * - move: move files back to source
 */
export async function rollbackCompletedOps(
  completedOps: FileOperation[],
  opType: OperationType
): Promise<number> {
  let failures = 0;
  for (const op of completedOps) {
    try {
      if (opType === 'copy') {
        await shell.trashItem(op.destPath);
      } else {
        // Never overwrite anything that might have appeared at the source path.
        let sourceReappeared = false;
        try {
          await fs.access(op.sourcePath);
          sourceReappeared = true;
        } catch (existsError: any) {
          if (existsError?.code !== 'ENOENT') throw existsError;
        }
        if (sourceReappeared) {
          throw new Error('Cannot rollback move: source path already exists');
        }
        await moveFileSafely(op.destPath, op.sourcePath);
      }
      logger.info(`Rollback: restored ${op.sourcePath}`);
    } catch (rollbackError: any) {
      failures++;
      logger.error(`Rollback failed for ${op.sourcePath}: ${rollbackError.message}`);
    }
  }
  return failures;
}
