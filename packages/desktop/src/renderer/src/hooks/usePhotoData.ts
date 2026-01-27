/**
 * usePhotoData - Manages photo data loading and filtering
 */

import { useState, useEffect } from 'react';
import type { Photo } from '@placemark/core';

export function usePhotoData() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [showMap, setShowMap] = useState(false);
  const [dateRange, setDateRange] = useState<{ min: number; max: number } | null>(null);
  const [selectedDateRange, setSelectedDateRange] = useState<{ start: number; end: number } | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const photosWithLocation = await window.api.photos.getWithLocation();
      setAllPhotos(photosWithLocation);
      setPhotos(photosWithLocation);

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

  const filterByDateRange = async (start: number, end: number) => {
    setSelectedDateRange({ start, end });
    try {
      const filtered = await window.api.photos.getWithLocationInDateRange(start, end);
      setPhotos(filtered);
    } catch (error) {
      console.error('Failed to filter photos by date:', error);
    }
  };

  const resetDateFilter = () => {
    if (dateRange) {
      setSelectedDateRange({ start: dateRange.min, end: dateRange.max });
      setPhotos(allPhotos);
    }
  };

  // Load photos on mount
  useEffect(() => {
    loadPhotos();
  }, []);

  return {
    photos,
    allPhotos,
    showMap,
    dateRange,
    selectedDateRange,
    loading,
    loadPhotos,
    filterByDateRange,
    resetDateFilter,
  };
}
