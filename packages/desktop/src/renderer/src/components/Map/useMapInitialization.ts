/**
 * useMapInitialization - Handles initial map setup and lifecycle
 * Extracted from MapView.tsx to improve maintainability
 *
 * Handles:
 * - Map instance creation
 * - Tile source configuration
 * - Navigation controls
 * - Load event and initial state
 * - Cleanup on unmount
 */

import { useEffect, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import maplibregl from 'maplibre-gl';
import type { Theme } from '../../theme';

interface UseMapInitializationProps {
  mapContainer: MutableRefObject<HTMLDivElement | null>;
  mapRef: MutableRefObject<maplibregl.Map | null>;
  theme: Theme;
  tileMaxZoom: number;
  setMapLoaded: Dispatch<SetStateAction<boolean>>;
  setCurrentZoom: Dispatch<SetStateAction<number>>;
  onViewChange?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  cleanupHover: () => void;
}

export function useMapInitialization({
  mapContainer,
  mapRef,
  theme,
  tileMaxZoom,
  setMapLoaded,
  setCurrentZoom,
  onViewChange,
  cleanupHover,
}: UseMapInitializationProps) {
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

    // Set up load event
    mapRef.current.on('load', () => {
      setMapLoaded(true);
      if (mapRef.current) {
        setCurrentZoom(mapRef.current.getZoom());

        // Initial bounds report
        const bounds = mapRef.current.getBounds();
        if (onViewChange) {
          onViewChange({
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
          });
        }
      }
    });

    return () => {
      // Cleanup hover state and thumbnail cache
      cleanupHover();

      mapRef.current?.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
  }, [
    theme,
    mapContainer,
    mapRef,
    tileMaxZoom,
    setMapLoaded,
    setCurrentZoom,
    onViewChange,
    cleanupHover,
  ]);
}
