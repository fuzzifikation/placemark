/**
 * usePlacemarkActions — handles placemark activation (smart presets and
 * user-saved placemarks), map-view coordination, and bounds targeting.
 * Extracted from App.tsx.
 */

import { useState, useRef, useCallback } from 'react';
import type { Placemark } from '@placemark/core';

interface PlacemarkActionDeps {
  photoData: {
    dateRange: { min: number; max: number } | null;
    filterByDateRange: (start: number, end: number) => void;
    trackMapBounds: (bounds: { north: number; south: number; east: number; west: number }) => void;
  };
  placemarks: {
    placemarks: Placemark[];
    activePlacemarkId: number | 'thisYear' | 'last3Months' | null;
    setActivePlacemarkId: (id: number | 'thisYear' | 'last3Months' | null) => void;
  };
  setShowTimeline: (v: boolean) => void;
  setLastSelectedDateRange: (r: { start: number; end: number }) => void;
}

export function usePlacemarkActions(deps: PlacemarkActionDeps) {
  const { photoData, placemarks, setShowTimeline, setLastSelectedDateRange } = deps;

  const suppressNextViewChangeRef = useRef(false);
  const [targetMapBounds, setTargetMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
  } | null>(null);

  const handleViewChange = useCallback(
    (bounds: { north: number; south: number; east: number; west: number }) => {
      if (suppressNextViewChangeRef.current) {
        suppressNextViewChangeRef.current = false;
      } else if (placemarks.activePlacemarkId !== null) {
        placemarks.setActivePlacemarkId(null);
      }
      photoData.trackMapBounds(bounds);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placemarks.activePlacemarkId]
  );

  const handleActivatePlacemark = useCallback(
    (id: number | 'thisYear' | 'last3Months' | null) => {
      placemarks.setActivePlacemarkId(id);

      if (id === null) {
        setTargetMapBounds(null);
        return;
      }

      if (id === 'thisYear') {
        const now = new Date();
        const rangeMin = photoData.dateRange?.min;
        const rangeMax = photoData.dateRange?.max;
        const start = Math.max(new Date(now.getFullYear(), 0, 1).getTime(), rangeMin ?? 0);
        const end = Math.min(now.getTime(), rangeMax ?? now.getTime());
        photoData.filterByDateRange(start, end);
        setLastSelectedDateRange({ start, end });
        setShowTimeline(true);
        setTargetMapBounds(null);
        return;
      }

      if (id === 'last3Months') {
        const now = Date.now();
        const rangeMin = photoData.dateRange?.min;
        const rangeMax = photoData.dateRange?.max;
        const start = Math.max(now - 90 * 24 * 60 * 60 * 1000, rangeMin ?? 0);
        const end = Math.min(now, rangeMax ?? now);
        photoData.filterByDateRange(start, end);
        setLastSelectedDateRange({ start, end });
        setShowTimeline(true);
        setTargetMapBounds(null);
        return;
      }

      // User-saved placemark
      const p = placemarks.placemarks.find((x) => x.id === id);
      if (!p) return;

      if (p.bounds) {
        suppressNextViewChangeRef.current = true;
        setTargetMapBounds({ ...p.bounds });
      } else {
        setTargetMapBounds(null);
      }

      if (p.dateStart || p.dateEnd) {
        const start = p.dateStart
          ? new Date(p.dateStart).getTime()
          : (photoData.dateRange?.min ?? Date.now());
        const end = p.dateEnd
          ? new Date(p.dateEnd).getTime()
          : (photoData.dateRange?.max ?? Date.now());
        photoData.filterByDateRange(start, end);
        setLastSelectedDateRange({ start, end });
        setShowTimeline(true);
      }
    },
    [
      photoData.dateRange,
      photoData.filterByDateRange,
      placemarks.placemarks,
      placemarks.setActivePlacemarkId,
      setShowTimeline,
      setLastSelectedDateRange,
    ]
  );

  return { targetMapBounds, handleViewChange, handleActivatePlacemark };
}
