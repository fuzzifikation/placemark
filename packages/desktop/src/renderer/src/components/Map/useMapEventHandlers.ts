/**
 * useMapEventHandlers - Manages all map interaction events
 * Extracted from MapView.tsx to improve maintainability
 *
 * Handles:
 * - Cluster clicks (zoom to expand or spider)
 * - Photo clicks (open or spider if overlapping)
 * - Hover interactions (preview + spider trigger)
 * - Cursor changes
 * - Spider collapse on mouse leave
 */

import { useEffect, useRef, type MutableRefObject } from 'react';
import type maplibregl from 'maplibre-gl';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import type { Photo } from '@placemark/core';
import type * as GeoJSON from 'geojson';
import type { SpiderSettings } from '../MapView';

interface UseMapEventHandlersProps {
  mapRef: MutableRefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  // Callbacks
  onPhotoClick: (photo: Photo) => void;
  onViewChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  // Hover handlers
  hoverHandlersRef: MutableRefObject<{
    onMouseMove: (props: any, x: number, y: number) => void;
    onMouseLeave: () => void;
  }>;
  hoveredFeatureIdRef: MutableRefObject<string | null>;
  // Spider functions
  spiderAtPoint: (photo: Photo) => void;
  clearSpider: (animated?: boolean) => void;
  isSpiderActive: boolean;
  spiderState: any;
  // Overlap detection
  findOverlappingPhotosInPixels: (photo: Photo, tolerance: number) => Photo[];
  // Settings
  spiderSettings: SpiderSettings;
  tileMaxZoom: number;
  // Data
  photos: Photo[];
  // State setters
  setCurrentZoom: (zoom: number) => void;
}

export function useMapEventHandlers({
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
}: UseMapEventHandlersProps) {
  // Store callbacks in refs to avoid stale closures
  const onViewChangeRef = useRef(onViewChange);
  const onPhotoClickRef = useRef(onPhotoClick);
  const spiderAtPointRef = useRef(spiderAtPoint);
  const clearSpiderRef = useRef(clearSpider);
  const isSpiderActiveRef = useRef(isSpiderActive);
  const spiderStateRef = useRef(spiderState);
  const photosRef = useRef(photos);
  const spiderSettingsRef = useRef(spiderSettings);
  const tileMaxZoomRef = useRef(tileMaxZoom);
  const findOverlappingPhotosInPixelsRef = useRef(findOverlappingPhotosInPixels);

  // Update refs when values change
  useEffect(() => {
    onViewChangeRef.current = onViewChange;
    onPhotoClickRef.current = onPhotoClick;
    spiderAtPointRef.current = spiderAtPoint;
    clearSpiderRef.current = clearSpider;
    isSpiderActiveRef.current = isSpiderActive;
    spiderStateRef.current = spiderState;
    photosRef.current = photos;
    spiderSettingsRef.current = spiderSettings;
    tileMaxZoomRef.current = tileMaxZoom;
    findOverlappingPhotosInPixelsRef.current = findOverlappingPhotosInPixels;
  }, [
    onViewChange,
    onPhotoClick,
    spiderAtPoint,
    clearSpider,
    isSpiderActive,
    spiderState,
    photos,
    spiderSettings,
    tileMaxZoom,
    findOverlappingPhotosInPixels,
  ]);

  // Setup all event listeners
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;

    // ============= MOVE END HANDLER =============
    const handleMoveEnd = () => {
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
    };

    // ============= ZOOM HANDLER =============
    const handleZoom = () => {
      if (mapRef.current) {
        setCurrentZoom(mapRef.current.getZoom());
      }
    };

    // ============= CLUSTER CLICK HANDLER =============
    const handleClusterClick = async (e: MapLayerMouseEvent) => {
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
        // Silently handle cluster expansion errors
      }
    };

    // ============= GENERAL CLICK HANDLER (clears spider on empty space) =============
    const handleMapClick = (e: MapLayerMouseEvent) => {
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
    };

    // ============= SPIDER COLLAPSE ON MOUSE LEAVE =============
    const handleMouseMove = (e: MapLayerMouseEvent) => {
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
    };

    // ============= CURSOR CHANGE HANDLERS =============
    const handleClusterMouseEnter = () => {
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer';
    };
    const handleClusterMouseLeave = () => {
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
    };
    const handlePointMouseEnter = () => {
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer';
    };

    // ============= PHOTO HOVER HANDLER (preview + spider trigger) =============
    const handlePointMouseMove = (e: MapLayerMouseEvent) => {
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
    };

    // ============= PHOTO HOVER LEAVE HANDLER =============
    const handlePointMouseLeave = () => {
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
    };

    // ============= PHOTO CLICK HANDLER (spider or open) =============
    const handlePointClick = (e: MapLayerMouseEvent) => {
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
    };

    // ============= REGISTER ALL LISTENERS =============
    map.on('moveend', handleMoveEnd);
    map.on('zoom', handleZoom);
    map.on('click', 'clusters', handleClusterClick);
    map.on('click', handleMapClick);
    map.on('mousemove', handleMouseMove);
    map.on('mouseenter', 'clusters', handleClusterMouseEnter);
    map.on('mouseleave', 'clusters', handleClusterMouseLeave);
    map.on('mouseenter', 'unclustered-point', handlePointMouseEnter);
    map.on('mousemove', 'unclustered-point', handlePointMouseMove);
    map.on('mouseleave', 'unclustered-point', handlePointMouseLeave);
    map.on('click', 'unclustered-point', handlePointClick);

    // ============= CLEANUP =============
    return () => {
      map.off('moveend', handleMoveEnd);
      map.off('zoom', handleZoom);
      map.off('click', 'clusters', handleClusterClick);
      map.off('click', handleMapClick);
      map.off('mousemove', handleMouseMove);
      map.off('mouseenter', 'clusters', handleClusterMouseEnter);
      map.off('mouseleave', 'clusters', handleClusterMouseLeave);
      map.off('mouseenter', 'unclustered-point', handlePointMouseEnter);
      map.off('mousemove', 'unclustered-point', handlePointMouseMove);
      map.off('mouseleave', 'unclustered-point', handlePointMouseLeave);
      map.off('click', 'unclustered-point', handlePointClick);
    };
  }, [mapRef, mapLoaded, hoverHandlersRef, hoveredFeatureIdRef, setCurrentZoom]);
}
