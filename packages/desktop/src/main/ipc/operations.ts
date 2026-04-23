/**
 * IPC handlers for file operations.
 *
 * Thin layer: validates the IPC envelope, delegates to services/operations,
 * and maps CancelledError → structured result.
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import { DryRunResult, OperationType } from '@placemark/core';
import {
  generateDryRun,
  executeOperations,
  executeDelete,
  undoLastBatch,
  canUndo,
  requestCancel,
  confirmTrashUndo,
  CancelledError,
} from '../services/operations';

// Dry-run state cache — the renderer generates a preview, then executes.
// Modal UI prevents concurrent dry-runs, so a single slot is sufficient.
let lastDryRunResult: DryRunResult | null = null;
let lastOpType: OperationType | null = null;

// Set at startup when completed batches were archived (undo history cleared).
let startupUndoCleared = false;
export function setStartupUndoCleared(value: boolean): void {
  startupUndoCleared = value;
}

export function registerOperationHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('ops:wasUndoHistoryCleared', () => {
    const result = startupUndoCleared;
    startupUndoCleared = false;
    return result;
  });

  ipcMain.handle('ops:selectDestination', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Destination Folder',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    'ops:generateDryRun',
    async (_event, photoIds: number[], destPath: string, opType: string) => {
      // TS contract enforces opType; trust the renderer (bundled, trusted code).
      const validatedOpType = opType as OperationType;
      const result = await generateDryRun(photoIds, destPath, validatedOpType);
      lastDryRunResult = result;
      lastOpType = validatedOpType;
      return result;
    }
  );

  ipcMain.handle('ops:execute', async () => {
    if (!lastDryRunResult || !lastOpType) {
      throw new Error('No operation preview available. Please generate a preview first.');
    }

    // Strict atomic semantics: any conflicts/errors must be resolved first.
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
    const deleteSourceOps = lastDryRunResult.operations.filter(
      (op) => op.status === 'delete-source'
    );
    if (pendingOps.length === 0 && deleteSourceOps.length === 0) {
      throw new Error('No pending operations to execute.');
    }

    try {
      if (lastOpType === 'delete') {
        const result = await executeDelete(lastDryRunResult, getMainWindow());
        lastDryRunResult = null;
        lastOpType = null;
        return result;
      }
      const result = await executeOperations(lastDryRunResult, lastOpType, getMainWindow());
      lastDryRunResult = null;
      lastOpType = null;
      return result;
    } catch (err: any) {
      // Plan is stale after any execution attempt (rollback restored FS on failure).
      lastDryRunResult = null;
      lastOpType = null;
      if (err instanceof CancelledError) {
        return { success: false, cancelled: true, message: err.message };
      }
      throw err;
    }
  });

  ipcMain.handle('ops:cancel', async () => requestCancel());
  ipcMain.handle('ops:undo', async () => undoLastBatch());
  ipcMain.handle('ops:canUndo', async () => canUndo());

  ipcMain.handle('ops:confirmTrashUndo', (_event, batchId: number) => {
    if (typeof batchId !== 'number' || !Number.isInteger(batchId) || batchId <= 0) {
      throw new Error('Invalid batchId');
    }
    confirmTrashUndo(batchId);
  });
}
