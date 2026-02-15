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
  const [result, setResult] = useState<any>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [includeSubdirectories, setIncludeSubdirectories] = useState(true);

  const scanFolder = async (onComplete?: () => Promise<void>, maxFileSizeMB: number = 150) => {
    setScanning(true);
    setResult(null);
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
      setResult(scanResult);

      // Call onComplete callback if provided
      if (!scanResult.canceled && onComplete) {
        await onComplete();
      }

      return scanResult;
    } catch (error) {
      setResult({ error: String(error) });
      throw error;
    } finally {
      removeListener();
      setScanProgress(null);
      setScanning(false);
    }
  };

  return {
    scanning,
    result,
    scanProgress,
    includeSubdirectories,
    setIncludeSubdirectories,
    scanFolder,
  };
}
