import { useState, useCallback, useEffect, RefObject } from 'react';
import type { Map } from 'maplibre-gl';
import type { Photo } from '@placemark/core';
import { isPointInPolygon, getPolygonBounds, Point } from '../../utils/geometry';
import type { SelectionMode } from '../MapView';

interface UseLassoSelectionProps {
  map: RefObject<Map | null>;
  photos: Photo[];
  selectionMode: SelectionMode;
  onSelectionChange?: (ids: number[], mode: 'set' | 'add' | 'remove' | 'toggle') => void;
}

export function useLassoSelection({
  map,
  photos,
  selectionMode,
  onSelectionChange,
}: UseLassoSelectionProps) {
  const [isLassoActive, setIsLassoActive] = useState(false);
  const [lassoPoints, setLassoPoints] = useState<Point[]>([]);

  // Cancel lasso on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isLassoActive) {
        setIsLassoActive(false);
        setLassoPoints([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLassoActive]);

  const startLasso = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (selectionMode !== 'lasso') return;

      const point =
        'touches' in e
          ? getTouchPoint(e, map.current?.getCanvas())
          : {
              x: (e as React.MouseEvent).nativeEvent.offsetX,
              y: (e as React.MouseEvent).nativeEvent.offsetY,
            };

      if (!point) return;

      setIsLassoActive(true);
      setLassoPoints([point]);
    },
    [selectionMode, map]
  );

  const updateLasso = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isLassoActive) return;

      const point =
        'touches' in e
          ? getTouchPoint(e, map.current?.getCanvas())
          : {
              x: (e as React.MouseEvent).nativeEvent.offsetX,
              y: (e as React.MouseEvent).nativeEvent.offsetY,
            };

      if (!point) return;

      setLassoPoints((prev) => [...prev, point]);
    },
    [isLassoActive, map]
  );

  const endLasso = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isLassoActive || !onSelectionChange || !map.current) return;
      setIsLassoActive(false);

      // Performance optimization: Pre-filter using bounds
      const bounds = getPolygonBounds(lassoPoints);
      if (!bounds) {
        setLassoPoints([]);
        return;
      }

      // Convert Screen Pixel Bounds to Geo Coordinates (Lat/Lon)
      // unproject({x, y}) returns LngLat
      const p1 = map.current.unproject([bounds.minX, bounds.minY]); // Top Left (in pixels) -> NW (usually)
      const p2 = map.current.unproject([bounds.maxX, bounds.maxY]); // Bottom Right

      // Normalize Lat/Lon bounds (handling dateline or rotation issues simply)
      // unproject returns LngLat: {lng, lat}
      const minLng = Math.min(p1.lng, p2.lng);
      const maxLng = Math.max(p1.lng, p2.lng);
      const minLat = Math.min(p1.lat, p2.lat);
      const maxLat = Math.max(p1.lat, p2.lat);

      const selectedInLasso: number[] = [];
      const project = map.current.project.bind(map.current);

      // 1. Filter candidates by Geo Bounds (Fast)
      // 2. Project candidates to screen (Slower)
      // 3. Point-in-polygon check (Math)

      photos.forEach((p) => {
        if (p.latitude && p.longitude) {
          // Fast Geo Checks
          if (
            p.longitude >= minLng &&
            p.longitude <= maxLng &&
            p.latitude >= minLat &&
            p.latitude <= maxLat
          ) {
            // Precise Check
            const screenPt = project([p.longitude, p.latitude]);
            if (isPointInPolygon(screenPt, lassoPoints)) {
              selectedInLasso.push(p.id);
            }
          }
        }
      });

      const shiftKey = 'shiftKey' in e ? e.shiftKey : false;
      const altKey = 'altKey' in e ? e.altKey : false;

      const mode = shiftKey ? 'add' : altKey ? 'remove' : 'set';
      onSelectionChange(selectedInLasso, mode);
      setLassoPoints([]);
    },
    [isLassoActive, onSelectionChange, photos, lassoPoints, map]
  );

  return {
    isLassoActive,
    lassoPoints,
    startLasso,
    updateLasso,
    endLasso,
  };
}

// Helper for extracting relative coordinates from Touch events
function getTouchPoint(e: React.TouchEvent, canvas?: HTMLCanvasElement): Point | null {
  if (!canvas || e.touches.length === 0) return null;
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  return {
    x: touch.clientX - rect.left,
    y: touch.clientY - rect.top,
  };
}
