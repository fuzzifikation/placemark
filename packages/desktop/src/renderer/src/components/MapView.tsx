/**
 * MapView component - displays photos on an interactive map with clustering
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Photo } from '@placemark/core';
import type * as GeoJSON from 'geojson';

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

// Helper function to add cluster layers to map
function addClusterLayers(map: maplibregl.Map) {
  // Layer for cluster circles
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
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [onPhotoClick]);

  // Update photo data source when photos change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const photosWithLocation = photos.filter((photo) => photo.latitude && photo.longitude);

    if (photosWithLocation.length === 0) {
      // Remove source if no photos
      if (map.current.getSource('photos')) {
        if (map.current.getLayer('clusters')) map.current.removeLayer('clusters');
        if (map.current.getLayer('cluster-count')) map.current.removeLayer('cluster-count');
        if (map.current.getLayer('unclustered-point')) map.current.removeLayer('unclustered-point');
        map.current.removeSource('photos');
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
      // Add source with clustering enabled
      map.current.addSource('photos', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: clusterMaxZoom,
        clusterRadius: clusterRadius,
      });

      // Add all cluster layers
      addClusterLayers(map.current);
    } else {
      // Update existing source data
      const source = map.current.getSource('photos') as maplibregl.GeoJSONSource;
      source.setData(geojson);

      // If cluster settings changed, we need to recreate the source
      // Check if we need to update cluster settings by removing and re-adding
      const currentSource = map.current.getSource('photos') as any;
      if (
        currentSource._data &&
        (currentSource._options.clusterRadius !== clusterRadius ||
          currentSource._options.clusterMaxZoom !== clusterMaxZoom)
      ) {
        // Remove layers
        if (map.current.getLayer('clusters')) map.current.removeLayer('clusters');
        if (map.current.getLayer('cluster-count')) map.current.removeLayer('cluster-count');
        if (map.current.getLayer('unclustered-point')) map.current.removeLayer('unclustered-point');
        // Remove source
        map.current.removeSource('photos');

        // Re-add with new settings
        map.current.addSource('photos', {
          type: 'geojson',
          data: geojson,
          cluster: true,
          clusterMaxZoom: clusterMaxZoom,
          clusterRadius: clusterRadius,
        });

        // Re-add all cluster layers
        addClusterLayers(map.current);
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
  ]);

  return (
    <div
      ref={mapContainer}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    />
  );
}
