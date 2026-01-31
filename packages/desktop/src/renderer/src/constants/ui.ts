/**
 * UI Constants - centralized values for consistent styling
 */

export const SPACING = {
  XS: '0.25rem',
  SM: '0.5rem',
  MD: '0.75rem',
  LG: '1rem',
  XL: '1.5rem',
  XXL: '2rem',
} as const;

export const BORDER_RADIUS = {
  SM: '4px',
  MD: '8px',
  LG: '10px',
  XL: '16px',
  FULL: '50%',
} as const;

export const FONT_SIZE = {
  XS: '0.75rem',
  SM: '0.875rem',
  MD: '1rem',
  LG: '1.25rem',
  XL: '1.5rem',
} as const;

export const FONT_WEIGHT = {
  NORMAL: 500,
  MEDIUM: 600,
  BOLD: 700,
} as const;

export const FONT_FAMILY = 'system-ui, -apple-system, sans-serif';

export const Z_INDEX = {
  MAP: 0,
  HEADER: 10,
  TIMELINE: 10,
  MODAL: 50,
  PHOTO_PREVIEW: 1000,
} as const;

export const MAP_CONSTANTS = {
  DEFAULT_ZOOM: 15,
  MIN_ZOOM: 2,
  MAX_ZOOM: 20,
  DEFAULT_CLUSTER_RADIUS: 30,
  DEFAULT_CLUSTER_MAX_ZOOM: 14,
  DEFAULT_TRANSITION_DURATION: 200,
  DEFAULT_PADDING: 50,
} as const;

export const TIMELINE_CONSTANTS = {
  DEFAULT_UPDATE_INTERVAL: 100, // milliseconds
  MIN_PLAY_SPEED: 1,
  MAX_PLAY_SPEED: 8,
  DEFAULT_PLAY_SPEED: 1,
} as const;

export const THUMBNAIL_CONSTANTS = {
  SIZE: 400, // pixels (single size for all contexts)
  QUALITY: 80, // JPEG quality
  DEFAULT_MAX_CACHE_MB: 500,
  CACHE_MEMORY_LIMIT: 50, // max thumbnails in memory
} as const;

export const FILE_CONSTANTS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
} as const;

export const TRANSITIONS = {
  FAST: '0.2s ease',
  MEDIUM: '0.3s ease',
  SLOW: '0.5s ease',
} as const;

export const GLASS_EFFECT = {
  BACKDROP_FILTER: 'blur(12px)',
  WEBKIT_BACKDROP_FILTER: 'blur(12px)',
} as const;
