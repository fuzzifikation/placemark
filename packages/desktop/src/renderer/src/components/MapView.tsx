/**
 * MapView component - displays photos on an interactive map with clustering
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Photo } from '@placemark/core';
import type * as GeoJSON from 'geojson';
import type { Theme } from '../theme';
import { PhotoHoverPreview } from './Map/PhotoHoverPreview';
import { addHeatmapLayer, addClusterLayers } from './Map/mapLayers';
import { useLassoSelection } from './Map/useLassoSelection';
import { useMapHover } from './Map/useMapHover';
import { useSpider, createSpiderLegs, applySpiderOffset } from './Map/useSpider';

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

const DEFAULT_SPIDER_SETTINGS: SpiderSettings = {
  overlapTolerance: 20, // pixels
  radius: 60, // pixels
  animationDuration: 300,
  triggerZoom: 17,
  collapseMargin: 30, // pixels
  clearZoom: 15,
};

interface MapViewProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  onViewChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  clusteringEnabled?: boolean;
  clusterRadius?: number;
  clusterMaxZoom?: number;
  transitionDuration?: number;
  maxZoom?: number;
  tileMaxZoom?: number;
  padding?: number;
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
  clusteringEnabled = true,
  clusterRadius = 30,
  clusterMaxZoom = 16,
  transitionDuration = 200,
  maxZoom = 15,
  tileMaxZoom = 18,
  padding = 50,
  autoFit = true,
  theme = 'light',
  showHeatmap = false,
  onViewChange,
  // Selection Props
  selectedIds,
  onSelectionChange,
  selectionMode = 'pan',
  spiderSettings = DEFAULT_SPIDER_SETTINGS,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(0);
  const hasInitialFit = useRef(false);
  const hoveredFeatureIdRef = useRef<string | null>(null);

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

  // Spider hook for handling overlapping photos (works in all modes)
  const { spiderState, spiderAtPoint, clearSpider, handleSpiderPointClick, isSpiderActive } =
    useSpider({
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

  // Refs for callbacks to avoid stale closures in map event listeners
  const onViewChangeRef = useRef(onViewChange);
  const onPhotoClickRef = useRef(onPhotoClick);
  const spiderAtPointRef = useRef(spiderAtPoint);
  const clearSpiderRef = useRef(clearSpider);
  const handleSpiderPointClickRef = useRef(handleSpiderPointClick);
  const isSpiderActiveRef = useRef(isSpiderActive);
  const spiderStateRef = useRef(spiderState);
  const photosRef = useRef(photos);
  const spiderSettingsRef = useRef(spiderSettings);
  const tileMaxZoomRef = useRef(tileMaxZoom);

  useEffect(() => {
    onViewChangeRef.current = onViewChange;
    onPhotoClickRef.current = onPhotoClick;
    spiderAtPointRef.current = spiderAtPoint;
    clearSpiderRef.current = clearSpider;
    handleSpiderPointClickRef.current = handleSpiderPointClick;
    isSpiderActiveRef.current = isSpiderActive;
    spiderStateRef.current = spiderState;
    photosRef.current = photos;
    spiderSettingsRef.current = spiderSettings;
    tileMaxZoomRef.current = tileMaxZoom;
  }, [
    onViewChange,
    onPhotoClick,
    spiderAtPoint,
    clearSpider,
    handleSpiderPointClick,
    isSpiderActive,
    spiderState,
    photos,
    spiderSettings,
    tileMaxZoom,
  ]);

  // Ref for the pixel-based overlap function
  const findOverlappingPhotosInPixelsRef = useRef(findOverlappingPhotosInPixels);
  useEffect(() => {
    findOverlappingPhotosInPixelsRef.current = findOverlappingPhotosInPixels;
  }, [findOverlappingPhotosInPixels]);

  // Lasso Hook
  const { isLassoActive, lassoPoints, startLasso, updateLasso, endLasso } = useLassoSelection({
    map: mapRef,
    photos,
    selectionMode,
    onSelectionChange,
  });

  // Sync selection state to map features
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    if (mapRef.current.getSource('photos')) {
      try {
        mapRef.current.removeFeatureState({ source: 'photos' });
        if (selectedIds) {
          selectedIds.forEach((id) => {
            mapRef.current?.setFeatureState({ source: 'photos', id }, { selected: true });
          });
        }
      } catch (err) {
        console.warn('Failed to set feature state', err);
      }
    }
  }, [selectedIds, mapLoaded, photos]); // Trigger when source data likely changed

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    // Reset map loaded state when reinitializing
    setMapLoaded(false);

    // Use different tile sources for light and dark themes
    const isDark = theme === 'dark';
    const tileUrl = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = isDark
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: [
              tileUrl.replace('{s}', 'a'),
              tileUrl.replace('{s}', 'b'),
              tileUrl.replace('{s}', 'c'),
            ],
            tileSize: 256,
            attribution,
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19, // Tile source max (tiles exist up to 19)
          },
        ],
      },
      center: [0, 0],
      zoom: 2,
      maxZoom: tileMaxZoom, // User-configurable max zoom (default 18 to avoid white screen)
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    mapRef.current.on('moveend', () => {
      if (!mapRef.current) return;
      const bounds = mapRef.current.getBounds();
      const zoom = mapRef.current.getZoom();
      setCurrentZoom(zoom);

      if (onViewChangeRef.current) {
        onViewChangeRef.current({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
      }
    });

    mapRef.current.on('load', () => {
      setMapLoaded(true);
      if (mapRef.current) {
        setCurrentZoom(mapRef.current.getZoom());

        // Initial bounds report
        const bounds = mapRef.current.getBounds();
        if (onViewChangeRef.current) {
          onViewChangeRef.current({
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
          });
        }
      }
    });

    mapRef.current.on('zoom', () => {
      if (mapRef.current) {
        setCurrentZoom(mapRef.current.getZoom());
      }
    });

    // Click handler for clusters - zoom in to expand, or spider at max zoom
    mapRef.current.on('click', 'clusters', async (e: MapLayerMouseEvent) => {
      if (!mapRef.current) return;
      const features = mapRef.current.queryRenderedFeatures(e.point, {
        layers: ['clusters'],
      });
      if (features.length === 0) return;

      const clusterId = features[0].properties.cluster_id;
      const source = mapRef.current.getSource('photos') as maplibregl.GeoJSONSource;
      const clusterCenter = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
      const currentMapZoom = mapRef.current.getZoom();
      const triggerZoom = spiderSettingsRef.current.triggerZoom;
      const maxTileZoom = tileMaxZoomRef.current;

      try {
        // Get the optimal zoom level to expand this cluster
        const expansionZoom = await source.getClusterExpansionZoom(clusterId);

        // If we're at or near the spider trigger zoom and can't expand further, spider out
        if (currentMapZoom >= triggerZoom && expansionZoom > maxTileZoom) {
          // Get the photos in this cluster and use the first one to trigger spider
          const leaves = await source.getClusterLeaves(clusterId, 100, 0);
          if (leaves.length > 0) {
            const firstLeaf = leaves[0];
            const props = firstLeaf.properties as Record<string, unknown>;
            const photo: Photo = {
              id: props.id as number,
              path: props.path as string,
              latitude: clusterCenter[1],
              longitude: clusterCenter[0],
              timestamp: (props.timestamp as number) || null,
              source: (props.source as 'local' | 'onedrive' | 'network') || 'local',
              fileSize: props.fileSize as number,
              mimeType: props.mimeType as string,
              scannedAt: props.scannedAt as number,
              fileHash: (props.fileHash as string) || null,
            };
            spiderAtPointRef.current(photo);
          }
          return;
        }

        // Otherwise zoom to expand the cluster (capped at tile max zoom)
        const targetZoom = Math.min(expansionZoom, maxTileZoom);
        mapRef.current.easeTo({
          center: clusterCenter,
          zoom: targetZoom,
        });
      } catch (err) {
        console.warn('Failed to get cluster expansion zoom:', err);
      }
    });

    // General click handler - clears spider when clicking on empty space
    mapRef.current.on('click', (e: MapLayerMouseEvent) => {
      if (!mapRef.current) return;

      // Check if click was on any feature
      const clusterFeatures = mapRef.current.queryRenderedFeatures(e.point, {
        layers: ['clusters'],
      });
      const pointFeatures = mapRef.current.queryRenderedFeatures(e.point, {
        layers: ['unclustered-point'],
      });

      // If clicking empty space (not on cluster or point), clear spider
      if (clusterFeatures.length === 0 && pointFeatures.length === 0) {
        clearSpiderRef.current();
      }
    });

    // Collapse spider when mouse leaves the spider area
    mapRef.current.on('mousemove', (e: MapLayerMouseEvent) => {
      if (!mapRef.current) return;

      // Check spiderState directly from ref (more reliable than isSpiderActive boolean)
      const currentSpiderState = spiderStateRef.current;
      if (!currentSpiderState) return;

      const center = currentSpiderState.center;
      const centerPoint = mapRef.current.project(center);
      const dx = e.point.x - centerPoint.x;
      const dy = e.point.y - centerPoint.y;
      const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

      const collapseRadius =
        spiderSettingsRef.current.radius + spiderSettingsRef.current.collapseMargin;
      if (distanceFromCenter > collapseRadius) {
        clearSpiderRef.current();
      }
    });

    // Change cursor on hover
    mapRef.current.on('mouseenter', 'clusters', () => {
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer';
    });
    mapRef.current.on('mouseleave', 'clusters', () => {
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
    });
    mapRef.current.on('mouseenter', 'unclustered-point', () => {
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer';
    });

    // Hover preview for individual photos - also triggers spider at high zoom
    mapRef.current.on('mousemove', 'unclustered-point', (e: MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      const props = e.features[0].properties;
      if (!props) return;

      // Set hover feature state for visual feedback
      if (mapRef.current) {
        // Clear previous hover state
        if (hoveredFeatureIdRef.current !== null && hoveredFeatureIdRef.current !== props.id) {
          mapRef.current.setFeatureState(
            { source: 'photos', id: hoveredFeatureIdRef.current },
            { hover: false }
          );
        }
        // Set new hover state
        mapRef.current.setFeatureState({ source: 'photos', id: props.id }, { hover: true });
        hoveredFeatureIdRef.current = props.id;
      }

      // Show hover preview
      hoverHandlersRef.current.onMouseMove(props, e.originalEvent.clientX, e.originalEvent.clientY);

      // If at high zoom and spider not already active, check for overlaps and spider on hover
      if (mapRef.current && !isSpiderActiveRef.current) {
        const currentZoom = mapRef.current.getZoom();
        if (currentZoom >= spiderSettingsRef.current.triggerZoom) {
          const photo: Photo = {
            id: props.id,
            path: props.path,
            latitude: props.latitude,
            longitude: props.longitude,
            timestamp: props.timestamp || null,
            source: props.source,
            fileSize: props.fileSize,
            mimeType: props.mimeType,
            scannedAt: props.scannedAt,
            fileHash: props.fileHash || null,
          };

          // Use pixel-based overlap detection (tolerance is in pixels)
          const overlapping = findOverlappingPhotosInPixelsRef.current(
            photo,
            spiderSettingsRef.current.overlapTolerance
          );

          if (overlapping.length > 1) {
            spiderAtPointRef.current(photo);
          }
        }
      }
    });

    mapRef.current.on('mouseleave', 'unclustered-point', () => {
      // Clear hover feature state
      if (mapRef.current && hoveredFeatureIdRef.current !== null) {
        mapRef.current.setFeatureState(
          { source: 'photos', id: hoveredFeatureIdRef.current },
          { hover: false }
        );
        hoveredFeatureIdRef.current = null;
      }

      hoverHandlersRef.current.onMouseLeave();
      // Reset cursor
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
    });

    // Click handler for individual points - spider if overlapping, otherwise open photo
    mapRef.current.on('click', 'unclustered-point', (e: MapLayerMouseEvent) => {
      if (!mapRef.current) return;

      const features = mapRef.current.queryRenderedFeatures(e.point, {
        layers: ['unclustered-point'],
      });
      if (features.length === 0) return;

      const props = features[0].properties;
      const photo: Photo = {
        id: props.id,
        path: props.path,
        latitude: props.latitude,
        longitude: props.longitude,
        timestamp: props.timestamp || null,
        source: props.source,
        fileSize: props.fileSize,
        mimeType: props.mimeType,
        scannedAt: props.scannedAt,
        fileHash: props.fileHash || null,
      };

      // If spider is active and this photo is spidered, just open it (no longer overlapping)
      if (isSpiderActiveRef.current) {
        onPhotoClickRef.current(photo);
        clearSpiderRef.current(false); // Close spider without animation
        return;
      }

      // Check if there are visually overlapping photos - if so, spider them out
      // Uses pixel-based detection so it works correctly at any zoom level
      const overlapping = findOverlappingPhotosInPixelsRef.current(
        photo,
        spiderSettingsRef.current.overlapTolerance
      );
      if (overlapping.length > 1) {
        spiderAtPointRef.current(photo);
      } else {
        // No overlaps, just open the photo
        onPhotoClickRef.current(photo);
      }
    });

    return () => {
      // Cleanup hover state and thumbnail cache
      cleanupHover();

      mapRef.current?.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [theme]); // Removed onPhotoClick and onViewChange from deps

  // Update photo data source when photos change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const photosWithLocation = photos.filter((photo) => photo.latitude && photo.longitude);

    if (photosWithLocation.length === 0) {
      // Remove source if no photos
      if (mapRef.current.getSource('photos')) {
        if (mapRef.current.getLayer('photos-heatmap')) mapRef.current.removeLayer('photos-heatmap');
        if (mapRef.current.getLayer('clusters')) mapRef.current.removeLayer('clusters');
        if (mapRef.current.getLayer('cluster-count')) mapRef.current.removeLayer('cluster-count');
        if (mapRef.current.getLayer('unclustered-point'))
          mapRef.current.removeLayer('unclustered-point');
        mapRef.current.removeSource('photos');
        if (mapRef.current.getSource('photos-heatmap-source')) {
          mapRef.current.removeSource('photos-heatmap-source');
        }
      }
      return;
    }

    // Convert photos to GeoJSON, applying spider offsets if active
    const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: photosWithLocation.map((photo) => {
        // Apply spider offset if this photo is being spidered
        const [lng, lat] = applySpiderOffset(photo, spiderState);
        return {
          type: 'Feature',
          id: photo.id, // Top-level ID is required for feature-state
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          properties: {
            id: photo.id,
            path: photo.path,
            latitude: photo.latitude,
            longitude: photo.longitude,
            timestamp: photo.timestamp,
            source: photo.source,
            fileSize: photo.fileSize,
            mimeType: photo.mimeType,
            scannedAt: photo.scannedAt,
            fileHash: photo.fileHash,
          },
        };
      }),
    };

    // Disable clustering when in lasso mode to allow individual selection
    const isClusteringActive = clusteringEnabled && selectionMode !== 'lasso';

    if (!mapRef.current.getSource('photos')) {
      // Add source with clustering enabled for markers
      mapRef.current.addSource('photos', {
        type: 'geojson',
        data: geojson,
        cluster: isClusteringActive,
        clusterMaxZoom: clusterMaxZoom,
        clusterRadius: clusterRadius,
      });

      // Add separate unclustered source for heatmap
      if (showHeatmap) {
        mapRef.current.addSource('photos-heatmap-source', {
          type: 'geojson',
          data: geojson,
        });
        addHeatmapLayer(mapRef.current);
      }

      // Add all cluster layers on top
      addClusterLayers(mapRef.current, showHeatmap);
    } else {
      // Update existing source data
      const source = mapRef.current.getSource('photos') as maplibregl.GeoJSONSource;
      source.setData(geojson);

      // Update heatmap source if it exists
      const heatmapSource = mapRef.current.getSource(
        'photos-heatmap-source'
      ) as maplibregl.GeoJSONSource;
      if (heatmapSource) {
        heatmapSource.setData(geojson);
      }

      // If cluster settings or heatmap visibility changed, we need to recreate the source
      // Check if we need to update cluster settings by removing and re-adding
      const currentSource = mapRef.current.getSource('photos') as any;
      const hasHeatmapLayer = mapRef.current.getLayer('photos-heatmap') !== undefined;
      const heatmapNeedsUpdate = showHeatmap !== hasHeatmapLayer;

      if (
        currentSource._data &&
        (currentSource._options.cluster !== isClusteringActive ||
          currentSource._options.clusterRadius !== clusterRadius ||
          currentSource._options.clusterMaxZoom !== clusterMaxZoom ||
          heatmapNeedsUpdate)
      ) {
        // Remove layers
        if (mapRef.current.getLayer('photos-heatmap')) mapRef.current.removeLayer('photos-heatmap');
        if (mapRef.current.getLayer('clusters')) mapRef.current.removeLayer('clusters');
        if (mapRef.current.getLayer('cluster-count')) mapRef.current.removeLayer('cluster-count');
        if (mapRef.current.getLayer('unclustered-point'))
          mapRef.current.removeLayer('unclustered-point');
        // Remove source
        mapRef.current.removeSource('photos');
        if (mapRef.current.getSource('photos-heatmap-source')) {
          mapRef.current.removeSource('photos-heatmap-source');
        }

        // Re-add with new settings
        mapRef.current.addSource('photos', {
          type: 'geojson',
          data: geojson,
          cluster: isClusteringActive,
          clusterMaxZoom: clusterMaxZoom,
          clusterRadius: clusterRadius,
        });

        // Re-add heatmap source and layer if enabled
        if (showHeatmap) {
          mapRef.current.addSource('photos-heatmap-source', {
            type: 'geojson',
            data: geojson,
          });
          addHeatmapLayer(mapRef.current);
        }

        // Re-add all cluster layers
        addClusterLayers(mapRef.current, showHeatmap);
      }
    }

    // Fit map to show all photos with smooth transition (respects autoFit setting)
    if (photosWithLocation.length > 0) {
      if (autoFit || !hasInitialFit.current) {
        const bounds = new maplibregl.LngLatBounds();
        photosWithLocation.forEach((photo) => {
          bounds.extend([photo.longitude!, photo.latitude!]);
        });
        mapRef.current.fitBounds(bounds, { padding, maxZoom, duration: transitionDuration });
        hasInitialFit.current = true;
      }
    }
  }, [
    photos,
    mapLoaded,
    clusteringEnabled,
    clusterRadius,
    clusterMaxZoom,
    transitionDuration,
    maxZoom,
    padding,
    autoFit,
    showHeatmap,
    selectionMode,
    spiderState, // Re-render when spider state changes (animation frames)
  ]);

  // Toggle heatmap visibility when showHeatmap prop changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const hasHeatmapLayer = mapRef.current.getLayer('photos-heatmap');
    const hasHeatmapSource = mapRef.current.getSource('photos-heatmap-source');
    const hasClustersLayer = mapRef.current.getLayer('clusters');
    const hasClusterCountLayer = mapRef.current.getLayer('cluster-count');
    const photosSource = mapRef.current.getSource('photos') as maplibregl.GeoJSONSource;

    if (showHeatmap && !hasHeatmapLayer && photosSource) {
      // Get the current data from photos source
      const currentData = (photosSource as any)._data;

      // Add heatmap source if it doesn't exist
      if (!hasHeatmapSource) {
        mapRef.current.addSource('photos-heatmap-source', {
          type: 'geojson',
          data: currentData,
        });
      }

      // Add heatmap layer (before cluster layers so it renders below)
      addHeatmapLayer(mapRef.current);

      // Move heatmap layer below clusters
      if (hasClustersLayer) {
        mapRef.current.moveLayer('photos-heatmap', 'clusters');
      }

      // Hide cluster layers
      if (hasClustersLayer) {
        mapRef.current.setLayoutProperty('clusters', 'visibility', 'none');
      }
      if (hasClusterCountLayer) {
        mapRef.current.setLayoutProperty('cluster-count', 'visibility', 'none');
      }
    } else if (!showHeatmap && hasHeatmapLayer) {
      // Remove heatmap layer and source
      mapRef.current.removeLayer('photos-heatmap');
      if (hasHeatmapSource) {
        mapRef.current.removeSource('photos-heatmap-source');
      }

      // Show cluster layers
      if (hasClustersLayer) {
        mapRef.current.setLayoutProperty('clusters', 'visibility', 'visible');
      }
      if (hasClusterCountLayer) {
        mapRef.current.setLayoutProperty('cluster-count', 'visibility', 'visible');
      }
    }
  }, [showHeatmap, mapLoaded]);

  // Manage spider legs layer (lines showing where photos came from)
  // Note: The actual photo points are moved in the main GeoJSON, not as a separate layer
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    // If spider is cleared, remove legs layer and source
    if (!spiderState || spiderState.offsets.size === 0) {
      if (mapRef.current.getLayer('spider-legs')) {
        mapRef.current.removeLayer('spider-legs');
      }
      if (mapRef.current.getSource('spider-legs')) {
        mapRef.current.removeSource('spider-legs');
      }
      return;
    }

    // Create leg features connecting center to each spidered photo position
    const legFeatures = createSpiderLegs(spiderState);

    const legsGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: legFeatures,
    };

    // Check if source already exists - if so, just update data (for smooth animation)
    const existingSource = mapRef.current.getSource('spider-legs') as maplibregl.GeoJSONSource;
    if (existingSource) {
      existingSource.setData(legsGeoJSON);
      return;
    }

    // First time - create source and layer
    mapRef.current.addSource('spider-legs', {
      type: 'geojson',
      data: legsGeoJSON,
    });

    // Add spider legs layer
    mapRef.current.addLayer({
      id: 'spider-legs',
      type: 'line',
      source: 'spider-legs',
      paint: {
        'line-color': '#666',
        'line-width': 1.5,
        'line-opacity': 0.7,
      },
    });
  }, [spiderState, mapLoaded]);

  // Clear spider when zooming out significantly
  useEffect(() => {
    if (currentZoom < spiderSettings.clearZoom && isSpiderActive) {
      clearSpider(false);
    }
  }, [currentZoom, isSpiderActive, clearSpider]);

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
