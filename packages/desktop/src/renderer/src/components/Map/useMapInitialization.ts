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

function getTileConfig(theme: Theme) {
  const isDark = theme === 'dark';
  return {
    tiles: isDark
      ? [
          'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        ]
      : ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: isDark
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  };
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
  // Create the map once. Theme and tileMaxZoom are intentionally excluded from
  // deps — they are managed by separate effects below to avoid destroying and
  // recreating the map (which would reset position, selection, and all layers).
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    setMapLoaded(false);

    const { tiles, attribution } = getTileConfig(theme);

    mapRef.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles,
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
      maxZoom: tileMaxZoom,
    });

    mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

    mapRef.current.on('load', () => {
      setMapLoaded(true);
      if (mapRef.current) {
        setCurrentZoom(mapRef.current.getZoom());

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
      cleanupHover();
      mapRef.current?.remove();
      mapRef.current = null;
      setMapLoaded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapContainer]);

  // Update tile source in-place when theme changes — no map recreation needed.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const { tiles } = getTileConfig(theme);
    const source = map.getSource('osm-tiles') as maplibregl.RasterTileSource | undefined;
    source?.setTiles(tiles);
  }, [theme, mapRef]);

  // Update max zoom in-place when the setting changes.
  useEffect(() => {
    mapRef.current?.setMaxZoom(tileMaxZoom);
  }, [tileMaxZoom, mapRef]);
}
