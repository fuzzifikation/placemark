/**
 * IPC handlers for photo operations
 */

import { ipcMain, dialog, shell, app } from 'electron';
import { scanDirectory, requestAbort } from '../services/filesystem';
import {
  getPhotosWithLocation,
  getPhotoCountWithLocation,
  clearAllPhotos,
  getPhotoDateRange,
  getPhotoHistogram,
  closeStorage,
  getPhotoById,
  getLibraryStats,
} from '../services/storage';
import { ThumbnailService } from '../services/thumbnails';
import { logger } from '../services/logger';
import { promises as fs, constants, statSync } from 'fs';
import * as path from 'path';

function isSafeOneDriveUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'onedrive.live.com' || parsed.hostname.endsWith('.sharepoint.com'))
    );
  } catch {
    return false;
  }
}

let thumbnailService: ThumbnailService;

export function registerPhotoHandlers(): void {
  // Initialize thumbnail service
  thumbnailService = new ThumbnailService();

  // Abort the currently running scan
  ipcMain.handle('photos:abortScan', async () => {
    requestAbort();
  });

  // Select and scan a folder
  ipcMain.handle(
    'photos:scanFolder',
    async (event, includeSubdirectories: boolean = true, maxFileSizeMB: number = 150) => {
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
        includeSubdirectories,
        maxFileSizeMB
      );

      return {
        canceled: false,
        folderPath,
        ...scanResult,
      };
    }
  );

  // Get all photos with location
  ipcMain.handle('photos:getWithLocation', async () => {
    return getPhotosWithLocation();
  });

  // Get date range of photos
  ipcMain.handle('photos:getDateRange', async () => {
    return getPhotoDateRange();
  });

  // Get count of photos with location
  ipcMain.handle('photos:getCountWithLocation', async () => {
    return getPhotoCountWithLocation();
  });

  // Open photo in system default viewer (or OneDrive web viewer)
  ipcMain.handle('photos:openInViewer', async (_event, photoId: number) => {
    const photo = getPhotoById(photoId);
    if (!photo) {
      throw new Error(`Photo not found: ${photoId}`);
    }
    if (photo.source === 'onedrive') {
      if (!photo.cloudWebUrl) {
        throw new Error('No OneDrive web URL available for this photo');
      }
      if (!isSafeOneDriveUrl(photo.cloudWebUrl)) {
        throw new Error('Invalid OneDrive URL');
      }
      await shell.openExternal(photo.cloudWebUrl);
    } else {
      // Validate path exists and is readable
      try {
        await fs.access(photo.path, constants.R_OK);
      } catch {
        throw new Error(`Photo file not accessible: ${photo.path}`);
      }
      await shell.openPath(photo.path);
    }
  });

  // Show photo in file explorer (or OneDrive folder in browser)
  ipcMain.handle('photos:showInFolder', async (_event, photoId: number) => {
    const photo = getPhotoById(photoId);
    if (!photo) {
      throw new Error(`Photo not found: ${photoId}`);
    }
    if (photo.source === 'onedrive') {
      if (!photo.cloudFolderWebUrl) {
        throw new Error('No OneDrive folder URL available for this photo');
      }
      if (!isSafeOneDriveUrl(photo.cloudFolderWebUrl)) {
        throw new Error('Invalid OneDrive URL');
      }
      await shell.openExternal(photo.cloudFolderWebUrl);
    } else {
      // Validate path exists
      try {
        await fs.access(photo.path, constants.R_OK);
      } catch {
        throw new Error(`Photo file not accessible: ${photo.path}`);
      }
      shell.showItemInFolder(photo.path);
    }
  });

  // Show multiple photos in file explorer
  ipcMain.handle('photos:showMultipleInFolder', async (_event, filePaths: string[]) => {
    if (!filePaths || filePaths.length === 0) {
      throw new Error('No file paths provided');
    }

    // Validate all paths exist
    for (const filePath of filePaths) {
      try {
        await fs.access(filePath, constants.R_OK);
      } catch {
        throw new Error(`File not accessible: ${filePath}`);
      }
    }

    // Show the first file — all selected photos are always in the same folder
    // from the current UI. On Linux, open the containing folder instead.
    if (process.platform === 'linux') {
      shell.openPath(path.dirname(filePaths[0]));
    } else {
      shell.showItemInFolder(filePaths[0]);
    }
  });

  // Get database statistics
  ipcMain.handle('photos:getDatabaseStats', async () => {
    const userDataPath = app.getPath('userData');
    const photosDbPath = path.join(userDataPath, 'placemark.db');
    const thumbnailsDbPath = path.join(userDataPath, 'thumbnails.db');

    const getFileSize = (filePath: string): number => {
      try {
        const stats = statSync(filePath);
        return stats.size / (1024 * 1024); // Convert to MB
      } catch {
        return 0;
      }
    };

    return {
      photosDbSizeMB: getFileSize(photosDbPath),
      thumbnailsDbSizeMB: getFileSize(thumbnailsDbPath),
      totalPhotoCount: getPhotoCountWithLocation(),
    };
  });

  // Clear all photos from database
  ipcMain.handle('photos:clearDatabase', async () => {
    clearAllPhotos();
  });

  // Get library statistics (aggregated photo metadata)
  ipcMain.handle('photos:getLibraryStats', async () => {
    return getLibraryStats();
  });

  // Histogram of photo counts per equi-temporal bucket
  ipcMain.handle(
    'photos:getHistogram',
    async (_event, minDate: number, maxDate: number, bucketCount: number, gpsOnly: boolean) => {
      return getPhotoHistogram(minDate, maxDate, bucketCount, gpsOnly);
    }
  );

  // Get thumbnail for photo
  // The handler resolves the photo from the DB so the renderer never needs to pass a path.
  ipcMain.handle('thumbnails:get', async (_event, photoId: number) => {
    try {
      // Fast path: return from cache without touching the photos DB
      const cached = thumbnailService.getThumbnail(photoId);
      if (cached) return cached;

      const photo = getPhotoById(photoId);
      if (!photo) return null;

      if (photo.source === 'onedrive') {
        // Lazy-import to avoid circular module init (photos ↔ onedrive)
        const { oneDriveAuthService } = await import('./onedrive');
        return await thumbnailService.generateThumbnailFromOneDrive(
          photoId,
          photo.cloudItemId!,
          oneDriveAuthService
        );
      }

      return await thumbnailService.generateThumbnail(photoId, photo.path);
    } catch (error) {
      logger.error('Failed to get thumbnail:', error);
      return null;
    }
  });

  // Get thumbnail cache statistics
  ipcMain.handle('thumbnails:getStats', async () => {
    return thumbnailService.getCacheStats();
  });

  // Clear thumbnail cache
  ipcMain.handle('thumbnails:clearCache', async () => {
    thumbnailService.clearCache();
  });

  // Set maximum cache size
  ipcMain.handle('thumbnails:setMaxSize', async (_event, sizeMB: number) => {
    thumbnailService.setMaxSizeMB(sizeMB);
  });
}

export function closeThumbnailService(): void {
  if (thumbnailService) {
    thumbnailService.close();
  }
}
