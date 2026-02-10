/**
 * useMapLayerManagement - Manages GeoJSON sources and map layers
 * Extracted from MapView.tsx to improve maintainability
 *
 * Handles:
 * - Photo source creation and updates
 * - Cluster layer management
 * - Heatmap layer toggling
 * - Spider legs rendering
 * - Auto-fit to bounds
 */

import { useEffect, useRef, type MutableRefObject } from 'react';
import maplibregl, { type Map as MaplibreMap } from 'maplibre-gl';
import type { Photo } from '@placemark/core';
import type * as GeoJSON from 'geojson';
import type { SelectionMode } from '../MapView';
import { addHeatmapLayer, addClusterLayers } from './mapLayers';
import { createSpiderLegs, applySpiderOffset } from './useSpider';

interface UseMapLayerManagementProps {
  mapRef: MutableRefObject<MaplibreMap | null>;
  mapLoaded: boolean;
  photos: Photo[];
  clusteringEnabled: boolean;
  clusterRadius: number;
  clusterMaxZoom: number;
  transitionDuration: number;
  padding: number;
  autoFit: boolean;
  showHeatmap: boolean;
  selectionMode: SelectionMode;
  spiderState: any;
  selectedIds?: Set<number>;
  clusterOpacity?: number;
  unclusteredPointOpacity?: number;
}

export function useMapLayerManagement({
  mapRef,
  mapLoaded,
  photos,
  clusteringEnabled,
  clusterRadius,
  clusterMaxZoom,
  transitionDuration,
  padding,
  autoFit,
  showHeatmap,
  selectionMode,
  spiderState,
  selectedIds,
  clusterOpacity,
  unclusteredPointOpacity,
}: UseMapLayerManagementProps) {
  const hasInitialFit = useRef(false);

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
        // Silently handle feature state errors (e.g., source not yet loaded)
      }
    }
  }, [selectedIds, mapLoaded, photos, mapRef]);

  // Update photo data source when photos change
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const photosWithLocation = photos.filter(
      (photo) => photo.latitude != null && photo.longitude != null
    );

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
      addClusterLayers(mapRef.current, showHeatmap, clusterOpacity, unclusteredPointOpacity);
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
        mapRef.current.fitBounds(bounds, { padding, duration: transitionDuration });
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
    padding,
    autoFit,
    showHeatmap,
    selectionMode,
    spiderState, // Re-render when spider state changes (animation frames)
    mapRef,
  ]);

  // Toggle heatmap visibility when showHeatmap prop changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    const hasHeatmapLayer = mapRef.current.getLayer('photos-heatmap');
    const hasClustersLayer = mapRef.current.getLayer('clusters');
    const hasClusterCountLayer = mapRef.current.getLayer('cluster-count');

    if (showHeatmap && !hasHeatmapLayer) {
      // Heatmap enabled but layer doesn't exist - it will be added by the main photos effect
      // This effect just ensures visibility, the main effect handles creation
    } else if (!showHeatmap && hasHeatmapLayer) {
      // Heatmap disabled but layer exists - remove it
      mapRef.current.removeLayer('photos-heatmap');
    }

    // Clusters and heatmap can coexist, but we need to manage z-order
    if (showHeatmap && hasHeatmapLayer && (hasClustersLayer || hasClusterCountLayer)) {
      // Ensure heatmap is under clusters by moving it
      try {
        const clustersLayerId = hasClustersLayer ? 'clusters' : 'cluster-count';
        if (mapRef.current.getLayer('photos-heatmap')) {
          mapRef.current.moveLayer('photos-heatmap', clustersLayerId);
        }
      } catch (err) {
        // Ignore layer ordering errors
      }
    }
  }, [showHeatmap, mapLoaded, mapRef]);

  // Render spider legs when spider state changes
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
  }, [spiderState, mapLoaded, mapRef]);
}
