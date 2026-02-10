/**
 * Map layer utilities for adding heatmap and cluster layers
 */

import maplibregl from 'maplibre-gl';
import {
  CLUSTER_THRESHOLDS,
  CLUSTER_COLORS,
  CLUSTER_RADII,
  UNCLUSTERED_STYLE,
  SELECTED_STYLE,
  HEATMAP_CONFIG,
} from './mapStyles';

/**
 * Add heatmap layer to map
 */
export function addHeatmapLayer(map: maplibregl.Map) {
  map.addLayer({
    id: 'photos-heatmap',
    type: 'heatmap',
    source: 'photos-heatmap-source',
    maxzoom: HEATMAP_CONFIG.MAX_ZOOM,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['zoom'], 0, 1, HEATMAP_CONFIG.MAX_ZOOM, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, HEATMAP_CONFIG.MAX_ZOOM, 5],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0,
        HEATMAP_CONFIG.COLORS.TRANSPARENT,
        0.2,
        HEATMAP_CONFIG.COLORS.BLUE,
        0.4,
        HEATMAP_CONFIG.COLORS.SKY_BLUE,
        0.6,
        HEATMAP_CONFIG.COLORS.YELLOW,
        0.8,
        HEATMAP_CONFIG.COLORS.ORANGE,
        1,
        HEATMAP_CONFIG.COLORS.RED,
      ],
      'heatmap-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        0,
        3,
        9,
        25,
        HEATMAP_CONFIG.MAX_ZOOM,
        50,
      ],
      'heatmap-opacity': HEATMAP_CONFIG.OPACITY,
    },
  });
}

/**
 * Add cluster layers to map (circles, labels, unclustered points)
 */
export function addClusterLayers(
  map: maplibregl.Map,
  showHeatmap: boolean = false,
  clusterOpacity: number = 0.85,
  unclusteredPointOpacity: number = 0.9
) {
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
      'circle-opacity': clusterOpacity,
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
      'circle-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          SELECTED_STYLE.HOVER_COLOR,
          SELECTED_STYLE.COLOR,
        ],
        [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          UNCLUSTERED_STYLE.HOVER_COLOR,
          UNCLUSTERED_STYLE.COLOR,
        ],
      ],
      'circle-radius': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          SELECTED_STYLE.HOVER_RADIUS,
          SELECTED_STYLE.RADIUS,
        ],
        [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          UNCLUSTERED_STYLE.HOVER_RADIUS,
          UNCLUSTERED_STYLE.RADIUS,
        ],
      ],
      'circle-stroke-width': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          SELECTED_STYLE.HOVER_STROKE_WIDTH,
          SELECTED_STYLE.STROKE_WIDTH,
        ],
        [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          UNCLUSTERED_STYLE.HOVER_STROKE_WIDTH,
          UNCLUSTERED_STYLE.STROKE_WIDTH,
        ],
      ],
      'circle-stroke-color': [
        'case',
        ['boolean', ['feature-state', 'selected'], false],
        SELECTED_STYLE.STROKE_COLOR,
        UNCLUSTERED_STYLE.STROKE_COLOR,
      ],
      'circle-opacity': unclusteredPointOpacity,
    },
  });

  // Hide cluster layers if heatmap is active
  if (showHeatmap) {
    map.setLayoutProperty('clusters', 'visibility', 'none');
    map.setLayoutProperty('cluster-count', 'visibility', 'none');
  }
}
