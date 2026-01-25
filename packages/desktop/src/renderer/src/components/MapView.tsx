/**
 * MapView component - displays photos on an interactive map
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Photo } from '@placemark/core';

interface MapViewProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
}

export function MapView({ photos, onPhotoClick }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
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

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers when photos change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markers.current.forEach((marker: maplibregl.Marker) => marker.remove());
    markers.current = [];

    // Add new markers
    const photosWithLocation = photos.filter((photo) => photo.latitude && photo.longitude);

    if (photosWithLocation.length === 0) return;

    photosWithLocation.forEach((photo) => {
      const marker = new maplibregl.Marker({ color: '#0066cc' })
        .setLngLat([photo.longitude!, photo.latitude!])
        .addTo(map.current!);

      if (onPhotoClick) {
        marker.getElement().addEventListener('click', () => {
          onPhotoClick(photo);
        });
      }

      markers.current.push(marker);
    });

    // Fit map to show all markers
    if (photosWithLocation.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      photosWithLocation.forEach((photo) => {
        bounds.extend([photo.longitude!, photo.latitude!]);
      });
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [photos, mapLoaded, onPhotoClick]);

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
