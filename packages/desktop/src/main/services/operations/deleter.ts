/**
 * Delete execution — sends photos to the OS Recycle Bin and removes DB records.
 *
 * No cancellation: each `shell.trashItem` call is atomic per-file; stopping
 * mid-batch would leave DB and filesystem out of sync, so delete always runs
 * to completion once started.
 *
 * No rollback: once trashed, files sit in the OS Recycle Bin (user-recoverable).
 * DB records are removed only for successfully-trashed files.
 */

import * as path from 'path';
import { BrowserWindow, shell } from 'electron';
import { DryRunResult } from '@placemark/core';
import { logOperationBatch, updateBatchStatus, deletePhotosByIds } from '../storage';
import { logger } from '../logger';
import { beginExecution, endExecution } from './cancel';
import { sendProgress } from './progress';
import { plural } from './messages';

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
  beginExecution();
  try {
    const toDelete = dryRun.operations.filter((op) => op.status === 'pending');
    if (toDelete.length === 0) {
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

    for (let i = 0; i < toDelete.length; i++) {
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
        ? ` ${plural(failures.length, 'file')} could not be sent to the Recycle Bin and were not removed.`
        : '';
    return {
      success: true,
      trashedCount: succeededIds.length,
      failedCount: failures.length,
      message: `Sent ${plural(succeededIds.length, 'file')} to the Recycle Bin.${failureNote}`,
      batchId,
    };
  } finally {
    endExecution();
  }
}
