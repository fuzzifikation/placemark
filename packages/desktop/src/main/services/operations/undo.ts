/**
 * Undo / redo-trash confirmation for the last completed operation batch.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { shell } from 'electron';
import { OperationType } from '@placemark/core';
import { getLastCompletedBatch, updateBatchStatus, updatePhotoPath } from '../storage';
import { getDb } from '../storageConnection';
import { logger } from '../logger';
import { moveFileSafely, pathExists } from './moveFile';
import { plural } from './messages';

export interface BatchInfo {
  id: number;
  operation: OperationType;
  fileCount: number;
  timestamp: number;
}

/**
 * Undo the last completed batch.
 *
 * - copy / move files are reversed automatically.
 * - delete-source files (trashed during a move) or delete files cannot be
 *   untrashed programmatically. Their count is returned so the renderer can
 *   prompt the user to restore them manually from the OS Recycle Bin.
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
        if (!(await pathExists(file.destPath))) {
          logger.info(`Undo copy: file already gone ${file.destPath}`);
          undoneCount++;
          continue;
        }
        await shell.trashItem(file.destPath);
        logger.info(`Undo copy: trashed ${file.destPath}`);
      } else {
        if (await pathExists(file.sourcePath)) {
          errors.push(
            `Cannot restore ${path.basename(file.sourcePath)}: file exists at original location`
          );
          continue;
        }
        await fs.mkdir(path.dirname(file.sourcePath), { recursive: true });
        await moveFileSafely(file.destPath, file.sourcePath);

        try {
          updatePhotoPath(file.photoId, file.sourcePath);
          logger.info(`Restored photo ${file.photoId} path to ${file.sourcePath}`);
        } catch (err: any) {
          logger.error(`Failed to restore photo path for ${file.photoId}: ${err.message}`);
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
    const restoredMsg = undoneCount > 0 ? `${plural(undoneCount, 'file')} restored. ` : '';
    return {
      success: true,
      message: `${restoredMsg}${plural(trashedFiles.length, 'file')} need${trashedFiles.length === 1 ? 's' : ''} to be restored from the Recycle Bin.`,
      undoneCount,
      trashedCount: trashedFiles.length,
      batchId: batch.id,
    };
  }

  updateBatchStatus(batch.id, 'undone');
  return {
    success: true,
    message: `Undone: ${batch.operation} of ${plural(undoneCount, 'file')}.`,
    undoneCount,
  };
}

/**
 * Called after the user confirms they have restored trashed files from the
 * OS Recycle Bin. Updates photo paths for delete-source/delete files and marks
 * the batch as undone.
 *
 * Validates that the batch exists and status is 'completed' (i.e. not yet
 * finalised by undoLastBatch).
 */
export function confirmTrashUndo(batchId: number): void {
  const db = getDb();

  const batchRow = db.prepare('SELECT status FROM operation_batch WHERE id = ?').get(batchId) as
    | { status: string }
    | undefined;

  if (!batchRow) {
    throw new Error(`Batch ${batchId} not found`);
  }
  if (batchRow.status !== 'completed') {
    throw new Error(
      `Batch ${batchId} cannot be confirmed — status is '${batchRow.status}', expected 'completed'`
    );
  }

  const trashedRows = db
    .prepare(
      `SELECT photo_id, source_path FROM operation_batch_files
       WHERE batch_id = ? AND file_op IN ('delete-source', 'delete')`
    )
    .all(batchId) as Array<{ photo_id: number; source_path: string }>;

  for (const row of trashedRows) {
    try {
      updatePhotoPath(row.photo_id, row.source_path);
      logger.info(
        `Confirmed trash undo: restored photo ${row.photo_id} path to ${row.source_path}`
      );
    } catch (err: any) {
      logger.error(`Failed to restore photo path for ${row.photo_id}: ${err.message}`);
    }
  }

  updateBatchStatus(batchId, 'undone');
  logger.info(`Batch ${batchId} marked as undone after trash confirmation`);
}

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
