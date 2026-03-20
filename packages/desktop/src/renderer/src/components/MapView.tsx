/**
 * MapView component - displays photos on an interactive map with clustering
 * Refactored to use extracted hooks for better maintainability
 */

import { useEffect, useRef, useState, useCallback, type MutableRefObject } from 'react';
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
import { LAYOUT } from '../constants/ui';

export type SelectionMode = 'pan' | 'lasso';

// ============================================================================
// Fit-to-content custom MapLibre control
// ============================================================================

/**
 * A MapLibre IControl that adds a single "fit to photos" button to the map.
 * Uses a ref so the click handler always sees the latest photos/selection.
 */
class FitToContentControl {
  private _container: HTMLElement | null = null;
  private _onClickRef: MutableRefObject<() => void>;

  constructor(onClickRef: MutableRefObject<() => void>) {
    this._onClickRef = onClickRef;
  }

  onAdd(): HTMLElement {
    this._container = document.createElement('div');
    this._container.className = 'maplibregl-ctrl maplibregl-ctrl-group';

    const button = document.createElement('button');
    button.type = 'button';
    button.title = 'Fit map to photos (or selection)';
    button.setAttribute('aria-label', 'Fit map to photos');
    // 4-corner expand icon
    button.innerHTML = `<span aria-hidden="true" style="display:flex;align-items:center;justify-content:center">
      <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 6V1h5M12 1h5v5M1 12v5h5M17 12v5h-5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>`;
    button.addEventListener('click', () => this._onClickRef.current());

    this._container.appendChild(button);
    return this._container;
  }

  onRemove(): void {
    this._container?.remove();
    this._container = null;
  }
}

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
  // Glassmorphism settings
  glassBlur?: number;
  glassSurfaceOpacity?: number;
  // Cluster opacity settings
  clusterOpacity?: number;
  unclusteredPointOpacity?: number;
  // Fit-to-content padding — accounts for floating header (top) and timeline (bottom)
  fitPadding?: { top: number; right: number; bottom: number; left: number };
  // When set, the map flies to these bounds (e.g. when activating a saved placemark)
  targetBounds?: { north: number; south: number; east: number; west: number } | null;
}

