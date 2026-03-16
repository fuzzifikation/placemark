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
import type { SpiderState } from './useSpider';
import { photoFromProps } from './mapPhotoUtils';

interface UseMapEventHandlersProps {
  mapRef: MutableRefObject<maplibregl.Map | null>;
  mapLoaded: boolean;
  // Callbacks
  onPhotoClick: (photo: Photo) => void;
  onViewChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  // Hover handlers
  hoverHandlersRef: MutableRefObject<{
    onMouseMove: (props: Record<string, unknown>, x: number, y: number) => void;
    onMouseLeave: () => void;
  }>;
  hoveredFeatureIdRef: MutableRefObject<string | null>;
  // Spider functions
  spiderAtPoint: (photo: Photo) => void;
  clearSpider: (animated?: boolean) => void;
  isSpiderActive: boolean;
  spiderState: SpiderState | null;
  // Overlap detection
  findOverlappingPhotosInPixels: (photo: Photo, tolerance: number) => Photo[];
  // Settings
  spiderSettings: SpiderSettings;
  tileMaxZoom: number;
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
  setCurrentZoom,
}: UseMapEventHandlersProps) {
  // "Latest ref" pattern: a single object ref updated synchronously on every render.
  // Event listeners are registered once (on mapLoaded) and read from this ref,
  // so they always see current props/state without stale closures — and without
  // a separate sync useEffect.
  const latestRef = useRef({
    onViewChange,
    onPhotoClick,
    spiderAtPoint,
    clearSpider,
    isSpiderActive,
    spiderState,
    spiderSettings,
    tileMaxZoom,
    findOverlappingPhotosInPixels,
  });
  latestRef.current = {
    onViewChange,
    onPhotoClick,
    spiderAtPoint,
    clearSpider,
    isSpiderActive,
    spiderState,
    spiderSettings,
    tileMaxZoom,
    findOverlappingPhotosInPixels,
  };

  // Setup all event listeners
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    const cb = () => latestRef.current; // shorthand for reading latest values

    // ============= CURSOR HELPERS =============
    const setCursorPointer = () => {
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = 'pointer';
    };
    const clearCursor = () => {
      if (mapRef.current) mapRef.current.getCanvas().style.cursor = '';
    };

    // ============= MOVE END HANDLER =============
    const handleMoveEnd = () => {
      if (!mapRef.current) return;
      const bounds = mapRef.current.getBounds();
      setCurrentZoom(mapRef.current.getZoom());
      cb().onViewChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    };

    // ============= ZOOM HANDLER =============
    const handleZoom = () => {
      if (mapRef.current) setCurrentZoom(mapRef.current.getZoom());
    };

    // ============= CLUSTER CLICK HANDLER =============
    const handleClusterClick = async (e: MapLayerMouseEvent) => {
      if (!mapRef.current) return;
      const features = mapRef.current.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      if (features.length === 0) return;

      const { spiderSettings: ss, tileMaxZoom: maxTileZoom } = cb();
      const clusterId = features[0].properties.cluster_id;
      const source = mapRef.current.getSource('photos') as maplibregl.GeoJSONSource;
      const clusterCenter = (features[0].geometry as GeoJSON.Point).coordinates as [number, number];
      const currentMapZoom = mapRef.current.getZoom();

      try {
        const expansionZoom = await source.getClusterExpansionZoom(clusterId);

        if (currentMapZoom >= ss.triggerZoom && expansionZoom > maxTileZoom) {
          const leaves = await source.getClusterLeaves(clusterId, 100, 0);
          if (leaves.length > 0) {
            const props = leaves[0].properties as Record<string, unknown>;
            // Use cluster center as coordinates since leaves may lack positional data
            cb().spiderAtPoint({
              ...photoFromProps(props),
              latitude: clusterCenter[1],
              longitude: clusterCenter[0],
            });
          }
          return;
        }

        mapRef.current.easeTo({
          center: clusterCenter,
          zoom: Math.min(expansionZoom, maxTileZoom),
        });
      } catch {
        // Silently handle cluster expansion errors
      }
    };

    // ============= GENERAL CLICK HANDLER (clears spider on empty space) =============
    const handleMapClick = (e: MapLayerMouseEvent) => {
      if (!mapRef.current) return;
      const clusterFeatures = mapRef.current.queryRenderedFeatures(e.point, {
        layers: ['clusters'],
      });
      const pointFeatures = mapRef.current.queryRenderedFeatures(e.point, {
        layers: ['unclustered-point'],
      });
      if (clusterFeatures.length === 0 && pointFeatures.length === 0) {
        cb().clearSpider();
      }
    };

    // ============= SPIDER COLLAPSE ON MOUSE LEAVE =============
    const handleMouseMove = (e: MapLayerMouseEvent) => {
      if (!mapRef.current) return;
      const currentSpiderState = cb().spiderState;
      if (!currentSpiderState) return;

      const centerPoint = mapRef.current.project(currentSpiderState.center);
      const dx = e.point.x - centerPoint.x;
      const dy = e.point.y - centerPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const { spiderSettings: ss } = cb();
      if (distance > ss.radius + ss.collapseMargin) {
        cb().clearSpider();
      }
    };

    // ============= PHOTO HOVER HANDLER (preview + spider trigger) =============
    const handlePointMouseMove = (e: MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;
      const props = e.features[0].properties;
      if (!props) return;

      // Update hover feature state for visual feedback
      if (mapRef.current) {
        if (hoveredFeatureIdRef.current !== null && hoveredFeatureIdRef.current !== props.id) {
          mapRef.current.setFeatureState(
            { source: 'photos', id: hoveredFeatureIdRef.current },
            { hover: false }
          );
        }
        mapRef.current.setFeatureState({ source: 'photos', id: props.id }, { hover: true });
        hoveredFeatureIdRef.current = props.id;
      }

      hoverHandlersRef.current.onMouseMove(props, e.originalEvent.clientX, e.originalEvent.clientY);

      if (mapRef.current) {
        const { spiderSettings: ss, spiderState: currentSpider } = cb();
        if (mapRef.current.getZoom() >= ss.triggerZoom) {
          if (currentSpider?.photoIds.has(props.id)) return;

          const photo = photoFromProps(props as Record<string, unknown>);
          const overlapping = cb().findOverlappingPhotosInPixels(photo, ss.overlapTolerance);
          if (overlapping.length > 1) {
            if (currentSpider) cb().clearSpider(false);
            cb().spiderAtPoint(photo);
          }
        }
      }
    };

    // ============= PHOTO HOVER LEAVE HANDLER =============
    const handlePointMouseLeave = () => {
      if (mapRef.current && hoveredFeatureIdRef.current !== null) {
        mapRef.current.setFeatureState(
          { source: 'photos', id: hoveredFeatureIdRef.current },
          { hover: false }
        );
        hoveredFeatureIdRef.current = null;
      }
      hoverHandlersRef.current.onMouseLeave();
      clearCursor();
    };

    // ============= PHOTO CLICK HANDLER (spider or open) =============
    const handlePointClick = (e: MapLayerMouseEvent) => {
      if (!mapRef.current) return;
      const features = mapRef.current.queryRenderedFeatures(e.point, {
        layers: ['unclustered-point'],
      });
      if (features.length === 0) return;

      const photo = photoFromProps(features[0].properties as Record<string, unknown>);
      const { isSpiderActive: spiderActive, spiderSettings: ss } = cb();

      if (spiderActive) {
        cb().onPhotoClick(photo);
        cb().clearSpider(false);
        return;
      }

      const overlapping = cb().findOverlappingPhotosInPixels(photo, ss.overlapTolerance);
      if (overlapping.length > 1) {
        cb().spiderAtPoint(photo);
      } else {
        cb().onPhotoClick(photo);
      }
    };

    // ============= REGISTER ALL LISTENERS =============
    map.on('moveend', handleMoveEnd);
    map.on('zoom', handleZoom);
    map.on('click', 'clusters', handleClusterClick);
    map.on('click', handleMapClick);
    map.on('mousemove', handleMouseMove);
    map.on('mouseenter', 'clusters', setCursorPointer);
    map.on('mouseleave', 'clusters', clearCursor);
    map.on('mouseenter', 'unclustered-point', setCursorPointer);
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
      map.off('mouseenter', 'clusters', setCursorPointer);
      map.off('mouseleave', 'clusters', clearCursor);
      map.off('mouseenter', 'unclustered-point', setCursorPointer);
      map.off('mousemove', 'unclustered-point', handlePointMouseMove);
      map.off('mouseleave', 'unclustered-point', handlePointMouseLeave);
      map.off('click', 'unclustered-point', handlePointClick);
    };
  }, [mapRef, mapLoaded, hoverHandlersRef, hoveredFeatureIdRef, setCurrentZoom]);
}
