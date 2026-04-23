/**
 * Progress reporting for file operations.
 */

import { BrowserWindow } from 'electron';

export interface ExecutionProgress {
  totalFiles: number;
  completedFiles: number;
  currentFile: string;
  percentage: number;
  phase: 'executing' | 'cleanup' | 'complete';
}

export function sendProgress(mainWindow: BrowserWindow | null, progress: ExecutionProgress): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('ops:progress', progress);
  }
}
