/**
 * Map styling constants for clusters, heatmap, and unclustered points
 */

export const CLUSTER_THRESHOLDS = {
  SMALL: 100, // < 100 points
  MEDIUM: 750, // 100-750 points
  // > 750 points (large)
} as const;

export const CLUSTER_COLORS = {
  SMALL: '#51bbd6', // Blue
  MEDIUM: '#f1f075', // Yellow
  LARGE: '#f28cb1', // Pink
} as const;

export const CLUSTER_RADII = {
  SMALL: 20,
  MEDIUM: 30,
  LARGE: 40,
} as const;

export const UNCLUSTERED_STYLE = {
  COLOR: '#0066cc',
  RADIUS: 6,
  STROKE_WIDTH: 2,
  STROKE_COLOR: '#fff',
} as const;

export const HEATMAP_CONFIG = {
  MAX_ZOOM: 22,
  COLORS: {
    TRANSPARENT: 'rgba(0,0,255,0)',
    BLUE: 'rgb(65,105,225)',
    SKY_BLUE: 'rgb(0,191,255)',
    YELLOW: 'rgb(255,255,0)',
    ORANGE: 'rgb(255,140,0)',
    RED: 'rgb(220,20,60)',
  },
  OPACITY: 0.8,
} as const;
