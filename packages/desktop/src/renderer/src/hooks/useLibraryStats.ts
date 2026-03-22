/**
 * useLibraryStats — fetches and optionally polls library statistics via IPC.
 *
 * Extracted from LibraryStatsPanel to keep the component focused on rendering.
 */

import { useState, useEffect, useCallback } from 'react';
import type { LibraryStats, DatabaseStats, ThumbnailStats } from '../types/preload';

interface LibraryStatsResult {
  stats: LibraryStats | null;
  dbStats: DatabaseStats | null;
  thumbStats: ThumbnailStats | null;
  loading: boolean;
  refresh: () => void;
}

export function useLibraryStats(isScanning?: boolean): LibraryStatsResult {
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [dbStats, setDbStats] = useState<DatabaseStats | null>(null);
  const [thumbStats, setThumbStats] = useState<ThumbnailStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [lib, db, thumb] = await Promise.all([
        window.api.photos.getLibraryStats(),
        window.api.photos.getDatabaseStats(),
        window.api.thumbnails.getStats(),
      ]);
      setStats(lib);
      setDbStats(db);
      setThumbStats(thumb);
    } catch {
      // Non-critical display stats — silently degrade
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll every 1.5s during scan; do one final refresh when scan ends
  useEffect(() => {
    if (!isScanning) {
      refresh(); // refresh once when scan completes
      return;
    }
    const interval = setInterval(refresh, 1500);
    return () => clearInterval(interval);
  }, [isScanning, refresh]);

  return { stats, dbStats, thumbStats, loading, refresh };
}
