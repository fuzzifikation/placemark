/**
 * useThemeColors - Centralized hook for accessing theme colors
 * Eliminates duplicate getThemeColors imports across 19+ components
 */

import { getThemeColors } from '../theme';
import { useTheme } from './useTheme';

export function useThemeColors() {
  const { theme } = useTheme();
  return getThemeColors(theme);
}
