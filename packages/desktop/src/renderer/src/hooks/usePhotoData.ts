/**
 * usePhotoData - Manages photo data loading and filtering
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Photo, BoundingBox } from '@placemark/core';
import { filterPhotos } from '@placemark/core';

export function usePhotoData() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  // Use a ref for the full dataset to avoid state duplication and extra renders
  const allPhotosRef = useRef<Photo[]>([]);

  const [showMap, setShowMap] = useState(false);
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

  /**
   * Photos filtered only by date range - used for map display.
   * MapLibre handles viewport culling efficiently, so we don't filter by bounds.
   */
  const mapPhotos = useMemo(() => {
    if (!selectedDateRange) return allPhotosRef.current;
    return filterPhotos(allPhotosRef.current, {
      dateRange: { start: selectedDateRange.start, end: selectedDateRange.end },
    });
  }, [selectedDateRange, photos]); // photos dep ensures refresh after load

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
        setShowMap(true);

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
   * Centralized filter logic using core package
   */
  const applyFilters = useCallback(
    (
      targetPhotos: Photo[],
      range: { start: number; end: number } | null,
      bounds: BoundingBox | null
    ) => {
      const filtered = filterPhotos(targetPhotos, {
        dateRange: range ? { start: range.start, end: range.end } : undefined,
        bounds: bounds || undefined,
      });
      setPhotos(filtered);
    },
    []
  );

  /**
   * Client-side filtering to avoid IPC overhead and data duplication
   */
  const filterByDateRange = useCallback(
    (start: number, end: number, ignoreBounds = false) => {
      const newRange = { start, end };
      setSelectedDateRange(newRange);
      // We set the source BEFORE applying filters so the consumer can react
      setFilterSource('date');
      // If ignoring bounds (e.g. for auto-zoom), pass null instead of current bounds
      applyFilters(allPhotosRef.current, newRange, ignoreBounds ? null : mapBounds);
    },
    [applyFilters, mapBounds]
  );

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

  const resetDateFilter = () => {
    setSelectedDateRange(null);
    setFilterSource('date');
    applyFilters(allPhotosRef.current, null, mapBounds);
  };

  // Load photos on mount
  useEffect(() => {
    loadPhotos();
  }, []);

  return {
    photos,
    mapPhotos, // Date-filtered photos for map display (no bounds filtering)
    allPhotos: allPhotosRef.current, // Expose for checking length/empty state
    visibleInBoundsCount, // Count of photos in current map view
    showMap,
    dateRange,
    selectedDateRange,
    loading,
    loadPhotos,
    filterByDateRange,
    trackMapBounds, // Renamed: just tracks bounds, doesn't filter map
    resetDateFilter,
    selection,
    updateSelection,
    clearSelection,
    filterSource,
    isInitialized,
  };
}
