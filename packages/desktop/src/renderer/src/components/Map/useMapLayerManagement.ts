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
  fitPadding?: { top: number; right: number; bottom: number; left: number };
  autoFit: boolean;
  showHeatmap: boolean;
  selectionMode: SelectionMode;
  spiderState: any;
  selectedIds?: Set<number>;
  clusterOpacity?: number;
  unclusteredPointOpacity?: number;
}

/** Settings that require tearing down and recreating the GeoJSON source */
interface AppliedSourceSettings {
  isClusteringActive: boolean;
  clusterRadius: number;
  clusterMaxZoom: number;
  showHeatmap: boolean;
  clusterOpacity: number | undefined;
  unclusteredPointOpacity: number | undefined;
}

/** Remove all photo-related layers and sources from the map */
function removePhotoSourceAndLayers(map: MaplibreMap): void {
  for (const layerId of ['photos-heatmap', 'clusters', 'cluster-count', 'unclustered-point']) {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  }
  if (map.getSource('photos')) map.removeSource('photos');
  if (map.getSource('photos-heatmap-source')) map.removeSource('photos-heatmap-source');
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
  fitPadding,
  autoFit,
  showHeatmap,
  selectionMode,
  spiderState,
  selectedIds,
  clusterOpacity,
  unclusteredPointOpacity,
}: UseMapLayerManagementProps) {
  const hasInitialFit = useRef(false);
  const appliedSourceSettings = useRef<AppliedSourceSettings | null>(null);

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
        removePhotoSourceAndLayers(mapRef.current);
        appliedSourceSettings.current = null;
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
            cameraMake: photo.cameraMake,
            cameraModel: photo.cameraModel,
            cloudItemId: photo.cloudItemId,
            cloudFolderPath: photo.cloudFolderPath,
            cloudSha256: photo.cloudSha256,
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
      appliedSourceSettings.current = {
        isClusteringActive,
        clusterRadius,
        clusterMaxZoom,
        showHeatmap,
        clusterOpacity,
        unclusteredPointOpacity,
      };
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

      // If cluster settings or heatmap visibility changed, recreate the source.
      // We track previously applied settings in a ref to avoid reading private
      // MapLibre internals (_data, _options) which are undocumented and may change.
      const prev = appliedSourceSettings.current;
      const hasHeatmapLayer = !!mapRef.current.getLayer('photos-heatmap');
      const heatmapNeedsUpdate = showHeatmap !== hasHeatmapLayer;

      if (
        prev !== null &&
        (prev.isClusteringActive !== isClusteringActive ||
          prev.clusterRadius !== clusterRadius ||
          prev.clusterMaxZoom !== clusterMaxZoom ||
          prev.clusterOpacity !== clusterOpacity ||
          prev.unclusteredPointOpacity !== unclusteredPointOpacity ||
          heatmapNeedsUpdate)
      ) {
        // Remove layers
        removePhotoSourceAndLayers(mapRef.current);

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
        addClusterLayers(mapRef.current, showHeatmap, clusterOpacity, unclusteredPointOpacity);
        appliedSourceSettings.current = {
          isClusteringActive,
          clusterRadius,
          clusterMaxZoom,
          showHeatmap,
          clusterOpacity,
          unclusteredPointOpacity,
        };
      }
    }

    // Fit map to show all photos with smooth transition (respects autoFit setting)
    if (photosWithLocation.length > 0) {
      if (autoFit || !hasInitialFit.current) {
        const bounds = new maplibregl.LngLatBounds();
        photosWithLocation.forEach((photo) => {
          bounds.extend([photo.longitude!, photo.latitude!]);
        });
        const effectivePadding = fitPadding ?? {
          top: padding,
          right: padding,
          bottom: padding,
          left: padding,
        };
        mapRef.current.fitBounds(bounds, {
          padding: effectivePadding,
          duration: transitionDuration,
        });
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
    fitPadding,
    autoFit,
    showHeatmap,
    clusterOpacity,
    unclusteredPointOpacity,
    selectionMode,
    spiderState, // Re-render when spider state changes (animation frames)
    mapRef,
  ]);

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

    // Add spider legs layer — below unclustered-point so pins render on top of legs
    mapRef.current.addLayer(
      {
        id: 'spider-legs',
        type: 'line',
        source: 'spider-legs',
        paint: {
          'line-color': '#666',
          'line-width': 1.5,
          'line-opacity': 0.7,
        },
      },
      'unclustered-point'
    );
  }, [spiderState, mapLoaded, mapRef]);
}
