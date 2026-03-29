/**
 * useFolderScan - Manages folder scanning state and operations
 */

import { useState, useRef } from 'react';

interface ScanProgress {
  currentFile: string;
  processed: number;
  total: number;
  startTime?: number;
  eta?: number; // estimated time remaining in seconds
}

function calcEta(startTime: number, processed: number, total: number): number {
  if (total <= 0 || processed <= 0) return 0;
  const elapsed = (Date.now() - startTime) / 1000;
  return Math.max(0, Math.round(elapsed / (processed / total) - elapsed));
}

export function useFolderScan() {
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [includeSubdirectories, setIncludeSubdirectories] = useState(true);
  const activeSource = useRef<'local' | 'onedrive' | null>(null);

  const scanFolder = async (onComplete?: () => Promise<void>, maxFileSizeMB: number = 150) => {
    activeSource.current = 'local';
    setScanning(true);
    setScanProgress(null);

    const startTime = Date.now();

    // Set up progress listener
    const removeListener = window.api.photos.onScanProgress((progress) => {
      setScanProgress({
        ...progress,
        startTime,
        eta: calcEta(startTime, progress.processed, progress.total),
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
      activeSource.current = null;
      removeListener();
      setScanProgress(null);
      setScanning(false);
    }
  };

  const abortScan = async () => {
    if (activeSource.current === 'onedrive') {
      await window.api.onedrive.abortImport();
    } else {
      await window.api.photos.abortScan();
    }
  };

  const importOneDriveFolder = async (folderId: string, onComplete?: () => Promise<void>) => {
    activeSource.current = 'onedrive';
    setScanning(true);
    setScanProgress(null);

    const startTime = Date.now();

    const removeListener = window.api.onedrive.onImportProgress((progress) => {
      const processed = progress.imported + progress.duplicates;
      setScanProgress({
        currentFile: progress.currentFile,
        processed,
        total: progress.total,
        startTime,
        eta: calcEta(startTime, processed, progress.total),
      });
    });

    try {
      await window.api.onedrive.importFolder(folderId, includeSubdirectories);
      if (onComplete) await onComplete();
    } finally {
      activeSource.current = null;
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
