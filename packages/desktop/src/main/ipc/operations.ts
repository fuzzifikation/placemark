/**
 * IPC handlers for file operations
 */

import { ipcMain, dialog } from 'electron';
import * as fs from 'fs/promises';
import { constants } from 'fs';
import {
  generateDryRun,
  isValidDestination,
  FileOperation,
  DryRunResult,
  Photo,
  OperationType,
} from '@placemark/core';
import * as path from 'path';

export function registerOperationHandlers(): void {
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
    async (_event, photos: Photo[], destPath: string, opType: OperationType) => {
      // 1. Basic validation
      const validCheck = isValidDestination(destPath);
      if (!validCheck.valid) {
        throw new Error(validCheck.error);
      }

      // 2. Generate plan (pure logic)
      const plan = generateDryRun(photos, destPath, opType);

      // 3. Enrich plan with reality checks (IO)
      const enrichedOps: FileOperation[] = [];
      const warnings: string[] = [...plan.summary.warnings];

      // Check disk space (rough estimate, standard 4KB blocks)
      try {
        // fs.statfs is available in Node 18+
        // Fallback or skip if not available, or use a library.
        // For now, let's skip complex disk space check to keep it simple,
        // or check write permissions.
        await fs.access(destPath, constants.W_OK);
      } catch (e) {
        throw new Error(`Destination not writable: ${destPath}`);
      }

      // Check file collisions
      for (const op of plan.operations) {
        const enrichedOp: FileOperation = { ...op };

        try {
          await fs.access(op.destPath);
          // If access successful, file exists -> CONFLICT
          enrichedOp.status = 'conflict';
          enrichedOp.error = 'File already exists at destination';

          // Add specific warning
          warnings.push(`Conflict: ${path.basename(op.destPath)} already exists`);
        } catch (err: any) {
          if (err.code === 'ENOENT') {
            // File does not exist -> OK
            enrichedOp.status = 'pending';
          } else {
            // Verify permissions errors or other FS issues
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

      return result;
    }
  );

  // CRITICAL: Block execution for this preview release
  ipcMain.handle('ops:execute', async () => {
    throw new Error('File operations (Copy/Move) are disabled in this preview version for safety.');
  });
}
