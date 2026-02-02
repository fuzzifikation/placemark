/**
 * MapView component - displays photos on an interactive map with clustering
 * Refactored to use extracted hooks for better maintainability
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Photo } from '@placemark/core';
import type { Theme } from '../theme';
import { PhotoHoverPreview } from './Map/PhotoHoverPreview';
import { useLassoSelection } from './Map/useLassoSelection';
import { useMapHover } from './Map/useMapHover';
import { useSpider } from './Map/useSpider';
import { useMapInitialization } from './Map/useMapInitialization';
import { useMapLayerManagement } from './Map/useMapLayerManagement';
import { useMapEventHandlers } from './Map/useMapEventHandlers';
import { getDefaultSpiderSettings } from './Settings';

export type SelectionMode = 'pan' | 'lasso';

// Spider configuration from settings
export interface SpiderSettings {
  overlapTolerance: number; // pixels - visual distance for overlap detection
  radius: number; // pixels - visual radius of spider circle on screen
  animationDuration: number; // ms
  triggerZoom: number; // zoom level threshold
  collapseMargin: number; // pixels - how far mouse can leave spider before it closes
  clearZoom: number; // auto-clear spider when zooming below this level
}

interface MapViewProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  onViewChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  clusteringEnabled: boolean;
  clusterRadius: number;
  clusterMaxZoom: number;
  transitionDuration: number;
  maxZoom: number;
  tileMaxZoom: number;
  padding: number;
  autoFit?: boolean;
  theme?: Theme;
  showHeatmap?: boolean;
  // Selection Props
  selectedIds?: Set<number>;
  onSelectionChange?: (ids: number[], mode: 'set' | 'add' | 'remove' | 'toggle') => void;
  selectionMode?: SelectionMode;
  // Spider settings
  spiderSettings?: SpiderSettings;
}

export function MapView({
  photos,
  onPhotoClick,
  clusteringEnabled,
  clusterRadius,
  clusterMaxZoom,
  transitionDuration,
  maxZoom,
  tileMaxZoom,
  padding,
  autoFit = true,
  theme = 'light',
  showHeatmap = false,
  onViewChange,
  // Selection Props
  selectedIds,
  onSelectionChange,
  selectionMode = 'pan',
  spiderSettings = getDefaultSpiderSettings(),
}: MapViewProps) {
  // ========== STATE ==========
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(0);
  const hoveredFeatureIdRef = useRef<string | null>(null);

  // ========== UTILITY FUNCTIONS ==========
  // Converter function to convert pixel radius to degrees at a given center point
  // This uses the map's projection to calculate the actual degree offset for a pixel distance
  const pixelToDegreesConverter = useCallback((center: [number, number], pixelRadius: number) => {
    if (!mapRef.current) {
      // Fallback: approximate 1 pixel ≈ 0.00001 degrees at high zoom
      return { lngOffset: pixelRadius * 0.00001, latOffset: pixelRadius * 0.00001 };
    }

    // Project center to screen coordinates
    const centerScreen = mapRef.current.project(center);

    // Calculate a point that's pixelRadius away in screen space
    // We use separate calculations for lng and lat because map projections aren't uniform
    const rightPoint = mapRef.current.unproject([centerScreen.x + pixelRadius, centerScreen.y]);
    const topPoint = mapRef.current.unproject([centerScreen.x, centerScreen.y - pixelRadius]);

    return {
      lngOffset: rightPoint.lng - center[0],
      latOffset: topPoint.lat - center[1],
    };
  }, []);

  /**
   * Find photos that visually overlap with a target photo in screen pixels.
   * This ensures spider triggers based on visual overlap, not geographic distance.
   * @param targetPhoto The photo to check for overlaps
   * @param tolerancePixels How close (in screen pixels) photos must be to count as overlapping
   */
  const findOverlappingPhotosInPixels = useCallback(
    (targetPhoto: Photo, tolerancePixels: number): Photo[] => {
      if (!mapRef.current || !targetPhoto.latitude || !targetPhoto.longitude) return [];

      const targetPoint = mapRef.current.project([targetPhoto.longitude, targetPhoto.latitude]);

      return photos.filter((p) => {
        if (!p.latitude || !p.longitude) return false;
        if (p.id === targetPhoto.id) return true; // Include self

        const point = mapRef.current!.project([p.longitude, p.latitude]);
        const dx = point.x - targetPoint.x;
        const dy = point.y - targetPoint.y;
        const distancePixels = Math.sqrt(dx * dx + dy * dy);

        return distancePixels < tolerancePixels;
      });
    },
    [photos]
  );

  // ========== CUSTOM HOOKS ==========
  // Spider hook for handling overlapping photos (works in all modes)
  const { spiderState, spiderAtPoint, clearSpider, isSpiderActive } = useSpider({
    photos,
    onPhotoClick,
    config: {
      overlapTolerance: spiderSettings.overlapTolerance,
      radius: spiderSettings.radius,
      animationDuration: spiderSettings.animationDuration,
    },
    pixelToDegreesConverter,
    findOverlappingPhotosInPixels,
  });

  // Hover preview state (managed by hook)
  const { hoverState, hoverHandlersRef, cleanup: cleanupHover } = useMapHover();

  // Lasso Selection Hook
  const { isLassoActive, lassoPoints, startLasso, updateLasso, endLasso } = useLassoSelection({
    map: mapRef,
    photos,
    selectionMode,
    onSelectionChange,
  });

  // ========== MAP INITIALIZATION ==========
  useMapInitialization({
    mapContainer,
    mapRef,
    theme,
    tileMaxZoom,
    setMapLoaded,
    setCurrentZoom,
    onViewChange,
    cleanupHover,
  });

  // ========== MAP LAYER MANAGEMENT ==========
  useMapLayerManagement({
    mapRef,
    mapLoaded,
    photos,
    clusteringEnabled,
    clusterRadius,
    clusterMaxZoom,
    transitionDuration,
    maxZoom,
    padding,
    autoFit,
    showHeatmap,
    selectionMode,
    spiderState,
    selectedIds,
  });

  // ========== MAP EVENT HANDLERS ==========
  useMapEventHandlers({
    mapRef,
    mapLoaded,
    onPhotoClick,
    onViewChange,
    hoverHandlersRef,
    hoveredFeatureIdRef,
    spiderAtPoint,
    clearSpider,
    isSpiderActive,
    spiderState,
    findOverlappingPhotosInPixels,
    spiderSettings,
    tileMaxZoom,
    photos,
    setCurrentZoom,
  });

  // ========== SPIDER ZOOM CLEARING ==========
  // Clear spider when zooming out significantly
  useEffect(() => {
    if (currentZoom < spiderSettings.clearZoom && isSpiderActive) {
      clearSpider(false);
    }
  }, [currentZoom, isSpiderActive, clearSpider, spiderSettings.clearZoom]);

  // ========== RENDER ==========
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
        }}
      />
      {/* Lasso Layer */}
      {selectionMode === 'lasso' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 10,
            cursor: 'crosshair',
            touchAction: 'none', // Critical for preventing scrolling while drawing
          }}
          onMouseDown={startLasso}
          onMouseMove={updateLasso}
          onMouseUp={endLasso}
          onTouchStart={startLasso}
          onTouchMove={updateLasso}
          onTouchEnd={endLasso}
        />
      )}
      {/* Lasso Visuals */}
      {isLassoActive && lassoPoints.length > 0 && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 11,
          }}
        >
          <polygon
            points={lassoPoints.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="rgba(74, 158, 255, 0.2)"
            stroke="rgba(74, 158, 255, 0.8)"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        </svg>
      )}

      {/* Hover Tooltip */}
      {hoverState.photo && hoverState.position && (
        <PhotoHoverPreview
          photo={hoverState.photo}
          position={hoverState.position}
          thumbnailUrl={hoverState.thumbnailUrl}
          loading={hoverState.loading}
          theme={theme}
        />
      )}
    </div>
  );
}
