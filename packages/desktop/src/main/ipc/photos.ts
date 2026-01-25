/**
 * IPC handlers for photo operations
 */

import { ipcMain, dialog } from 'electron';
import { scanDirectory } from '../services/filesystem';
import { getPhotosWithLocation, getPhotoCountWithLocation } from '../services/storage';

export function registerPhotoHandlers(): void {
  // Select and scan a folder
  ipcMain.handle('photos:scanFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select folder to scan for photos',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const folderPath = result.filePaths[0];
    // Note: folderPath comes from Electron's native dialog, which is trusted
    // No path traversal risk as user explicitly selected via OS dialog
    const scanResult = await scanDirectory(folderPath, 'local');

    return {
      canceled: false,
      folderPath,
      ...scanResult,
    };
  });

  // Get all photos with location
  ipcMain.handle('photos:getWithLocation', async () => {
    return getPhotosWithLocation();
  });

  // Get count of photos with location
  ipcMain.handle('photos:getCountWithLocation', async () => {
    return getPhotoCountWithLocation();
  });
}
