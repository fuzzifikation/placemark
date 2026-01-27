/**
 * MapView component - displays photos on an interactive map with clustering
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Photo } from '@placemark/core';
import type * as GeoJSON from 'geojson';
import type { Theme } from '../theme';
import { PhotoHoverPreview } from './Map/PhotoHoverPreview';
import { addHeatmapLayer, addClusterLayers } from './Map/mapLayers';

interface MapViewProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
  clusteringEnabled?: boolean;
  clusterRadius?: number;
  clusterMaxZoom?: number;
  transitionDuration?: number;
  maxZoom?: number;
  padding?: number;
  autoFit?: boolean;
  theme?: Theme;
  showHeatmap?: boolean;
}

export function MapView({
  photos,
  onPhotoClick,
  clusteringEnabled = true,
  clusterRadius = 30,
  clusterMaxZoom = 16,
  transitionDuration = 200,
  maxZoom = 15,
  padding = 50,
  autoFit = true,
  theme = 'light',
  showHeatmap = false,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentZoom, setCurrentZoom] = useState<number>(0);
  const [hoveredPhoto, setHoveredPhoto] = useState<Photo | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoverThumbnailUrl, setHoverThumbnailUrl] = useState<string | null>(null);
  const [loadingHoverThumbnail, setLoadingHoverThumbnail] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // In-memory cache for loaded thumbnails (Object URLs)
  const thumbnailCacheRef = useRef<Map<number, string>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

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

    map.current = new maplibregl.Map({
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
            maxzoom: 19,
          },
        ],
      },
      center: [0, 0],
      zoom: 2,
      maxZoom: 19, // Match tile source max zoom to prevent zooming beyond available tiles
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
      if (map.current) {
        setCurrentZoom(map.current.getZoom());
      }
    });

    map.current.on('zoom', () => {
      if (map.current) {
        setCurrentZoom(map.current.getZoom());
      }
    });

    // Click handler for clusters - zoom in to expand
    map.current.on('click', 'clusters', async (e: MapLayerMouseEvent) => {
      if (!map.current) return;
      const features = map.current.queryRenderedFeatures(e.point, {
        layers: ['clusters'],
      });
      if (features.length === 0) return;

      const clusterId = features[0].properties.cluster_id;
      const source = map.current.getSource('photos') as maplibregl.GeoJSONSource;

      // Get cluster expansion zoom and zoom to it
      const zoom = await source.getClusterExpansionZoom(clusterId);
      map.current.easeTo({
        center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
        zoom: zoom,
      });
    });

    // Change cursor on hover
    map.current.on('mouseenter', 'clusters', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });
    map.current.on('mouseleave', 'clusters', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
    });
    map.current.on('mouseenter', 'unclustered-point', () => {
      if (map.current) map.current.getCanvas().style.cursor = 'pointer';
    });

    // Hover preview for individual photos
    map.current.on('mousemove', 'unclustered-point', (e: MapLayerMouseEvent) => {
      if (!e.features || e.features.length === 0) return;

      const feature = e.features[0];
      const props = feature.properties;
      if (!props) return;

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

      // Update hover position
      setHoverPosition({ x: e.originalEvent.clientX, y: e.originalEvent.clientY });

      // Only load thumbnail if photo changed
      if (!hoveredPhoto || hoveredPhoto.id !== photo.id) {
        setHoveredPhoto(photo);

        // Clear existing timeout
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }

        // Check in-memory cache first
        const cachedUrl = thumbnailCacheRef.current.get(photo.id);
        if (cachedUrl) {
          // Use cached thumbnail immediately
          setHoverThumbnailUrl(cachedUrl);
          setLoadingHoverThumbnail(false);
          return;
        }

        // Immediately clear old thumbnail and show loading state
        if (hoverThumbnailUrl) {
          URL.revokeObjectURL(hoverThumbnailUrl);
        }
        setHoverThumbnailUrl(null);
        setLoadingHoverThumbnail(true);

        // Load thumbnail after 200ms delay (debounce)
        hoverTimeoutRef.current = setTimeout(() => {
          (window as any).api.thumbnails
            .get(photo.id, photo.path)
            .then((thumbnailBuffer: Buffer | null) => {
              if (thumbnailBuffer) {
                const uint8Array = new Uint8Array(thumbnailBuffer as unknown as ArrayBuffer);
                const blob = new Blob([uint8Array], { type: 'image/jpeg' });
                const url = URL.createObjectURL(blob);

                // Store in cache
                thumbnailCacheRef.current.set(photo.id, url);
                setHoverThumbnailUrl(url);
              }
            })
            .catch((error: Error) => {
              console.error('Failed to load hover thumbnail:', error);
            })
            .finally(() => {
              setLoadingHoverThumbnail(false);
            });
        }, 200);
      }
    });

    map.current.on('mouseleave', 'unclustered-point', () => {
      // Clear hover state
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      setHoveredPhoto(null);
      setHoverPosition(null);
      if (hoverThumbnailUrl) {
        URL.revokeObjectURL(hoverThumbnailUrl);
        setHoverThumbnailUrl(null);
      }
      // Reset cursor
      if (map.current) map.current.getCanvas().style.cursor = '';
    });

    // Click handler for individual points
    map.current.on('click', 'unclustered-point', (e: MapLayerMouseEvent) => {
      if (!map.current) return;
      const features = map.current.queryRenderedFeatures(e.point, {
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
      onPhotoClick(photo);
    });

    return () => {
      // Cleanup
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (hoverThumbnailUrl) {
        URL.revokeObjectURL(hoverThumbnailUrl);
      }
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, [onPhotoClick, theme]);

  // Update photo data source when photos change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const photosWithLocation = photos.filter((photo) => photo.latitude && photo.longitude);

    if (photosWithLocation.length === 0) {
      // Remove source if no photos
      if (map.current.getSource('photos')) {
        if (map.current.getLayer('photos-heatmap')) map.current.removeLayer('photos-heatmap');
        if (map.current.getLayer('clusters')) map.current.removeLayer('clusters');
        if (map.current.getLayer('cluster-count')) map.current.removeLayer('cluster-count');
        if (map.current.getLayer('unclustered-point')) map.current.removeLayer('unclustered-point');
        map.current.removeSource('photos');
        if (map.current.getSource('photos-heatmap-source')) {
          map.current.removeSource('photos-heatmap-source');
        }
      }
      return;
    }

    // Convert photos to GeoJSON
    const geojson: GeoJSON.FeatureCollection<GeoJSON.Point> = {
      type: 'FeatureCollection',
      features: photosWithLocation.map((photo) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [photo.longitude!, photo.latitude!],
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
      })),
    };

    if (!map.current.getSource('photos')) {
      // Add source with clustering enabled for markers
      map.current.addSource('photos', {
        type: 'geojson',
        data: geojson,
        cluster: clusteringEnabled,
        clusterMaxZoom: clusterMaxZoom,
        clusterRadius: clusterRadius,
      });

      // Add separate unclustered source for heatmap
      if (showHeatmap) {
        map.current.addSource('photos-heatmap-source', {
          type: 'geojson',
          data: geojson,
        });
        addHeatmapLayer(map.current);
      }

      // Add all cluster layers on top
      addClusterLayers(map.current, showHeatmap);
    } else {
      // Update existing source data
      const source = map.current.getSource('photos') as maplibregl.GeoJSONSource;
      source.setData(geojson);

      // Update heatmap source if it exists
      const heatmapSource = map.current.getSource(
        'photos-heatmap-source'
      ) as maplibregl.GeoJSONSource;
      if (heatmapSource) {
        heatmapSource.setData(geojson);
      }

      // If cluster settings or heatmap visibility changed, we need to recreate the source
      // Check if we need to update cluster settings by removing and re-adding
      const currentSource = map.current.getSource('photos') as any;
      const hasHeatmapLayer = map.current.getLayer('photos-heatmap') !== undefined;
      const heatmapNeedsUpdate = showHeatmap !== hasHeatmapLayer;

      if (
        currentSource._data &&
        (currentSource._options.cluster !== clusteringEnabled ||
          currentSource._options.clusterRadius !== clusterRadius ||
          currentSource._options.clusterMaxZoom !== clusterMaxZoom ||
          heatmapNeedsUpdate)
      ) {
        // Remove layers
        if (map.current.getLayer('photos-heatmap')) map.current.removeLayer('photos-heatmap');
        if (map.current.getLayer('clusters')) map.current.removeLayer('clusters');
        if (map.current.getLayer('cluster-count')) map.current.removeLayer('cluster-count');
        if (map.current.getLayer('unclustered-point')) map.current.removeLayer('unclustered-point');
        // Remove source
        map.current.removeSource('photos');
        if (map.current.getSource('photos-heatmap-source')) {
          map.current.removeSource('photos-heatmap-source');
        }

        // Re-add with new settings
        map.current.addSource('photos', {
          type: 'geojson',
          data: geojson,
          cluster: clusteringEnabled,
          clusterMaxZoom: clusterMaxZoom,
          clusterRadius: clusterRadius,
        });

        // Re-add heatmap source and layer if enabled
        if (showHeatmap) {
          map.current.addSource('photos-heatmap-source', {
            type: 'geojson',
            data: geojson,
          });
          addHeatmapLayer(map.current);
        }

        // Re-add all cluster layers
        addClusterLayers(map.current, showHeatmap);
      }
    }

    // Fit map to show all photos with smooth transition (respects autoFit setting)
    if (autoFit && photosWithLocation.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      photosWithLocation.forEach((photo) => {
        bounds.extend([photo.longitude!, photo.latitude!]);
      });
      map.current.fitBounds(bounds, { padding, maxZoom, duration: transitionDuration });
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
  ]);

  // Toggle heatmap visibility when showHeatmap prop changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const hasHeatmapLayer = map.current.getLayer('photos-heatmap');
    const hasHeatmapSource = map.current.getSource('photos-heatmap-source');
    const hasClustersLayer = map.current.getLayer('clusters');
    const hasClusterCountLayer = map.current.getLayer('cluster-count');
    const photosSource = map.current.getSource('photos') as maplibregl.GeoJSONSource;

    if (showHeatmap && !hasHeatmapLayer && photosSource) {
      // Get the current data from photos source
      const currentData = (photosSource as any)._data;

      // Add heatmap source if it doesn't exist
      if (!hasHeatmapSource) {
        map.current.addSource('photos-heatmap-source', {
          type: 'geojson',
          data: currentData,
        });
      }

      // Add heatmap layer (before cluster layers so it renders below)
      addHeatmapLayer(map.current);

      // Move heatmap layer below clusters
      if (hasClustersLayer) {
        map.current.moveLayer('photos-heatmap', 'clusters');
      }

      // Hide cluster layers
      if (hasClustersLayer) {
        map.current.setLayoutProperty('clusters', 'visibility', 'none');
      }
      if (hasClusterCountLayer) {
        map.current.setLayoutProperty('cluster-count', 'visibility', 'none');
      }
    } else if (!showHeatmap && hasHeatmapLayer) {
      // Remove heatmap layer and source
      map.current.removeLayer('photos-heatmap');
      if (hasHeatmapSource) {
        map.current.removeSource('photos-heatmap-source');
      }

      // Show cluster layers
      if (hasClustersLayer) {
        map.current.setLayoutProperty('clusters', 'visibility', 'visible');
      }
      if (hasClusterCountLayer) {
        map.current.setLayoutProperty('cluster-count', 'visibility', 'visible');
      }
    }
  }, [showHeatmap, mapLoaded]);

  return (
    <>
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      />
      {/* Debug: Show current zoom level */}
      <div
        style={{
          position: 'fixed',
          top: '60px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      >
        Zoom: {currentZoom.toFixed(2)}
      </div>
      {/* Hover Tooltip */}
      {hoveredPhoto && hoverPosition && (
        <PhotoHoverPreview
          photo={hoveredPhoto}
          position={hoverPosition}
          thumbnailUrl={hoverThumbnailUrl}
          loading={loadingHoverThumbnail}
          theme={theme}
        />
      )}
    </>
  );
}
