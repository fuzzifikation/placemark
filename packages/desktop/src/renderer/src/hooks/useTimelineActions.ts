/**
 * useTimelineActions — manages timeline toggle, date range changes, and the
 * "fit to view" shortcut. Extracted from App.tsx.
 */

import { useState, useMemo, useCallback } from 'react';
import type { Photo } from '@placemark/core';
import { filterPhotos, getDateRange } from '@placemark/core';

interface TimelineDeps {
  photoData: {
    allPhotos: Photo[];
    mapPhotos: Photo[];
    mapBounds: { north: number; south: number; east: number; west: number } | null;
    dateRange: { min: number; max: number } | null;
    selectedDateRange: { start: number; end: number } | null;
    filterByDateRange: (start: number, end: number) => void;
    resetDateFilter: () => void;
  };
  placemarks: {
    activePlacemarkId: number | 'thisYear' | 'last3Months' | null;
    setActivePlacemarkId: (id: number | 'thisYear' | 'last3Months' | null) => void;
  };
  showTimeline: boolean;
  setShowTimeline: (v: boolean) => void;
}

export function useTimelineActions(deps: TimelineDeps) {
  const { photoData, placemarks, showTimeline, setShowTimeline } = deps;

  const [lastSelectedDateRange, setLastSelectedDateRange] = useState<{
    start: number;
    end: number;
  } | null>(null);

  // Date range of GPS photos in the current viewport (ignores active date filter).
  const fitToViewRange = useMemo(() => {
    if (!photoData.mapBounds) return null;
    const inBounds = filterPhotos(photoData.allPhotos, { bounds: photoData.mapBounds });
    return getDateRange(inBounds);
  }, [photoData.allPhotos, photoData.mapBounds]);

  const handleTimelineToggle = useCallback(() => {
    const next = !showTimeline;
    setShowTimeline(next);
    if (next) {
      if (lastSelectedDateRange) {
        photoData.filterByDateRange(lastSelectedDateRange.start, lastSelectedDateRange.end);
      }
    } else {
      photoData.resetDateFilter();
    }
  }, [
    showTimeline,
    setShowTimeline,
    lastSelectedDateRange,
    photoData.filterByDateRange,
    photoData.resetDateFilter,
  ]);

  const handleDateRangeChange = useCallback(
    (start: number, end: number) => {
      if (placemarks.activePlacemarkId !== null) {
        placemarks.setActivePlacemarkId(null);
      }
      photoData.filterByDateRange(start, end);
      setLastSelectedDateRange({ start, end });
    },
    [placemarks.activePlacemarkId, placemarks.setActivePlacemarkId, photoData.filterByDateRange]
  );

  const handleTimelineClose = useCallback(() => {
    setShowTimeline(false);
    photoData.resetDateFilter();
  }, [setShowTimeline, photoData.resetDateFilter]);

  const handleFitTimelineToView = useCallback(() => {
    if (!fitToViewRange) return;
    handleDateRangeChange(fitToViewRange.start, fitToViewRange.end);
  }, [fitToViewRange, handleDateRangeChange]);

  return {
    lastSelectedDateRange,
    setLastSelectedDateRange,
    fitToViewRange,
    handleTimelineToggle,
    handleDateRangeChange,
    handleTimelineClose,
    handleFitTimelineToView,
  };
}
