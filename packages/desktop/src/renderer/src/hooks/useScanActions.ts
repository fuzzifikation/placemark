/**
 * useScanActions — orchestrates local folder scanning, OneDrive import, and
 * library clearing. Extracted from App.tsx to keep the shell thin.
 */

import { useCallback } from 'react';
import type { OneDriveFolderItem } from '../types/preload';

interface ScanDeps {
  folderScan: {
    scanning: boolean;
    scanFolder: (onComplete: () => Promise<void>, maxFileSizeMB: number) => Promise<any>;
    importOneDriveFolder: (itemId: string, onComplete: () => Promise<void>) => Promise<void>;
  };
  photoData: {
    allPhotos: { length: number };
    loadPhotos: () => Promise<void>;
    clearAllFilters: () => void;
  };
  settings: { maxFileSizeMB: number };
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
  };
  setShowScanOverlay: (v: boolean) => void;
  setFitSignal: (fn: (n: number) => number) => void;
}

export function useScanActions(deps: ScanDeps) {
  const { folderScan, photoData, settings, toast, setShowScanOverlay, setFitSignal } = deps;

  const handleScanFolder = useCallback(async () => {
    try {
      const result = await folderScan.scanFolder(photoData.loadPhotos, settings.maxFileSizeMB);

      if (!result || result.canceled) {
        if (photoData.allPhotos.length > 0) {
          setShowScanOverlay(false);
        }
        return;
      }

      setShowScanOverlay(false);

      if (result.errors && result.errors.length > 0) {
        toast.error(
          `Scan completed with ${result.errors.length} error(s). Some files could not be processed.`
        );
      } else if (result.photosWithLocation === 0) {
        toast.info('No photos with location data found in this folder.');
      } else {
        setFitSignal((n) => n + 1);
        toast.success(
          `Found ${result.photosWithLocation} photo${result.photosWithLocation !== 1 ? 's' : ''} with location data.`
        );
      }
    } catch (error) {
      toast.error(`Failed to scan folder: ${error}`);
    }
  }, [
    folderScan,
    photoData.loadPhotos,
    photoData.allPhotos.length,
    settings.maxFileSizeMB,
    toast,
    setShowScanOverlay,
    setFitSignal,
  ]);

  const handleClearLibrary = useCallback(async () => {
    if (
      !window.confirm(
        'Remove all photos from the library?\n\nThumbnail cache will also be cleared. Your actual photo files will not be deleted.'
      )
    ) {
      return;
    }
    await window.api.photos.clearDatabase();
    await window.api.thumbnails.clearCache();
    photoData.clearAllFilters();
    await photoData.loadPhotos();
  }, [photoData]);

  const handleSelectOneDriveFolder = useCallback(
    async (folder: OneDriveFolderItem) => {
      await folderScan.importOneDriveFolder(folder.id, photoData.loadPhotos);
      setFitSignal((n) => n + 1);
      setShowScanOverlay(false);
    },
    [folderScan, photoData.loadPhotos, setFitSignal, setShowScanOverlay]
  );

  return { handleScanFolder, handleClearLibrary, handleSelectOneDriveFolder };
}
