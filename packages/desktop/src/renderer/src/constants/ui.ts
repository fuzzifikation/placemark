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

  /** LibraryStatsPanel fixed width. */
  STATS_PANEL_WIDTH: '320px',
  STATS_PANEL_WIDTH_PX: 320,
} as const;

export const SHADOWS = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
  lg: '0 10px 15px -3px rgba(0,0,0,0.5)',
  mapControl: '0 2px 8px rgba(0,0,0,0.15)',
} as const;

export const ICON_SIZE = {
  XS: 12,
  SM: 16,
  MD: 20,
  LG: 24,
  XL: 32,
} as const;

/**
 * Returns a consistent glass-panel style object for use in inline styles.
 * Centralises the glassmorphism effect shared across all floating panels.
 */
import type { ThemeColors } from '../theme';
import type { CSSProperties } from 'react';

export function getGlassStyle(
  colors: ThemeColors,
  glassBlur: number,
  glassSurfaceOpacity: number,
  borderRadius: string = BORDER_RADIUS.XL
): CSSProperties {
  const isDark = !colors.glassSurface.includes('255, 255, 255');
  return {
    backgroundColor: `rgba(${isDark ? '30, 41, 59' : '255, 255, 255'}, ${glassSurfaceOpacity / 100})`,
    backdropFilter: `blur(${glassBlur}px)`,
    WebkitBackdropFilter: `blur(${glassBlur}px)`,
    border: `1px solid ${colors.glassBorder}`,
    borderRadius,
    boxShadow: colors.shadow,
  };
}
