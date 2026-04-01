/**
 * usePhotoData - Manages photo data loading and filtering
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Photo } from '@placemark/core';
import { filterPhotos } from '@placemark/core';

export function usePhotoData() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  // Use a ref for the full dataset to avoid state duplication and extra renders
  const allPhotosRef = useRef<Photo[]>([]);

  const [dateRange, setDateRange] = useState<{ min: number; max: number } | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: number; end: number } | null>(
    null
  );
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [filterSource, setFilterSource] = useState<'date' | 'map' | 'scan' | 'init'>('init');
  const [isInitialized, setIsInitialized] = useState(false);

  const [activeFilters, setActiveFilters] = useState<{
    mimeTypes: Set<string>;
    cameras: Set<string>;
  }>({ mimeTypes: new Set(), cameras: new Set() });

  const toggleMimeTypeFilter = useCallback((mimeType: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev.mimeTypes);
      next.has(mimeType) ? next.delete(mimeType) : next.add(mimeType);
      return { ...prev, mimeTypes: next };
    });
  }, []);

  const toggleCameraFilter = useCallback((cameraKey: string) => {
    setActiveFilters((prev) => {
      const next = new Set(prev.cameras);
      next.has(cameraKey) ? next.delete(cameraKey) : next.add(cameraKey);
      return { ...prev, cameras: next };
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setActiveFilters({ mimeTypes: new Set(), cameras: new Set() });
  }, []);

  /**
   * Photos filtered by date range and active format/camera filters — used for map display.
   * MapLibre handles viewport culling efficiently, so we don't filter by bounds.
   */
  const mapPhotos = useMemo(() => {
    let filtered = allPhotosRef.current;
    if (selectedDateRange) {
      filtered = filterPhotos(filtered, {
        dateRange: { start: selectedDateRange.start, end: selectedDateRange.end },
      });
    }
    if (activeFilters.mimeTypes.size > 0) {
      filtered = filtered.filter((p) => activeFilters.mimeTypes.has(p.mimeType));
    }
    if (activeFilters.cameras.size > 0) {
      filtered = filtered.filter((p) =>
        activeFilters.cameras.has(`${p.cameraMake ?? 'Unknown'}|${p.cameraModel ?? 'Unknown'}`)
      );
    }
    return filtered;
  }, [selectedDateRange, photos, activeFilters]); // photos dep ensures refresh after load

  /**
   * Count of photos visible in current map bounds (for UI display)
   */
  const visibleInBoundsCount = useMemo(() => {
    if (!mapBounds) return mapPhotos.length;
    return filterPhotos(mapPhotos, { bounds: mapBounds }).length;
  }, [mapPhotos, mapBounds]);

  const updateSelection = useCallback(
    (ids: number[], mode: 'set' | 'add' | 'remove' | 'toggle') => {
      setSelection((prev) => {
        if (mode === 'set') return new Set(ids);

        const next = new Set(prev);
        if (mode === 'add') {
          ids.forEach((id) => next.add(id));
        } else if (mode === 'remove') {
          ids.forEach((id) => next.delete(id));
        } else if (mode === 'toggle') {
          ids.forEach((id) => {
            if (next.has(id)) next.delete(id);
            else next.add(id);
          });
        }
        return next;
      });
    },
    []
  );

  const clearSelection = useCallback(() => setSelection(new Set()), []);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const photosWithLocation = await window.api.photos.getWithLocation();
      // Store full dataset in ref
      allPhotosRef.current = photosWithLocation;
      setPhotos(photosWithLocation);
      setFilterSource('scan');

      if (photosWithLocation.length > 0) {
        // Load date range
        const range = await window.api.photos.getDateRange();
        if (range.minDate && range.maxDate) {
          setDateRange({ min: range.minDate, max: range.maxDate });
          setSelectedDateRange({ start: range.minDate, end: range.maxDate });
        }
      }
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  };

  /**
   * Client-side filtering to avoid IPC overhead and data duplication
   */
  const filterByDateRange = useCallback((start: number, end: number) => {
    setSelectedDateRange({ start, end });
    setFilterSource('date');
  }, []);

  /**
   * Track map bounds for UI display (doesn't filter map photos)
   */
  const trackMapBounds = useCallback(
    (bounds: { north: number; south: number; east: number; west: number }) => {
      setMapBounds(bounds);
      setFilterSource('map');
    },
    []
  );

  const resetDateFilter = useCallback(() => {
    setSelectedDateRange(null);
    setFilterSource('date');
  }, []);

  // Load photos on mount
  useEffect(() => {
    loadPhotos();
  }, []);

  return {
    mapPhotos, // Date/format/camera-filtered photos for map display (no bounds filtering)
    allPhotos: allPhotosRef.current, // Expose for checking length/empty state
    visibleInBoundsCount, // Count of photos in current map view
    mapBounds,
    dateRange,
    selectedDateRange,
    loading,
    loadPhotos,
    filterByDateRange,
    trackMapBounds, // Renamed: just tracks bounds, doesn't filter map
    resetDateFilter,
    activeFilters,
    toggleMimeTypeFilter,
    toggleCameraFilter,
    clearAllFilters,
    selection,
    updateSelection,
    clearSelection,
    filterSource,
    isInitialized,
  };
}
