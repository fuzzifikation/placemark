/**
 * useThemeColors - Centralized hook for accessing theme colors
 * Eliminates duplicate getThemeColors imports across 19+ components
 * Can accept optional theme parameter for components that receive theme as prop
 */

import { type Theme, getThemeColors } from '../theme';
import { useTheme } from './useTheme';

export function useThemeColors(themeOverride?: Theme) {
  const { theme } = useTheme();
  return getThemeColors(themeOverride ?? theme);
}
