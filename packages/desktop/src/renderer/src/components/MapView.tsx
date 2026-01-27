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

// Cluster styling constants
const CLUSTER_THRESHOLDS = {
  SMALL: 100, // < 100 points
  MEDIUM: 750, // 100-750 points
  // > 750 points (large)
};

const CLUSTER_COLORS = {
  SMALL: '#51bbd6', // Blue
  MEDIUM: '#f1f075', // Yellow
  LARGE: '#f28cb1', // Pink
};

const CLUSTER_RADII = {
  SMALL: 20,
  MEDIUM: 30,
  LARGE: 40,
};

const UNCLUSTERED_STYLE = {
  COLOR: '#0066cc',
  RADIUS: 6,
  STROKE_WIDTH: 2,
  STROKE_COLOR: '#fff',
};

// Helper function to add heatmap layer to map
function addHeatmapLayer(map: maplibregl.Map) {
  map.addLayer({
    id: 'photos-heatmap',
    type: 'heatmap',
    source: 'photos-heatmap-source',
    maxzoom: 22, // Show heatmap at all zoom levels
    paint: {
      // Increase weight as diameter increases
      'heatmap-weight': ['interpolate', ['linear'], ['zoom'], 0, 1, 22, 1],
      // Increase intensity as zoom level increases
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 22, 5],
      // Color ramp for heatmap - blue to red
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        'rgba(33,102,172,0)',
        0.2,
        'rgb(103,169,207)',
        0.4,
        'rgb(209,229,240)',
        0.6,
        'rgb(253,219,199)',
        0.8,
        'rgb(239,138,98)',
        1,
        'rgb(178,24,43)',
      ],
      // Adjust radius by zoom level
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 3, 9, 25, 22, 50],
      // Keep opacity high at all zoom levels
      'heatmap-opacity': 0.8,
    },
  });
}

// Helper function to add cluster layers to map
function addClusterLayers(map: maplibregl.Map, showHeatmap: boolean = false) {
  // Layer for cluster circles (hidden when heatmap is active)
  map.addLayer({
    id: 'clusters',
    type: 'circle',
    source: 'photos',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step',
        ['get', 'point_count'],
        CLUSTER_COLORS.SMALL,
        CLUSTER_THRESHOLDS.SMALL,
        CLUSTER_COLORS.MEDIUM,
        CLUSTER_THRESHOLDS.MEDIUM,
        CLUSTER_COLORS.LARGE,
      ],
      'circle-radius': [
        'step',
        ['get', 'point_count'],
        CLUSTER_RADII.SMALL,
        CLUSTER_THRESHOLDS.SMALL,
        CLUSTER_RADII.MEDIUM,
        CLUSTER_THRESHOLDS.MEDIUM,
        CLUSTER_RADII.LARGE,
      ],
    },
  });

  // Layer for cluster count labels
  map.addLayer({
    id: 'cluster-count',
    type: 'symbol',
    source: 'photos',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
      'text-size': 12,
    },
  });

  // Layer for individual unclustered points
  map.addLayer({
    id: 'unclustered-point',
    type: 'circle',
    source: 'photos',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': UNCLUSTERED_STYLE.COLOR,
      'circle-radius': UNCLUSTERED_STYLE.RADIUS,
      'circle-stroke-width': UNCLUSTERED_STYLE.STROKE_WIDTH,
      'circle-stroke-color': UNCLUSTERED_STYLE.STROKE_COLOR,
    },
  });

  // Hide cluster layers if heatmap is active
  if (showHeatmap) {
    map.setLayoutProperty('clusters', 'visibility', 'none');
    map.setLayoutProperty('cluster-count', 'visibility', 'none');
  }
}

interface MapViewProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo) => void;
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
  const [hoveredPhoto, setHoveredPhoto] = useState<Photo | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [hoverThumbnailUrl, setHoverThumbnailUrl] = useState<string | null>(null);
  const [loadingHoverThumbnail, setLoadingHoverThumbnail] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
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
    map.current.on('mouseleave', 'unclustered-point', () => {
      if (map.current) map.current.getCanvas().style.cursor = '';
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
        cluster: true,
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

      // If cluster settings changed, we need to recreate the source
      // Check if we need to update cluster settings by removing and re-adding
      const currentSource = map.current.getSource('photos') as any;
      if (
        currentSource._data &&
        (currentSource._options.clusterRadius !== clusterRadius ||
          currentSource._options.clusterMaxZoom !== clusterMaxZoom)
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
          cluster: true,
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
      {/* Hover Tooltip */}
      {hoveredPhoto && hoverPosition && (
        <div
          style={{
            position: 'fixed',
            left: hoverPosition.x + 15,
            top: hoverPosition.y + 15,
            backgroundColor:
              theme === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            color: theme === 'dark' ? '#ffffff' : '#000000',
            border: `1px solid ${theme === 'dark' ? '#444' : '#ccc'}`,
            borderRadius: '4px',
            padding: '0.5rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            pointerEvents: 'none',
            zIndex: 999,
            maxWidth: '180px',
          }}
        >
          {loadingHoverThumbnail && (
            <div
              style={{
                width: '150px',
                height: '150px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme === 'dark' ? '#222' : '#f0f0f0',
                borderRadius: '4px',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: theme === 'dark' ? '#888' : '#666' }}>
                Loading...
              </span>
            </div>
          )}
          {!loadingHoverThumbnail && hoverThumbnailUrl && (
            <img
              src={hoverThumbnailUrl}
              alt="Preview"
              style={{
                width: '150px',
                height: '150px',
                objectFit: 'cover',
                borderRadius: '4px',
                display: 'block',
              }}
            />
          )}
          {!loadingHoverThumbnail && !hoverThumbnailUrl && (
            <div
              style={{
                width: '150px',
                height: '150px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme === 'dark' ? '#222' : '#f0f0f0',
                borderRadius: '4px',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: theme === 'dark' ? '#888' : '#666' }}>
                No preview
              </span>
            </div>
          )}
          <div style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
            <div
              style={{
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {hoveredPhoto.path.split(/[\\/]/).pop()}
            </div>
            {hoveredPhoto.timestamp && (
              <div style={{ color: theme === 'dark' ? '#aaa' : '#666', marginTop: '0.25rem' }}>
                {new Date(hoveredPhoto.timestamp * 1000).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
