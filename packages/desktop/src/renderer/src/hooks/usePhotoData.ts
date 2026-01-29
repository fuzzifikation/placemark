/**
 * usePhotoData - Manages photo data loading and filtering
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Photo } from '@placemark/core';

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
    }
  };

  /**
   * Centralized filter logic to avoid duplication
   */
  const applyFilters = useCallback(
    (
      targetPhotos: Photo[],
      range: { start: number; end: number } | null,
      bounds: { north: number; south: number; east: number; west: number } | null
    ) => {
      let filtered = targetPhotos;

      // 1. Date Filter
      if (range) {
        filtered = filtered.filter((p) => {
          if (p.timestamp === null || p.timestamp === undefined) return false;
          return p.timestamp >= range.start && p.timestamp <= range.end;
        });
      }

      // 2. Map Bounds Filter
      if (bounds) {
        const crossesIdl = bounds.west > bounds.east;

        filtered = filtered.filter((p) => {
          if (p.latitude === null || p.longitude === null) return false;

          const latOk = p.latitude <= bounds.north && p.latitude >= bounds.south;
          let lonOk = false;

          if (crossesIdl) {
            // It's in the box if it's > West OR < East
            lonOk = p.longitude >= bounds.west || p.longitude <= bounds.east;
          } else {
            // Standard box
            lonOk = p.longitude >= bounds.west && p.longitude <= bounds.east;
          }

          return latOk && lonOk;
        });
      }

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

  const filterByMapBounds = useCallback(
    (bounds: { north: number; south: number; east: number; west: number }) => {
      setMapBounds(bounds);
      setFilterSource('map');
      applyFilters(allPhotosRef.current, selectedDateRange, bounds);
    },
    [applyFilters, selectedDateRange]
  );

  const resetDateFilter = () => {
    if (dateRange) {
      setSelectedDateRange({ start: dateRange.min, end: dateRange.max });
      setPhotos(allPhotosRef.current);
    }
  };

  // Load photos on mount
  useEffect(() => {
    loadPhotos();
  }, []);

  return {
    photos,
    allPhotos: allPhotosRef.current, // Expose for checking length/empty state
    showMap,
    dateRange,
    selectedDateRange,
    loading,
    loadPhotos,
    filterByDateRange,
    filterByMapBounds, // Export this
    resetDateFilter,
    selection,
    updateSelection,
    clearSelection,
    filterSource,
  };
}