export function MapView({
  photos,
  onPhotoClick,
  clusteringEnabled,
  clusterRadius,
  clusterMaxZoom,
  transitionDuration,
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
  glassBlur = 12,
  glassSurfaceOpacity = 70,
  clusterOpacity = 0.85,
  unclusteredPointOpacity = 0.9,
  fitPadding,
  targetBounds,
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
    padding,
    fitPadding,
    autoFit,
    showHeatmap,
    selectionMode,
    spiderState,
    selectedIds,
    clusterOpacity,
    unclusteredPointOpacity,
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
    setCurrentZoom,
  });

  // ========== SPIDER ZOOM CLEARING ==========
  // Clear spider when zooming out significantly
  useEffect(() => {
    if (currentZoom < spiderSettings.clearZoom && isSpiderActive) {
      clearSpider(false);
    }
  }, [currentZoom, isSpiderActive, clearSpider, spiderSettings.clearZoom]);

  // ========== TARGET BOUNDS NAVIGATION ==========
  // Fly to bounds when a placemark is activated
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !targetBounds) return;
    const { north, south, east, west } = targetBounds;
    mapRef.current.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      {
        padding: fitPadding ?? { top: padding, right: padding, bottom: padding, left: padding },
        duration: transitionDuration,
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetBounds, mapLoaded]);

  // ========== MAP CONTROLS GLASS STYLE ==========
  // Inject CSS overrides for MapLibre NavigationControl to match the floating header glass style.
  useEffect(() => {
    const isDark = theme === 'dark';
    const bgRgb = isDark ? '30, 41, 59' : '255, 255, 255';
    const opacity = glassSurfaceOpacity / 100;
    const border = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.3)';
    const textColor = isDark ? '#f1f5f9' : '#1e293b';
    const hoverBg = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)';
    const linkColor = isDark ? '#3b82f6' : '#2563eb';

    const inset = `${LAYOUT.PANEL_INSET_PX}px`;

    const css = `
      /* Align map controls with the floating panel inset */
      .maplibregl-ctrl-top-right .maplibregl-ctrl { margin: ${inset} ${inset} 0 0 !important; }
      .maplibregl-ctrl-bottom-right .maplibregl-ctrl { margin: 0 ${inset} ${inset} 0 !important; }

      .maplibregl-ctrl-group {
        background: rgba(${bgRgb}, ${opacity}) !important;
        backdrop-filter: blur(${glassBlur}px) !important;
        -webkit-backdrop-filter: blur(${glassBlur}px) !important;
        border: 1px solid ${border} !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
        overflow: hidden;
      }
      .maplibregl-ctrl-group button {
        background: transparent !important;
        color: ${textColor} !important;
        border-bottom: 1px solid ${border} !important;
        width: 36px !important;
        height: 36px !important;
        transition: background 0.15s ease !important;
      }
      .maplibregl-ctrl-group button:last-child {
        border-bottom: none !important;
      }
      .maplibregl-ctrl-group button:hover {
        background: ${hoverBg} !important;
      }
      .maplibregl-ctrl-group button span {
        filter: ${isDark ? 'invert(1) brightness(2)' : 'none'} !important;
      }

      /* Attribution control (ⓘ button + expanded panel) */
      .maplibregl-ctrl-attrib {
        background: rgba(${bgRgb}, ${opacity}) !important;
        backdrop-filter: blur(${glassBlur}px) !important;
        -webkit-backdrop-filter: blur(${glassBlur}px) !important;
        border: 1px solid ${border} !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
        color: ${textColor} !important;
      }
      .maplibregl-ctrl-attrib a {
        color: ${linkColor} !important;
      }
      .maplibregl-ctrl-attrib-button {
        background-color: transparent !important;
        filter: ${isDark ? 'invert(1) brightness(2)' : 'none'} !important;
        transition: background-color 0.15s ease !important;
      }
      .maplibregl-ctrl-attrib-button:hover {
        background-color: ${hoverBg} !important;
      }
    `;

    const styleId = 'placemark-map-ctrl-glass';
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = css;

    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, [glassBlur, glassSurfaceOpacity, theme]);

  // ========== FIT TO CONTENT ==========
  // A ref holds the fit function so the MapLibre control can always call the latest version.
  const fitToContentRef = useRef<() => void>(() => {});

  useEffect(() => {
    fitToContentRef.current = () => {
      if (!mapRef.current) return;
      // Fit to selection if any; otherwise fit to all displayed photos.
      const photosToFit =
        selectedIds && selectedIds.size > 0 ? photos.filter((p) => selectedIds.has(p.id)) : photos;
      const geo = photosToFit.filter((p) => p.latitude != null && p.longitude != null);
      if (geo.length === 0) return;

      const bounds = new maplibregl.LngLatBounds();
      geo.forEach((p) => bounds.extend([p.longitude!, p.latitude!]));

      const effectivePadding = fitPadding ?? {
        top: padding,
        right: padding,
        bottom: padding,
        left: padding,
      };
      mapRef.current.fitBounds(bounds, {
        padding: effectivePadding,
        duration: transitionDuration,
        maxZoom: tileMaxZoom,
      });
    };
  }, [photos, selectedIds, padding, fitPadding, transitionDuration, tileMaxZoom]);

  // Mount the fit-to-content control once the map is ready (stays mounted for lifetime of map).
  const fitControlRef = useRef<FitToContentControl | null>(null);
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    fitControlRef.current = new FitToContentControl(fitToContentRef);
    mapRef.current.addControl(fitControlRef.current, 'top-right');
    return () => {
      if (fitControlRef.current && mapRef.current) {
        mapRef.current.removeControl(fitControlRef.current);
        fitControlRef.current = null;
      }
    };
  }, [mapLoaded]);

  // ========== ATTRIBUTION LINK INTERCEPTION ==========
  // MapLibre renders <a> tags in the attribution panel. In Electron, clicking
  // them would navigate the renderer window. Instead, open them in the OS browser.
  useEffect(() => {
    const container = mapContainer.current;
    if (!container) return;
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('http')) return;
      e.preventDefault();
      window.api?.system?.openExternal?.(href);
    };
    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, []);

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
          glassBlur={glassBlur}
          glassSurfaceOpacity={glassSurfaceOpacity}
        />
      )}
    </div>
  );
}
