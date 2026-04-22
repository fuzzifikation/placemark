/**
 * Batch queries — operation batch logging, undo support, and archival.
 */

import { OperationType, BatchStatus } from '@placemark/core';
import { getDb } from './storageConnection';
import { logger } from './logger';

export type FileOp = 'copy' | 'move' | 'delete' | 'delete-source';

export interface BatchFile {
  photoId: number;
  sourcePath: string;
  destPath: string;
  fileOp: FileOp;
}

export interface OperationBatch {
  id: number;
  operation: OperationType;
  timestamp: number;
  status: BatchStatus;
  error?: string;
  files: BatchFile[];
}

export interface BatchInput {
  operation: OperationType;
  files: BatchFile[];
  timestamp: number;
  status: BatchStatus;
}

export function logOperationBatch(input: BatchInput): number {
  const db = getDb();

  const insertBatch = db.transaction(() => {
    const batchResult = db
      .prepare(
        `INSERT INTO operation_batch (operation, timestamp, status, error)
         VALUES (?, ?, ?, NULL)`
      )
      .run(input.operation, input.timestamp, input.status);

    const batchId = batchResult.lastInsertRowid as number;

    const insertFile = db.prepare(
      `INSERT INTO operation_batch_files (batch_id, source_path, dest_path, photo_id, file_op)
       VALUES (?, ?, ?, ?, ?)`
    );

    for (const file of input.files) {
      insertFile.run(batchId, file.sourcePath, file.destPath, file.photoId, file.fileOp);
    }

    return batchId;
  });

  return insertBatch();
}

export function updateBatchStatus(batchId: number, status: BatchStatus, error?: string): void {
  getDb()
    .prepare('UPDATE operation_batch SET status = ?, error = ? WHERE id = ?')
    .run(status, error ?? null, batchId);
}

export function getLastCompletedBatch(): OperationBatch | null {
  const db = getDb();

  const batchRow = db
    .prepare(
      `SELECT * FROM operation_batch
       WHERE status = 'completed'
       ORDER BY timestamp DESC
       LIMIT 1`
    )
    .get() as
    | {
        id: number;
        operation: string;
        timestamp: number;
        status: string;
        error: string | null;
      }
    | undefined;

  if (!batchRow) return null;

  const fileRows = db
    .prepare('SELECT * FROM operation_batch_files WHERE batch_id = ?')
    .all(batchRow.id) as Array<{
    photo_id: number;
    source_path: string;
    dest_path: string;
    file_op: string;
  }>;

  return {
    id: batchRow.id,
    operation: batchRow.operation as OperationType,
    timestamp: batchRow.timestamp,
    status: batchRow.status as BatchStatus,
    error: batchRow.error ?? undefined,
    files: fileRows.map((row) => ({
      photoId: row.photo_id,
      sourcePath: row.source_path,
      destPath: row.dest_path,
      fileOp: row.file_op as FileOp,
    })),
  };
}

export function archiveCompletedBatches(): number {
  const result = getDb()
    .prepare("UPDATE operation_batch SET status = 'archived' WHERE status = 'completed'")
    .run();

  if (result.changes > 0) {
    logger.info(`Archived ${result.changes} completed operation batches from previous session`);
  }
  return result.changes;
}
