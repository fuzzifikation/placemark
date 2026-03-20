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
  SCAN_OVERLAY: 40,
  MODAL: 50,
  PHOTO_PREVIEW: 1000,
} as const;

export const TRANSITIONS = {
  FAST: '0.2s ease',
  MEDIUM: '0.3s ease',
  SLOW: '0.5s ease',
} as const;

/**
 * Layout constants — single source of truth for all floating panel placement.
 * CSS string values are used in inline styles; _PX counterparts feed numeric
 * calculations (e.g. MapView fitPadding).
 */
export const LAYOUT = {
  /** Distance from every viewport edge to the nearest panel edge. */
  PANEL_INSET: '1rem',
  PANEL_INSET_PX: 16,

  /** Vertical gap between stacked panels (header → placemarks, placemarks → timeline). */
  PANEL_GAP: '1rem',
  PANEL_GAP_PX: 16,

  /** FloatingHeader rendered height (padding + content). */
  HEADER_HEIGHT: '3.5rem',
  HEADER_HEIGHT_PX: 56,

  /** Timeline panel rendered height. */
  TIMELINE_HEIGHT: '8.5rem',
  TIMELINE_HEIGHT_PX: 136,

  /** PlacemarksPanel fixed width. */
  PLACEMARKS_WIDTH: '260px',
} as const;
