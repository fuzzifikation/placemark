/**
 * IPC handlers for photo operations
 */

import { ipcMain, dialog, shell } from 'electron';
import { scanDirectory } from '../services/filesystem';
import {
  getPhotosWithLocation,
  getPhotoCountWithLocation,
  clearAllPhotos,
  getPhotoDateRange,
  getPhotosWithLocationInDateRange,
} from '../services/storage';

export function registerPhotoHandlers(): void {
  // Select and scan a folder
  ipcMain.handle('photos:scanFolder', async (event, includeSubdirectories: boolean = true) => {
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
    const scanResult = await scanDirectory(
      folderPath,
      'local',
      (progress) => {
        // Send progress updates to renderer
        event.sender.send('photos:scanProgress', progress);
      },
      includeSubdirectories
    );

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

  // Get photos with location in date range
  ipcMain.handle(
    'photos:getWithLocationInDateRange',
    async (_event, startTimestamp: number | null, endTimestamp: number | null) => {
      return getPhotosWithLocationInDateRange(startTimestamp, endTimestamp);
    }
  );

  // Get date range of photos
  ipcMain.handle('photos:getDateRange', async () => {
    return getPhotoDateRange();
  });

  // Get count of photos with location
  ipcMain.handle('photos:getCountWithLocation', async () => {
    return getPhotoCountWithLocation();
  });

  // Open photo in system default viewer
  ipcMain.handle('photos:openInViewer', async (_event, path: string) => {
    await shell.openPath(path);
  });

  // Show photo in file explorer
  ipcMain.handle('photos:showInFolder', async (_event, path: string) => {
    shell.showItemInFolder(path);
  });

  // Clear all photos from database
  ipcMain.handle('photos:clearDatabase', async () => {
    clearAllPhotos();
  });
}
