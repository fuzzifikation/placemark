/**
 * useFolderScan - Manages folder scanning state and operations
 */

import { useState } from 'react';

interface ScanProgress {
  currentFile: string;
  processed: number;
  total: number;
}

export function useFolderScan() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [includeSubdirectories, setIncludeSubdirectories] = useState(true);

  const scanFolder = async (onComplete?: () => Promise<void>) => {
    setScanning(true);
    setResult(null);
    setScanProgress(null);

    // Set up progress listener
    const removeListener = window.api.photos.onScanProgress((progress) => {
      setScanProgress(progress);
    });

    try {
      const scanResult = await window.api.photos.scanFolder(includeSubdirectories);
      setResult(scanResult);

      // Call onComplete callback if provided
      if (!scanResult.canceled && onComplete) {
        await onComplete();
      }

      return scanResult;
    } catch (error) {
      console.error('Scan failed:', error);
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
