/**
 * useFolderScan - Manages folder scanning state and operations
 */

import { useState } from 'react';

interface ScanProgress {
  currentFile: string;
  processed: number;
  total: number;
  startTime?: number;
  eta?: number; // estimated time remaining in seconds
}

export function useFolderScan() {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [includeSubdirectories, setIncludeSubdirectories] = useState(true);

  const scanFolder = async (onComplete?: () => Promise<void>, maxFileSizeMB: number = 150) => {
    setScanning(true);
    setScanProgress(null);

    const startTime = Date.now();

    // Set up progress listener
    const removeListener = window.api.photos.onScanProgress((progress) => {
      const elapsed = (Date.now() - startTime) / 1000; // seconds
      const progressRatio = progress.processed / progress.total;
      const eta = progressRatio > 0 ? elapsed / progressRatio - elapsed : 0;

      setScanProgress({
        ...progress,
        startTime,
        eta: Math.max(0, Math.round(eta)),
      });
    });

    try {
      const scanResult = await window.api.photos.scanFolder(includeSubdirectories, maxFileSizeMB);

      // Call onComplete callback if provided
      if (!scanResult.canceled && onComplete) {
        await onComplete();
      }

      return scanResult;
    } finally {
      removeListener();
      setScanProgress(null);
      setScanning(false);
    }
  };

  const abortScan = async () => {
    await window.api.photos.abortScan();
  };

  const importOneDriveFolder = async (folderId: string, onComplete?: () => Promise<void>) => {
    setScanning(true);
    setScanProgress(null);

    const startTime = Date.now();

    const removeListener = window.api.onedrive.onImportProgress((progress) => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progressRatio = progress.total > 0 ? progress.scanned / progress.total : 0;
      const eta = progressRatio > 0 ? elapsed / progressRatio - elapsed : 0;

      setScanProgress({
        currentFile: progress.currentFile,
        processed: progress.imported + progress.duplicates,
        total: progress.total,
        startTime,
        eta: Math.max(0, Math.round(eta)),
      });
    });

    try {
      await window.api.onedrive.importFolder(folderId, includeSubdirectories);
      if (onComplete) await onComplete();
    } finally {
      removeListener();
      setScanProgress(null);
      setScanning(false);
    }
  };

  return {
    scanning,
    scanProgress,
    includeSubdirectories,
    setIncludeSubdirectories,
    scanFolder,
    abortScan,
    importOneDriveFolder,
  };
}
